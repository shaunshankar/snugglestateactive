import { getDb } from './_db.js';
import { requireAuth } from './_auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = requireAuth(req, res);
  if (!auth) return;

  const sql = getDb();

  if (req.method === 'GET') {
    const { type, month } = req.query;

    if (type === 'monthly') {
      const goals = month
        ? await sql`SELECT * FROM monthly_goals WHERE user_id = ${auth.id} AND month = ${month}`
        : await sql`SELECT * FROM monthly_goals WHERE user_id = ${auth.id} ORDER BY month DESC`;
      return res.json(goals);
    }

    const today = new Date().toISOString().split('T')[0];
    const [daily] = await sql`
      SELECT * FROM daily_goals WHERE user_id = ${auth.id} AND date = ${today}
    `;

    const [streak] = await sql`
      SELECT COALESCE(MAX(streak_count), 0) as current_streak
      FROM daily_goals WHERE user_id = ${auth.id} AND goals_met = true
      AND date = (SELECT MAX(date) FROM daily_goals WHERE user_id = ${auth.id} AND goals_met = true)
    `;

    return res.json({ daily: daily || null, streak: streak?.current_streak || 0 });
  }

  if (req.method === 'POST') {
    const { type } = req.query;

    if (type === 'monthly') {
      const { month, weight_loss_target, reward_amount, starting_weight } = req.body;
      if (!month || !weight_loss_target) return res.status(400).json({ error: 'Month and target required' });
      const [goal] = await sql`
        INSERT INTO monthly_goals (user_id, month, weight_loss_target, reward_amount, starting_weight)
        VALUES (${auth.id}, ${month}, ${weight_loss_target}, ${reward_amount || null}, ${starting_weight || null})
        ON CONFLICT (user_id, month) DO UPDATE SET
          weight_loss_target = EXCLUDED.weight_loss_target,
          reward_amount = EXCLUDED.reward_amount,
          starting_weight = EXCLUDED.starting_weight
        RETURNING *
      `;
      return res.status(201).json(goal);
    }

    const { calorie_goal, water_goal, weight_target, goals_met, streak_count } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const [goal] = await sql`
      INSERT INTO daily_goals (user_id, date, calorie_goal, water_goal, weight_target, goals_met, streak_count)
      VALUES (${auth.id}, ${today}, ${calorie_goal || null}, ${water_goal || null}, ${weight_target || null}, ${goals_met || false}, ${streak_count || 0})
      ON CONFLICT (user_id, date) DO UPDATE SET
        calorie_goal = COALESCE(EXCLUDED.calorie_goal, daily_goals.calorie_goal),
        water_goal = COALESCE(EXCLUDED.water_goal, daily_goals.water_goal),
        weight_target = COALESCE(EXCLUDED.weight_target, daily_goals.weight_target),
        goals_met = COALESCE(EXCLUDED.goals_met, daily_goals.goals_met),
        streak_count = COALESCE(EXCLUDED.streak_count, daily_goals.streak_count)
      RETURNING *
    `;
    return res.status(201).json(goal);
  }

  if (req.method === 'PATCH') {
    const { type, id } = req.query;
    if (type === 'monthly' && id) {
      const { achieved, reward_claimed } = req.body;
      const [goal] = await sql`
        UPDATE monthly_goals SET
          achieved = COALESCE(${achieved ?? null}, achieved),
          reward_claimed = COALESCE(${reward_claimed ?? null}, reward_claimed)
        WHERE id = ${id} AND user_id = ${auth.id}
        RETURNING *
      `;
      return res.json(goal);
    }
    return res.status(400).json({ error: 'Invalid request' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
