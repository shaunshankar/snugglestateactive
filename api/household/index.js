import { getDb } from '../_db.js';
import { requireAuth } from '../_auth.js';

// GET  /api/household   — fetch household + members
// POST /api/household   — create household
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = requireAuth(req, res);
  if (!auth) return;

  const sql = getDb();

  if (req.method === 'GET') {
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

  if (req.method === 'POST') {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Household name required' });

    const [existing] = await sql`SELECT household_id FROM users WHERE id = ${auth.id}`;
    if (existing?.household_id) return res.status(409).json({ error: 'Already in a household' });

    const [household] = await sql`INSERT INTO households (name, created_by) VALUES (${name}, ${auth.id}) RETURNING *`;
    await sql`INSERT INTO household_members (household_id, user_id, role) VALUES (${household.id}, ${auth.id}, 'owner')`;
    await sql`UPDATE users SET household_id = ${household.id} WHERE id = ${auth.id}`;

    return res.status(201).json(household);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
