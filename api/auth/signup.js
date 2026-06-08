import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../_db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const sql = getDb();
  const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`;
  if (existing.length > 0) return res.status(409).json({ error: 'Email already registered' });

  const password_hash = await bcrypt.hash(password, 10);
  const [user] = await sql`
    INSERT INTO users (name, email, password_hash)
    VALUES (${name.trim()}, ${email.toLowerCase()}, ${password_hash})
    RETURNING id, name, email, unit, water_unit, daily_calorie_goal, daily_water_goal, weight_target, household_id
  `;

  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });
  return res.status(201).json({ token, user });
}
