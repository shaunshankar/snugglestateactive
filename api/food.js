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

  if (req.method === 'GET') {
    const { date } = req.query;
    const entries = date
      ? await sql`SELECT * FROM food_entries WHERE user_id = ${auth.id} AND date = ${date} ORDER BY created_at ASC`
      : await sql`SELECT * FROM food_entries WHERE user_id = ${auth.id} ORDER BY date DESC, created_at DESC LIMIT 100`;
    return res.json(entries);
  }

  if (req.method === 'POST') {
    const { description, calories, protein_g, carbs_g, fat_g, is_manual, date } = req.body;
    if (!description) return res.status(400).json({ error: 'Description required' });
    const [entry] = await sql`
      INSERT INTO food_entries (user_id, description, calories, protein_g, carbs_g, fat_g, is_manual, date)
      VALUES (
        ${auth.id}, ${description}, ${calories || null}, ${protein_g || null},
        ${carbs_g || null}, ${fat_g || null}, ${is_manual || false},
        ${date || new Date().toISOString().split('T')[0]}
      )
      RETURNING *
    `;
    return res.status(201).json(entry);
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Entry ID required' });
    await sql`DELETE FROM food_entries WHERE id = ${id} AND user_id = ${auth.id}`;
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
