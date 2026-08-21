import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDomainCatalog } from './domains/catalog.js';
import { fetchFacebookFeed } from './services/facebookFeed.js';
import { createStorage } from './storage.js';

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

const port = Number(process.env.PORT || 3001);
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const dataFilePath = path.join(__dirname, 'data', 'restaurants.json');
const storage = createStorage({ dataFilePath });

const CORS_METHODS = 'GET, POST, PATCH, DELETE, OPTIONS';
const CORS_HEADERS = 'Content-Type, X-Edit-Token';
const staticRoot = path.resolve(__dirname, '..');
const staticFiles = new Map([
  ['/', { file: 'index.html', type: 'text/html; charset=utf-8' }],
  ['/index.html', { file: 'index.html', type: 'text/html; charset=utf-8' }],
  ['/styles.css', { file: 'styles.css', type: 'text/css; charset=utf-8' }],
  ['/script.js', { file: 'script.js', type: 'text/javascript; charset=utf-8' }]
]);

function isNonEmptyString(value, maxLen) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLen;
}

function isValidRating(value) {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

function containsMarkup(value) {
  return typeof value === 'string' && /[<>]/.test(value);
}

function getEditToken(req) {
  const value = req.headers['x-edit-token'];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': CORS_METHODS,
    'Access-Control-Allow-Headers': CORS_HEADERS
  });
  res.end(JSON.stringify(payload));
}

function sendFile(res, fileName, contentType) {
  const filePath = path.join(staticRoot, fileName);
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
}

const MAX_BODY_BYTES = 8 * 1024 * 1024;

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

async function readJson(req) {
  return JSON.parse(await readBody(req));
}

function validateRestaurantPayload({ name, city, district, category, address }, partial = false) {
  const hasAnyField = [name, city, district, category, address].some((value) => value !== undefined);

  if (partial && !hasAnyField) {
    return 'No editable fields provided.';
  }
  if ((!partial || name !== undefined) && !isNonEmptyString(name, 100)) {
    return partial ? 'name must be 1-100 characters.' : 'name is required (1-100 characters).';
  }
  if ((!partial || city !== undefined) && !isNonEmptyString(city, 60)) {
    return partial ? 'city must be 1-60 characters.' : 'city is required (1-60 characters).';
  }
  if ((!partial || district !== undefined) && !isNonEmptyString(district, 60)) {
    return partial ? 'district must be 1-60 characters.' : 'district is required (1-60 characters).';
  }
  if ((!partial || category !== undefined) && !isNonEmptyString(category, 60)) {
    return partial ? 'category must be 1-60 characters.' : 'category is required (1-60 characters).';
  }
  if (address !== undefined && address !== null && (typeof address !== 'string' || address.trim().length > 200)) {
    return 'address must be a string up to 200 characters.';
  }
  if (containsMarkup(name) || containsMarkup(city) || containsMarkup(district) || containsMarkup(category) || containsMarkup(address)) {
    return 'Text fields may not contain markup characters.';
  }
  return null;
}

function validateReviewPayload({ userDisplayName, tasteRating, hygieneRating, serviceRating, comment }) {
  if (!isNonEmptyString(userDisplayName, 60)) {
    return 'userDisplayName is required (1-60 characters).';
  }
  if (!isValidRating(tasteRating) || !isValidRating(hygieneRating) || !isValidRating(serviceRating)) {
    return 'Ratings must be integers between 1 and 5.';
  }
  if (!isNonEmptyString(comment, 500)) {
    return 'comment is required (1-500 characters).';
  }
  if (containsMarkup(userDisplayName) || containsMarkup(comment)) {
    return 'Text fields may not contain markup characters.';
  }
  return null;
}

function validateOrderPayload({ customerName, phone, note, mode, items }) {
  if (!isNonEmptyString(customerName, 80)) {
    return 'customerName is required (1-80 characters).';
  }
  if (!isNonEmptyString(phone, 30)) {
    return 'phone is required (1-30 characters).';
  }
  if (note !== undefined && note !== null && (typeof note !== 'string' || note.trim().length > 300)) {
    return 'note must be a string up to 300 characters.';
  }
  if (!['delivery', 'pickup'].includes(mode)) {
    return 'mode must be delivery or pickup.';
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > 30) {
    return 'items must contain 1-30 items.';
  }
  if (containsMarkup(customerName) || containsMarkup(phone) || containsMarkup(note)) {
    return 'Text fields may not contain markup characters.';
  }

  for (const item of items) {
    if (!isNonEmptyString(item.dishId, 80)) {
      return 'Each item requires dishId.';
    }
    if (!isNonEmptyString(item.name, 120)) {
      return 'Each item requires name.';
    }
    if (!Number.isInteger(item.price) || item.price < 0 || item.price > 10000000) {
      return 'Each item price must be a valid integer.';
    }
    if (!Number.isInteger(item.qty) || item.qty < 1 || item.qty > 99) {
      return 'Each item qty must be between 1 and 99.';
    }
    if (containsMarkup(item.dishId) || containsMarkup(item.name)) {
      return 'Item fields may not contain markup characters.';
    }
  }

  return null;
}

