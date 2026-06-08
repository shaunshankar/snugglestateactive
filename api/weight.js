import { getDb } from './_db.js';
import { requireAuth } from './_auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = requireAuth(req, res);
  if (!auth) return;

  const sql = getDb();

  if (req.method === 'GET') {
    const entries = await sql`
      SELECT id, weight, unit, date, notes, created_at
      FROM weight_entries
      WHERE user_id = ${auth.id}
      ORDER BY date DESC, created_at DESC
    `;
    return res.json(entries);
  }

  if (req.method === 'POST') {
    const { weight, unit, date, notes } = req.body;
    if (!weight || !unit) return res.status(400).json({ error: 'Weight and unit required' });
    const [entry] = await sql`
      INSERT INTO weight_entries (user_id, weight, unit, date, notes)
      VALUES (${auth.id}, ${weight}, ${unit}, ${date || new Date().toISOString().split('T')[0]}, ${notes || null})
      RETURNING id, weight, unit, date, notes, created_at
    `;
    return res.status(201).json(entry);
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Entry ID required' });
    await sql`DELETE FROM weight_entries WHERE id = ${id} AND user_id = ${auth.id}`;
    return res.json({ success: true });
  }

  if (req.method === 'PATCH') {
    const { id } = req.query;
    const { weight, unit, date, notes } = req.body;
    if (!id) return res.status(400).json({ error: 'Entry ID required' });
    const [entry] = await sql`
      UPDATE weight_entries SET
        weight = COALESCE(${weight ?? null}, weight),
        unit = COALESCE(${unit ?? null}, unit),
        date = COALESCE(${date ?? null}, date),
        notes = COALESCE(${notes ?? null}, notes)
      WHERE id = ${id} AND user_id = ${auth.id}
      RETURNING id, weight, unit, date, notes, created_at
    `;
    return res.json(entry);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
