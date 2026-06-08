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

app.all('/api/auth',                     async (req, res) => (await load(join(__dirname, 'api/auth.js')))(req, res));
app.all('/api/ai',                       async (req, res) => (await load(join(__dirname, 'api/ai.js')))(req, res));
app.all('/api/weight',                   async (req, res) => (await load(join(__dirname, 'api/weight.js')))(req, res));
app.all('/api/food',                     async (req, res) => (await load(join(__dirname, 'api/food.js')))(req, res));
app.all('/api/water',                    async (req, res) => (await load(join(__dirname, 'api/water.js')))(req, res));
app.all('/api/goals',                    async (req, res) => (await load(join(__dirname, 'api/goals.js')))(req, res));
app.all('/api/user',                     async (req, res) => (await load(join(__dirname, 'api/user.js')))(req, res));
app.all('/api/notifications',            async (req, res) => (await load(join(__dirname, 'api/notifications.js')))(req, res));
// Household sub-routes must come before the base route
app.all('/api/household/:seg/:id?',      async (req, res) => {
  req.query.path = req.params.id ? [req.params.seg, req.params.id] : [req.params.seg];
  return (await load(join(__dirname, 'api/household/[...path].js')))(req, res);
});
app.all('/api/household',               async (req, res) => (await load(join(__dirname, 'api/household/index.js')))(req, res));

app.listen(3001, () => console.log('API server → http://localhost:3001'));