function validateRecipeImagePayload({ imageDataUrl, servings }) {
  if (typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
    return 'imageDataUrl must be a base64 image data URL.';
  }
  if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(imageDataUrl)) {
    return 'Only png, jpg, jpeg, and webp images are supported.';
  }
  if (Buffer.byteLength(imageDataUrl, 'utf8') > MAX_BODY_BYTES - 1024) {
    return 'Image is too large.';
  }
  if (servings !== undefined && servings !== null && (!Number.isInteger(servings) || servings < 1 || servings > 20)) {
    return 'servings must be between 1 and 20.';
  }
  return null;
}

const SOCIAL_RESOURCE_TYPES = new Set(['restaurant', 'destination', 'dish', 'recipe', 'trip_route', 'tour_package']);

function validateSocialResource(resourceType, resourceId) {
  if (!SOCIAL_RESOURCE_TYPES.has(resourceType)) {
    return 'Unsupported resource type.';
  }
  if (!isNonEmptyString(resourceId, 120) || containsMarkup(resourceId)) {
    return 'resourceId is required (1-120 characters).';
  }
  return null;
}

function validateSocialCommentPayload({ userDisplayName, comment }) {
  if (!isNonEmptyString(userDisplayName, 60)) {
    return 'userDisplayName is required (1-60 characters).';
  }
  if (!isNonEmptyString(comment, 500)) {
    return 'comment is required (1-500 characters).';
  }
  if (containsMarkup(userDisplayName) || containsMarkup(comment)) {
    return 'Text fields may not contain markup characters.';
  }
  return null;
}

function validateSocialSharePayload({ channel, note }) {
  if (channel !== undefined && channel !== null && !isNonEmptyString(channel, 40)) {
    return 'channel must be 1-40 characters.';
  }
  if (note !== undefined && note !== null && (typeof note !== 'string' || note.trim().length > 240)) {
    return 'note must be a string up to 240 characters.';
  }
  if (containsMarkup(channel) || containsMarkup(note)) {
    return 'Text fields may not contain markup characters.';
  }
  return null;
}

function validateFacebookFeedQuery({ sourceId, sourceType, limit }) {
  if (!isNonEmptyString(sourceId, 120) || containsMarkup(sourceId) || !/^[A-Za-z0-9_.-]+$/.test(sourceId)) {
    return 'sourceId is required and may only contain letters, numbers, underscore, dot, or dash.';
  }
  if (!['page', 'group'].includes(sourceType)) {
    return 'sourceType must be page or group.';
  }
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 50)) {
    return 'limit must be between 1 and 50.';
  }
  return null;
}

function validateLocationQuery({ latitude, longitude, radiusKm, type }) {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return 'lat must be a number between -90 and 90.';
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return 'lng must be a number between -180 and 180.';
  }
  if (!Number.isFinite(radiusKm) || radiusKm < 1 || radiusKm > 5000) {
    return 'radiusKm must be a number between 1 and 5000.';
  }
  if (!['all', 'restaurants', 'destinations'].includes(type)) {
    return 'type must be all, restaurants, or destinations.';
  }
  return null;
}

