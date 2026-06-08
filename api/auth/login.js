import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../_db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const sql = getDb();
  const [user] = await sql`
    SELECT id, name, email, password_hash, unit, water_unit, daily_calorie_goal, daily_water_goal, weight_target, household_id
    FROM users WHERE email = ${email.toLowerCase()}
  `;
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  const { password_hash, ...safeUser } = user;
  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });
  return res.status(200).json({ token, user: safeUser });
}
