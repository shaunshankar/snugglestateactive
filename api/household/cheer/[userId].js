import { getDb } from '../../_db.js';
import { requireAuth } from '../../_auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = requireAuth(req, res);
  if (!auth) return;

  const targetId = req.query.userId;
  if (!targetId) return res.status(400).json({ error: 'User ID required' });

  const sql = getDb();

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
