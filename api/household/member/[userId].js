import { getDb } from '../../_db.js';
import { requireAuth } from '../../_auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const auth = requireAuth(req, res);
  if (!auth) return;

  const targetId = req.query.userId;
  if (!targetId) return res.status(400).json({ error: 'User ID required' });

  const sql = getDb();

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
