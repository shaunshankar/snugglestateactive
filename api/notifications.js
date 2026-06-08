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
    const notifications = await sql`
      SELECT n.*, u.name as from_name
      FROM notifications n
      LEFT JOIN users u ON u.id = n.from_user_id
      WHERE n.user_id = ${auth.id}
      ORDER BY n.created_at DESC
      LIMIT 50
    `;
    return res.json(notifications);
  }

  if (req.method === 'PATCH') {
    await sql`UPDATE notifications SET is_read = true WHERE user_id = ${auth.id}`;
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
