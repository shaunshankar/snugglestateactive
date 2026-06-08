import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from './_auth.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /api/ai?action=calories
// POST /api/ai?action=quote
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = requireAuth(req, res);
  if (!auth) return;

  const action = req.query.action;

  if (action === 'calories') {
    const { description, image } = req.body;
    if (!description && !image) return res.status(400).json({ error: 'Food description or image required' });

    let content;
    if (image) {
      const prompt = description
        ? `Identify the food shown in this image and estimate its nutritional content. Additional context: "${description}". Return ONLY a JSON object with no markdown: { "food_name": string, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number }`
        : `Identify all the food and drinks visible in this image and estimate the total nutritional content for the entire meal/plate shown. Return ONLY a JSON object with no markdown: { "food_name": string, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number }`;
      content = [
        { type: 'image', source: { type: 'base64', media_type: image.media_type || 'image/jpeg', data: image.data } },
        { type: 'text', text: prompt },
      ];
    } else {
      content = `Estimate the nutritional content of: ${description}. Return ONLY a JSON object with no markdown: { "food_name": string, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number }`;
    }

    let message;
    try {
      message = await client.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 512, messages: [{ role: 'user', content }] });
    } catch (err) {
      console.error('Anthropic error:', err?.message);
      return res.status(502).json({ error: `AI service error: ${err?.message}` });
    }

    const text = message.content[0].text.trim();
    try {
      return res.json(JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim()));
    } catch {
      const match = text.match(/\{[\s\S]*?\}/);
      if (match) try { return res.json(JSON.parse(match[0])); } catch {}
      return res.status(500).json({ error: 'Could not parse nutrition data', raw: text });
    }
  }

  if (action === 'quote') {
    const { streak, monthlyPercent } = req.body;
    let message;
    try {
      message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 150,
        messages: [{ role: 'user', content: `Generate a short, warm, motivational quote (max 2 sentences) for someone who has hit their health goals for ${streak || 1} consecutive days and is ${monthlyPercent || 0}% toward their monthly weight loss target. Return ONLY the quote text, no quotation marks, no attribution.` }],
      });
    } catch (err) {
      console.error('Anthropic error:', err?.message);
      return res.status(502).json({ error: `AI service error: ${err?.message}` });
    }
    return res.json({ quote: message.content[0].text.trim() });
  }

  return res.status(400).json({ error: 'Invalid action. Use ?action=calories or ?action=quote' });
}