function validateBacklogPayload({ title, domain, target, priority, status, source, evidence }) {
  if (!isNonEmptyString(title, 160)) {
    return 'title is required (1-160 characters).';
  }
  if (!['food', 'tourism', 'platform'].includes(domain)) {
    return 'domain must be food, tourism, or platform.';
  }
  if (!['web', 'app', 'both'].includes(target)) {
    return 'target must be web, app, or both.';
  }
  if (!['fire3', 'fire2', 'fire1', 'watch'].includes(priority)) {
    return 'priority must be fire3, fire2, fire1, or watch.';
  }
  if (status !== undefined && !['idea', 'planned', 'doing', 'done'].includes(status)) {
    return 'status must be idea, planned, doing, or done.';
  }
  if (source !== undefined && (typeof source !== 'string' || source.trim().length > 80)) {
    return 'source must be a string up to 80 characters.';
  }
  if (evidence !== undefined && (!Array.isArray(evidence) || evidence.length > 8 || evidence.some((item) => typeof item !== 'string' || item.trim().length > 500))) {
    return 'evidence must contain up to 8 text items.';
  }
  if (containsMarkup(title) || containsMarkup(source) || (Array.isArray(evidence) && evidence.some(containsMarkup))) {
    return 'Text fields may not contain markup characters.';
  }
  return null;
}

function validateBacklogStatusPayload({ status }) {
  if (!['idea', 'planned', 'doing', 'done'].includes(status)) {
    return 'status must be idea, planned, doing, or done.';
  }
  return null;
}

function parseRecipeText(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(raw);
}

