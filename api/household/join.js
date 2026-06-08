import { getDb } from '../_db.js';
import { requireAuth } from '../_auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = requireAuth(req, res);
  if (!auth) return;

  const { invite_code } = req.body;
  if (!invite_code) return res.status(400).json({ error: 'Invite code required' });

  const sql = getDb();

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
