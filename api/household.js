import { getDb } from './_db.js';
import { requireAuth } from './_auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = requireAuth(req, res);
  if (!auth) return;

  const sql = getDb();
  const path = req.url.split('?')[0];

  // GET /api/household
  if (req.method === 'GET' && !path.includes('/member/') && !path.includes('/join') && !path.includes('/leave') && !path.includes('/cheer')) {
    const [user] = await sql`SELECT household_id FROM users WHERE id = ${auth.id}`;
    if (!user?.household_id) return res.json(null);

    const [household] = await sql`SELECT * FROM households WHERE id = ${user.household_id}`;
    if (!household) return res.json(null);

    const members = await sql`
      SELECT u.id, u.name, u.email, hm.role, hm.joined_at,
        (SELECT weight FROM weight_entries WHERE user_id = u.id ORDER BY date DESC, created_at DESC LIMIT 1) as current_weight,
        (SELECT weight FROM weight_entries WHERE user_id = u.id ORDER BY date ASC, created_at ASC LIMIT 1) as starting_weight,
        (SELECT unit FROM weight_entries WHERE user_id = u.id ORDER BY date DESC LIMIT 1) as weight_unit,
        (SELECT COALESCE(MAX(streak_count), 0) FROM daily_goals WHERE user_id = u.id AND goals_met = true) as streak,
        (SELECT mg.weight_loss_target FROM monthly_goals mg WHERE user_id = u.id ORDER BY month DESC LIMIT 1) as monthly_target,
        (SELECT mg.achieved FROM monthly_goals mg WHERE user_id = u.id ORDER BY month DESC LIMIT 1) as monthly_achieved
      FROM household_members hm
      JOIN users u ON u.id = hm.user_id
      WHERE hm.household_id = ${user.household_id}
      ORDER BY hm.joined_at ASC
    `;

    return res.json({ ...household, members });
  }

  // POST /api/household — create
  if (req.method === 'POST' && !path.includes('/join') && !path.includes('/leave') && !path.includes('/cheer')) {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Household name required' });

    const [existing] = await sql`SELECT household_id FROM users WHERE id = ${auth.id}`;
    if (existing?.household_id) return res.status(409).json({ error: 'Already in a household' });

    const [household] = await sql`
      INSERT INTO households (name, created_by) VALUES (${name}, ${auth.id}) RETURNING *
    `;
    await sql`
      INSERT INTO household_members (household_id, user_id, role) VALUES (${household.id}, ${auth.id}, 'owner')
    `;
    await sql`UPDATE users SET household_id = ${household.id} WHERE id = ${auth.id}`;

    return res.status(201).json(household);
  }

  // POST /api/household/join
  if (req.method === 'POST' && path.endsWith('/join')) {
    const { invite_code } = req.body;
    if (!invite_code) return res.status(400).json({ error: 'Invite code required' });

    const [household] = await sql`SELECT * FROM households WHERE invite_code = ${invite_code}`;
    if (!household) return res.status(404).json({ error: 'Invalid invite code' });

    const [existing] = await sql`SELECT household_id FROM users WHERE id = ${auth.id}`;
    if (existing?.household_id) return res.status(409).json({ error: 'Already in a household. Leave first.' });

    await sql`
      INSERT INTO household_members (household_id, user_id, role)
      VALUES (${household.id}, ${auth.id}, 'member')
      ON CONFLICT (household_id, user_id) DO NOTHING
    `;
    await sql`UPDATE users SET household_id = ${household.id} WHERE id = ${auth.id}`;

    return res.json({ success: true, household });
  }

  // DELETE /api/household/leave
  if (req.method === 'DELETE' && path.endsWith('/leave')) {
    const [user] = await sql`SELECT household_id FROM users WHERE id = ${auth.id}`;
    if (!user?.household_id) return res.status(400).json({ error: 'Not in a household' });

    await sql`DELETE FROM household_members WHERE user_id = ${auth.id} AND household_id = ${user.household_id}`;
    await sql`UPDATE users SET household_id = NULL WHERE id = ${auth.id}`;

    const [remaining] = await sql`SELECT COUNT(*) as count FROM household_members WHERE household_id = ${user.household_id}`;
    if (parseInt(remaining.count) === 0) {
      await sql`DELETE FROM households WHERE id = ${user.household_id}`;
    }

    return res.json({ success: true });
  }

  // GET /api/household/member/:userId
  const memberMatch = path.match(/\/member\/([a-f0-9-]+)/);
  if (req.method === 'GET' && memberMatch) {
    const targetId = memberMatch[1];

    const [requester] = await sql`SELECT household_id FROM users WHERE id = ${auth.id}`;
    const [target] = await sql`SELECT household_id FROM users WHERE id = ${targetId}`;

    if (!requester?.household_id || requester.household_id !== target?.household_id) {
      return res.status(403).json({ error: 'Not in the same household' });
    }

    const today = new Date().toISOString().split('T')[0];
    const [user] = await sql`SELECT id, name, email FROM users WHERE id = ${targetId}`;
    const weights = await sql`SELECT weight, unit, date FROM weight_entries WHERE user_id = ${targetId} ORDER BY date ASC`;
    const [todayFood] = await sql`
      SELECT COALESCE(SUM(calories), 0) as total_calories FROM food_entries WHERE user_id = ${targetId} AND date = ${today}
    `;
    const [todayWater] = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_water FROM water_entries WHERE user_id = ${targetId} AND date = ${today}
    `;
    const [streak] = await sql`
      SELECT COALESCE(MAX(streak_count), 0) as streak FROM daily_goals WHERE user_id = ${targetId} AND goals_met = true
    `;
    const monthlyGoals = await sql`SELECT * FROM monthly_goals WHERE user_id = ${targetId} ORDER BY month DESC LIMIT 3`;

    return res.json({ user, weights, todayFood, todayWater, streak, monthlyGoals });
  }

  // POST /api/household/cheer/:userId
  const cheerMatch = path.match(/\/cheer\/([a-f0-9-]+)/);
  if (req.method === 'POST' && cheerMatch) {
    const targetId = cheerMatch[1];

    const [requester] = await sql`SELECT household_id, name FROM users WHERE id = ${auth.id}`;
    const [target] = await sql`SELECT household_id FROM users WHERE id = ${targetId}`;

    if (!requester?.household_id || requester.household_id !== target?.household_id) {
      return res.status(403).json({ error: 'Not in the same household' });
    }

    await sql`
      INSERT INTO notifications (user_id, from_user_id, type, message)
      VALUES (${targetId}, ${auth.id}, 'cheer', ${`${requester.name} cheered you on! 👏`})
    `;

    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
