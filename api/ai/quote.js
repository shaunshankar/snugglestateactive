import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '../_auth.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = requireAuth(req, res);
  if (!auth) return;

  const { streak, monthlyPercent } = req.body;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 150,
    messages: [{
      role: 'user',
      content: `Generate a short, warm, motivational quote (max 2 sentences) for someone who has hit their health goals for ${streak || 1} consecutive days and is ${monthlyPercent || 0}% toward their monthly weight loss target. Return ONLY the quote text, no quotation marks, no attribution.`,
    }],
  });

  return res.json({ quote: message.content[0].text.trim() });
}
