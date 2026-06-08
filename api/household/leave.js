import { getDb } from '../_db.js';
import { requireAuth } from '../_auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  const auth = requireAuth(req, res);
  if (!auth) return;

  const sql = getDb();

  const [user] = await sql`SELECT household_id FROM users WHERE id = ${auth.id}`;
  if (!user?.household_id) return res.status(400).json({ error: 'Not in a household' });

  const householdId = user.household_id;

  await sql`DELETE FROM household_members WHERE user_id = ${auth.id} AND household_id = ${householdId}`;
  await sql`UPDATE users SET household_id = NULL WHERE id = ${auth.id}`;

  const [remaining] = await sql`SELECT COUNT(*) as count FROM household_members WHERE household_id = ${householdId}`;
  if (parseInt(remaining.count) === 0) {
    await sql`DELETE FROM households WHERE id = ${householdId}`;
  }

  return res.json({ success: true });
}
