import { getDb } from './_db.js';
import { requireAuth } from './_auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = requireAuth(req, res);
  if (!auth) return;

  const sql = getDb();

  if (req.method === 'GET') {
    const [user] = await sql`
      SELECT id, name, email, unit, water_unit, daily_calorie_goal, daily_water_goal, weight_target, household_id, created_at
      FROM users WHERE id = ${auth.id}
    `;
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  }

  if (req.method === 'PATCH') {
    const { name, unit, water_unit, daily_calorie_goal, daily_water_goal, weight_target } = req.body;
    const [updated] = await sql`
      UPDATE users SET
        name = COALESCE(${name ?? null}, name),
        unit = COALESCE(${unit ?? null}, unit),
        water_unit = COALESCE(${water_unit ?? null}, water_unit),
        daily_calorie_goal = COALESCE(${daily_calorie_goal ?? null}, daily_calorie_goal),
        daily_water_goal = COALESCE(${daily_water_goal ?? null}, daily_water_goal),
        weight_target = COALESCE(${weight_target ?? null}, weight_target)
      WHERE id = ${auth.id}
      RETURNING id, name, email, unit, water_unit, daily_calorie_goal, daily_water_goal, weight_target, household_id
    `;
    return res.json(updated);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