function sendStorageResult(res, result, successStatusCode, successPayload) {
  if (result.status === 'not_found' || result.status === 'not_found_restaurant') {
    sendJson(res, 404, { error: 'Restaurant not found' });
    return true;
  }
  if (result.status === 'not_found_review') {
    sendJson(res, 404, { error: 'Review not found' });
    return true;
  }
  if (result.status === 'forbidden') {
    sendJson(res, 403, { error: 'Invalid or missing edit token.' });
    return true;
  }
  if (result.status === 'ok') {
    sendJson(res, successStatusCode, successPayload(result));
    return true;
  }
  return false;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': CORS_METHODS,
      'Access-Control-Allow-Headers': CORS_HEADERS
    });
    res.end();
    return;
  }

  const { pathname } = new URL(req.url, 'http://localhost');

  try {
    if (req.method === 'GET' && staticFiles.has(pathname)) {
      const asset = staticFiles.get(pathname);
      sendFile(res, asset.file, asset.type);
      return;
    }

    if (pathname === '/health') {
      sendJson(res, 200, { status: 'ok', storage: storage.mode });
      return;
    }

    if (pathname === '/api/domains' && req.method === 'GET') {
      sendJson(res, 200, getDomainCatalog());
      return;
    }

    if (pathname === '/api/tourism/destinations' && req.method === 'GET') {
      sendJson(res, 200, await storage.getTourismDestinations());
      return;
    }

    if (pathname === '/api/location/nearby' && req.method === 'GET') {
      const url = new URL(req.url, 'http://localhost');
      const latitude = Number(url.searchParams.get('lat'));
      const longitude = Number(url.searchParams.get('lng'));
      const radiusKm = Number(url.searchParams.get('radiusKm') || 50);
      const type = url.searchParams.get('type') || 'all';
      const error = validateLocationQuery({ latitude, longitude, radiusKm, type });
      if (error) {
        sendJson(res, 400, { error });
        return;
      }
      sendJson(res, 200, await storage.getNearby({ latitude, longitude, radiusKm, type }));
      return;
    }

    if (pathname === '/api/facebook/feed' && req.method === 'GET') {
      const url = new URL(req.url, 'http://localhost');
      const sourceId = url.searchParams.get('sourceId') || process.env.FACEBOOK_SOURCE_ID || '';
      const sourceType = url.searchParams.get('sourceType') || process.env.FACEBOOK_SOURCE_TYPE || 'page';
      const limitParam = url.searchParams.get('limit');
      const limit = limitParam ? Number(limitParam) : 30;
      const keywords = (url.searchParams.get('keywords') || 'хоол,амралт,меню,үнэ,захиалга,хүргэлт,байршил')
        .split(',')
        .map((keyword) => keyword.trim())
        .filter(Boolean)
        .slice(0, 20);

      const error = validateFacebookFeedQuery({ sourceId, sourceType, limit });
      if (error) {
        sendJson(res, 400, { error });
        return;
      }

      sendJson(res, 200, await fetchFacebookFeed({ sourceId, sourceType, limit, keywords }));
      return;
    }

    if (pathname === '/api/backlog' && req.method === 'GET') {
      sendJson(res, 200, await storage.getBacklogItems());
      return;
    }

    if (pathname === '/api/backlog' && req.method === 'POST') {
      const body = await readJson(req);
      const error = validateBacklogPayload(body);
      if (error) {
        sendJson(res, 400, { error });
        return;
      }
      sendJson(res, 201, await storage.createBacklogItem(body));
      return;
    }

    const backlogMatch = pathname.match(/^\/api\/backlog\/([^/]+)$/);
    if (backlogMatch && req.method === 'PATCH') {
      const body = await readJson(req);
      const error = validateBacklogStatusPayload(body);
      if (error) {
        sendJson(res, 400, { error });
        return;
      }
      const result = await storage.updateBacklogStatus(backlogMatch[1], body.status);
      if (result.status === 'not_found') {
        sendJson(res, 404, { error: 'Backlog item not found.' });
        return;
      }
      sendJson(res, 200, result.item);
      return;
    }

    const socialMatch = pathname.match(/^\/api\/social\/([^/]+)\/([^/]+)$/);
    if (socialMatch && req.method === 'GET') {
      const [, resourceType, resourceId] = socialMatch;
      const error = validateSocialResource(resourceType, decodeURIComponent(resourceId));
      if (error) {
        sendJson(res, 400, { error });
        return;
      }
      sendJson(res, 200, await storage.getSocialSummary(resourceType, decodeURIComponent(resourceId)));
      return;
    }

    const socialActionMatch = pathname.match(/^\/api\/social\/([^/]+)\/([^/]+)\/(likes|comments|shares)$/);
    if (socialActionMatch && req.method === 'POST') {
      const [, resourceType, rawResourceId, action] = socialActionMatch;
      const resourceId = decodeURIComponent(rawResourceId);
      const resourceError = validateSocialResource(resourceType, resourceId);
      if (resourceError) {
        sendJson(res, 400, { error: resourceError });
        return;
      }

      if (action === 'likes') {
        sendJson(res, 201, await storage.addSocialLike(resourceType, resourceId));
        return;
      }

      const body = await readJson(req);
      if (action === 'comments') {
        const error = validateSocialCommentPayload(body);
        if (error) {
          sendJson(res, 400, { error });
          return;
        }
        sendJson(res, 201, await storage.addSocialComment(resourceType, resourceId, body));
        return;
      }

      const error = validateSocialSharePayload(body);
      if (error) {
        sendJson(res, 400, { error });
        return;
      }
      sendJson(res, 201, await storage.addSocialShare(resourceType, resourceId, body));
      return;
    }

    if (pathname === '/api/restaurants' && req.method === 'GET') {
      sendJson(res, 200, await storage.getRestaurants());
      return;
    }

    if (pathname === '/api/restaurants' && req.method === 'POST') {
      const body = await readJson(req);
      const error = validateRestaurantPayload(body);
      if (error) {
        sendJson(res, 400, { error });
        return;
      }
      sendJson(res, 201, await storage.createRestaurant(body));
      return;
    }

    if (pathname === '/api/orders' && req.method === 'GET') {
      sendJson(res, 200, await storage.getOrders());
      return;
    }

    if (pathname === '/api/orders' && req.method === 'POST') {
      const body = await readJson(req);
      const error = validateOrderPayload(body);
      if (error) {
        sendJson(res, 400, { error });
        return;
      }
      sendJson(res, 201, await storage.createOrder(body));
      return;
    }

    if (pathname === '/api/recipe-from-image' && req.method === 'POST') {
      const body = await readJson(req);
      const error = validateRecipeImagePayload(body);
      if (error) {
        sendJson(res, 400, { error });
        return;
      }

      const apiKey = process.env.OPENAI_API_KEY?.trim();
      const hasRealApiKey = Boolean(apiKey) && apiKey !== 'your_openai_api_key_here' && !apiKey.startsWith('your_');

      if (!hasRealApiKey) {
        sendJson(res, 200, {
          mode: 'demo',
          recipe: {
            dishName: 'Танигдсан хоол',
            confidence: 'demo',
            servings: body.servings || 2,
            ingredients: ['Үндсэн орц 300г', 'Ногоо 200г', 'Давс, перец амталгаагаар'],
            method: ['Орцоо бэлтгэнэ.', 'Дунд гал дээр болгоно.', 'Амталж таваглана.'],
            tips: ['OPENAI_API_KEY тохируулбал зурагнаас бодитоор танина.'],
            nutritionNote: 'Ойролцоогоор тооцоолсон мэдээлэл.'
          }
        });
        return;
      }

      const requestedServings = body.servings || 2;
      const openAiResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: process.env.OPENAI_VISION_MODEL || model,
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: `Зураг дээрх хоолыг таньж Монгол хэлээр жор гарга. ${requestedServings} порцод тааруул. Зөвхөн JSON буцаа: {"dishName": string, "confidence": "low|medium|high", "servings": number, "ingredients": string[], "method": string[], "tips": string[], "nutritionNote": string}. Хэрэв хоол тодорхой биш бол хамгийн магадлалтай хувилбарыг confidence low гэж тэмдэглэ.`
                },
                {
                  type: 'input_image',
                  image_url: body.imageDataUrl,
                  detail: 'low'
                }
              ]
            }
          ],
          temperature: 0.2
        })
      });

      const data = await openAiResponse.json();
      if (!openAiResponse.ok) {
        sendJson(res, openAiResponse.status, {
          error: data.error?.message || 'OpenAI image analysis failed.'
        });
        return;
      }

      try {
        sendJson(res, 200, { recipe: parseRecipeText(data.output_text || '') });
      } catch {
        sendJson(res, 200, {
          recipe: {
            dishName: 'Жор',
            confidence: 'medium',
            servings: requestedServings,
            ingredients: [],
            method: [data.output_text || 'Хариу боловсруулахад алдаа гарлаа.'],
            tips: [],
            nutritionNote: ''
          }
        });
      }
      return;
    }

    const reviewsMatch = pathname.match(/^\/api\/restaurants\/([^/]+)\/reviews$/);
    if (reviewsMatch && req.method === 'GET') {
      const restaurantId = reviewsMatch[1];
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) {
        sendJson(res, 404, { error: 'Restaurant not found' });
        return;
      }
      sendJson(res, 200, await storage.getReviews(restaurantId));
      return;
    }

    if (reviewsMatch && req.method === 'POST') {
      const restaurantId = reviewsMatch[1];
      const body = await readJson(req);
      const error = validateReviewPayload(body);
      if (error) {
        sendJson(res, 400, { error });
        return;
      }
      const result = await storage.createReview(restaurantId, body);
      sendStorageResult(res, result, 201, ({ review, restaurant }) => ({ review, restaurant }));
      return;
    }

    const reviewByIdMatch = pathname.match(/^\/api\/restaurants\/([^/]+)\/reviews\/([^/]+)$/);
    if (reviewByIdMatch && req.method === 'DELETE') {
      const [, restaurantId, reviewId] = reviewByIdMatch;
      const result = await storage.deleteReview(restaurantId, reviewId, getEditToken(req));
      sendStorageResult(res, result, 200, ({ restaurant }) => ({ restaurant }));
      return;
    }

    const restaurantByIdMatch = pathname.match(/^\/api\/restaurants\/([^/]+)$/);
    if (restaurantByIdMatch && req.method === 'DELETE') {
      const restaurantId = restaurantByIdMatch[1];
      const result = await storage.deleteRestaurant(restaurantId, getEditToken(req));
      sendStorageResult(res, result, 200, () => ({ success: true, id: restaurantId }));
      return;
    }

    if (restaurantByIdMatch && req.method === 'PATCH') {
      const restaurantId = restaurantByIdMatch[1];
      const body = await readJson(req);
      const error = validateRestaurantPayload(body, true);
      if (error) {
        sendJson(res, 400, { error });
        return;
      }
      const result = await storage.updateRestaurant(restaurantId, body, getEditToken(req));
      sendStorageResult(res, result, 200, ({ restaurant }) => restaurant);
      return;
    }

    if (pathname === '/api/assistant' && req.method === 'POST') {
      const { prompt } = await readJson(req);

      if (!prompt || typeof prompt !== 'string') {
        sendJson(res, 400, { error: 'Prompt is required.' });
        return;
      }

      const apiKey = process.env.OPENAI_API_KEY?.trim();
      const hasRealApiKey = Boolean(apiKey) && apiKey !== 'your_openai_api_key_here' && !apiKey.startsWith('your_');

      if (!hasRealApiKey) {
        const demoReply = `Demo горим: "${prompt}" асуултад халуун шөл, шинэхэн салат эсвэл тухтай оройн хоолны сет санал болгож байна. OPENAI_API_KEY тохируулбал илүү нарийн хариулна.`;
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
              content: 'Та монгол хэлээр хариулдаг, хоол сонгоход тусалдаг ресторан аппын туслах.'
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
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    const statusCode = error instanceof SyntaxError ? 400 : 500;
    sendJson(res, statusCode, { error: error.message || 'Unexpected server error.' });
  }
});

await storage.init();

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Storage: ${storage.mode}`);
});
