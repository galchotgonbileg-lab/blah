import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

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

const dataFilePath = path.join(__dirname, 'data', 'restaurants.json');
const restaurantsData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));

function saveData() {
  const tmpPath = `${dataFilePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(restaurantsData, null, 2));
  fs.renameSync(tmpPath, dataFilePath);
}

function isNonEmptyString(value, maxLen) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLen;
}

function isValidRating(value) {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

function containsMarkup(value) {
  return typeof value === 'string' && /[<>]/.test(value);
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

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

const MAX_BODY_BYTES = 64 * 1024;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
        reject(new Error('Request body too large.'));
        req.destroy();
      }
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

  if (reviewsMatch && req.method === 'POST') {
    const restaurantId = reviewsMatch[1];
    const restaurant = restaurantsData.restaurants.find((r) => r.id === restaurantId);

    if (!restaurant) {
      sendJson(res, 404, { error: 'Restaurant not found' });
      return;
    }

    try {
      const body = JSON.parse(await readBody(req));
      const { userDisplayName, tasteRating, hygieneRating, serviceRating, comment } = body;

      if (!isNonEmptyString(userDisplayName, 60)) {
        sendJson(res, 400, { error: 'userDisplayName is required (1-60 characters).' });
        return;
      }
      if (!isValidRating(tasteRating) || !isValidRating(hygieneRating) || !isValidRating(serviceRating)) {
        sendJson(res, 400, { error: 'Ratings must be integers between 1 and 5.' });
        return;
      }
      if (!isNonEmptyString(comment, 500)) {
        sendJson(res, 400, { error: 'comment is required (1-500 characters).' });
        return;
      }
      if (containsMarkup(userDisplayName) || containsMarkup(comment)) {
        sendJson(res, 400, { error: 'Text fields may not contain markup characters.' });
        return;
      }

      const review = {
        id: randomUUID(),
        userId: `guest-${randomUUID()}`,
        userDisplayName: userDisplayName.trim(),
        tasteRating,
        hygieneRating,
        serviceRating,
        comment: comment.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: null
      };

      const reviews = restaurantsData.reviews[restaurantId] ?? [];
      reviews.push(review);
      restaurantsData.reviews[restaurantId] = reviews;

      restaurant.avgTaste = round1(reviews.reduce((sum, r) => sum + r.tasteRating, 0) / reviews.length);
      restaurant.avgHygiene = round1(reviews.reduce((sum, r) => sum + r.hygieneRating, 0) / reviews.length);
      restaurant.avgService = round1(reviews.reduce((sum, r) => sum + r.serviceRating, 0) / reviews.length);
      restaurant.avgOverall = round1((restaurant.avgTaste + restaurant.avgHygiene + restaurant.avgService) / 3);
      restaurant.reviewCount = reviews.length;

      saveData();
      sendJson(res, 201, { review, restaurant });
    } catch (error) {
      sendJson(res, 400, { error: error.message || 'Invalid request body.' });
    }
    return;
  }

  if (pathname === '/api/restaurants' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));
      const { name, city, district, category, address } = body;

      if (!isNonEmptyString(name, 100)) {
        sendJson(res, 400, { error: 'name is required (1-100 characters).' });
        return;
      }
      if (!isNonEmptyString(city, 60)) {
        sendJson(res, 400, { error: 'city is required (1-60 characters).' });
        return;
      }
      if (!isNonEmptyString(district, 60)) {
        sendJson(res, 400, { error: 'district is required (1-60 characters).' });
        return;
      }
      if (!isNonEmptyString(category, 60)) {
        sendJson(res, 400, { error: 'category is required (1-60 characters).' });
        return;
      }
      if (address !== undefined && address !== null && (typeof address !== 'string' || address.trim().length > 200)) {
        sendJson(res, 400, { error: 'address must be a string up to 200 characters.' });
        return;
      }
      if (containsMarkup(name) || containsMarkup(district) || containsMarkup(category) || containsMarkup(address)) {
        sendJson(res, 400, { error: 'Text fields may not contain markup characters.' });
        return;
      }

      const restaurant = {
        id: randomUUID(),
        name: name.trim(),
        city: city.trim(),
        district: district.trim(),
        category: category.trim(),
        createdBy: 'guest',
        createdAt: new Date().toISOString(),
        reviewCount: 0,
        avgTaste: 0,
        avgHygiene: 0,
        avgService: 0,
        avgOverall: 0,
        address: address ? address.trim() : null,
        photoUrl: null
      };

      restaurantsData.restaurants.push(restaurant);
      restaurantsData.reviews[restaurant.id] = [];

      saveData();
      sendJson(res, 201, restaurant);
    } catch (error) {
      sendJson(res, 400, { error: error.message || 'Invalid request body.' });
    }
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
