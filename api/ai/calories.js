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

  const { description, image } = req.body;
  if (!description && !image) return res.status(400).json({ error: 'Food description or image required' });

  // Build message content — text-only or image + text
  let content;
  if (image) {
    const prompt = description
      ? `Identify the food shown in this image and estimate its nutritional content. Additional context: "${description}". Return ONLY a JSON object with no markdown: { "food_name": string, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number }`
      : `Identify all the food and drinks visible in this image and estimate the total nutritional content for the entire meal/plate shown. Return ONLY a JSON object with no markdown: { "food_name": string, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number }`;

    content = [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: image.media_type || 'image/jpeg',
          data: image.data,
        },
      },
      { type: 'text', text: prompt },
    ];
  } else {
    content = `Estimate the nutritional content of: ${description}. Return ONLY a JSON object with no markdown, no code blocks, just raw JSON: { "food_name": string, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number }`;
  }

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content }],
  });

  const text = message.content[0].text.trim();
  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const nutrition = JSON.parse(cleaned);
    return res.json(nutrition);
  } catch {
    const match = text.match(/\{[\s\S]*?\}/);
    if (match) {
      try {
        return res.json(JSON.parse(match[0]));
      } catch {
        // fall through
      }
    }
    return res.status(500).json({ error: 'Could not parse nutrition data', raw: text });
  }
}
