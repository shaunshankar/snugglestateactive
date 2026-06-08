import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '10mb' }));

async function load(path) {
  const mod = await import(path + '?t=' + Date.now());
  return mod.default;
}

app.all('/api/auth/signup',              async (req, res) => (await load(join(__dirname, 'api/auth/signup.js')))(req, res));
app.all('/api/auth/login',               async (req, res) => (await load(join(__dirname, 'api/auth/login.js')))(req, res));
app.all('/api/ai/calories',              async (req, res) => (await load(join(__dirname, 'api/ai/calories.js')))(req, res));
app.all('/api/ai/quote',                 async (req, res) => (await load(join(__dirname, 'api/ai/quote.js')))(req, res));
app.all('/api/weight',                   async (req, res) => (await load(join(__dirname, 'api/weight.js')))(req, res));
app.all('/api/food',                     async (req, res) => (await load(join(__dirname, 'api/food.js')))(req, res));
app.all('/api/water',                    async (req, res) => (await load(join(__dirname, 'api/water.js')))(req, res));
app.all('/api/goals',                    async (req, res) => (await load(join(__dirname, 'api/goals.js')))(req, res));
app.all('/api/user',                     async (req, res) => (await load(join(__dirname, 'api/user.js')))(req, res));
app.all('/api/household/join',           async (req, res) => (await load(join(__dirname, 'api/household/join.js')))(req, res));
app.all('/api/household/leave',          async (req, res) => (await load(join(__dirname, 'api/household/leave.js')))(req, res));
app.all('/api/household/member/:userId', async (req, res) => (await load(join(__dirname, 'api/household/member/[userId].js')))(req, res));
app.all('/api/household/cheer/:userId',  async (req, res) => (await load(join(__dirname, 'api/household/cheer/[userId].js')))(req, res));
app.all('/api/household',               async (req, res) => (await load(join(__dirname, 'api/household/index.js')))(req, res));
app.all('/api/notifications/read',       async (req, res) => (await load(join(__dirname, 'api/notifications/read.js')))(req, res));
app.all('/api/notifications',            async (req, res) => (await load(join(__dirname, 'api/notifications/index.js')))(req, res));

app.listen(3001, () => console.log('API server → http://localhost:3001'));
