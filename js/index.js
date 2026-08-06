import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const restaurantsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'restaurants.json'), 'utf8')
);

const port = 3000;
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const { pathname } = new URL(req.url, 'http://localhost');

  if (pathname === '/health') {
    sendJson(res, 200, { status: 'ok' });
    return;
  }

  if (pathname === '/api/restaurants' && req.method === 'GET') {
    sendJson(res, 200, restaurantsData.restaurants);
    return;
  }

  const reviewsMatch = pathname.match(/^\/api\/restaurants\/([^/]+)\/reviews$/);
  if (reviewsMatch && req.method === 'GET') {
    const restaurantId = reviewsMatch[1];
    const restaurant = restaurantsData.restaurants.find((r) => r.id === restaurantId);

    if (!restaurant) {
      sendJson(res, 404, { error: 'Restaurant not found' });
      return;
    }

    sendJson(res, 200, restaurantsData.reviews[restaurantId] ?? []);
    return;
  }

  if (pathname === '/api/assistant' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const { prompt } = JSON.parse(body);

      if (!prompt || typeof prompt !== 'string') {
        sendJson(res, 400, { error: 'Prompt is required.' });
        return;
      }

      const apiKey = process.env.OPENAI_API_KEY?.trim();
      const hasRealApiKey = Boolean(apiKey) && apiKey !== 'your_openai_api_key_here' && !apiKey.startsWith('your_');

      if (!hasRealApiKey) {
        const demoReply = `Demo mode: I can help with restaurant ideas. For your request, "${prompt}", I would suggest a cozy pasta dinner, a table near the window, and a relaxed evening atmosphere.`;
        sendJson(res, 200, { reply: demoReply, mode: 'demo' });
        return;
      }

      const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful restaurant assistant for a cozy dining experience.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7
        })
      });

      const data = await openAiResponse.json();
      if (!openAiResponse.ok) {
        sendJson(res, openAiResponse.status, {
          error: data.error?.message || 'OpenAI request failed.'
        });
        return;
      }

      const reply = data.choices?.[0]?.message?.content?.trim() || 'No reply generated.';
      sendJson(res, 200, { reply });
    } catch (error) {
      sendJson(res, 500, { error: error.message || 'Unexpected server error.' });
    }
    return;
  }

  sendJson(res, 200, { message: 'Сайн байна уу! Энэ бол JavaScript starter сервер юм.' });
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
