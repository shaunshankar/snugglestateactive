import 'dotenv/config';
import express from 'express';
import { createServer } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

// Dynamically load API handlers
async function loadHandler(path) {
  const mod = await import(path + '?t=' + Date.now());
  return mod.default;
}

app.all('/api/auth/signup', async (req, res) => {
  const h = await loadHandler(join(__dirname, 'api/auth/signup.js'));
  return h(req, res);
});
app.all('/api/auth/login', async (req, res) => {
  const h = await loadHandler(join(__dirname, 'api/auth/login.js'));
  return h(req, res);
});
app.all('/api/ai/calories', async (req, res) => {
  const h = await loadHandler(join(__dirname, 'api/ai/calories.js'));
  return h(req, res);
});
app.all('/api/ai/quote', async (req, res) => {
  const h = await loadHandler(join(__dirname, 'api/ai/quote.js'));
  return h(req, res);
});
app.all('/api/weight*', async (req, res) => {
  const h = await loadHandler(join(__dirname, 'api/weight.js'));
  return h(req, res);
});
app.all('/api/food*', async (req, res) => {
  const h = await loadHandler(join(__dirname, 'api/food.js'));
  return h(req, res);
});
app.all('/api/water*', async (req, res) => {
  const h = await loadHandler(join(__dirname, 'api/water.js'));
  return h(req, res);
});
app.all('/api/goals*', async (req, res) => {
  const h = await loadHandler(join(__dirname, 'api/goals.js'));
  return h(req, res);
});
app.all('/api/user*', async (req, res) => {
  const h = await loadHandler(join(__dirname, 'api/user.js'));
  return h(req, res);
});
app.all('/api/household*', async (req, res) => {
  const h = await loadHandler(join(__dirname, 'api/household.js'));
  return h(req, res);
});
app.all('/api/notifications*', async (req, res) => {
  const h = await loadHandler(join(__dirname, 'api/notifications.js'));
  return h(req, res);
});

const PORT = 3001;
app.listen(PORT, () => console.log(`API server running on http://localhost:${PORT}`));
