import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { tourismStarterDestinations } from './domains/catalog.js';

const { Pool } = pg;

const DEFAULT_RESTAURANT_LOCATION = { latitude: 47.9189, longitude: 106.9177 };
const RESTAURANT_LOCATION_BY_ID = new Map([
  ['r1', { latitude: 47.9201, longitude: 106.9178 }],
  ['r2', { latitude: 47.8911, longitude: 106.9271 }],
  ['r3', { latitude: 47.9132, longitude: 106.8604 }],
  ['r4', { latitude: 47.9297, longitude: 106.9069 }]
]);
const DESTINATION_LOCATION_BY_ID = new Map(
  tourismStarterDestinations.map((destination) => [
    destination.id,
    { latitude: destination.latitude, longitude: destination.longitude }
  ])
);

function round1(n) {
  return Math.round(n * 10) / 10;
}

function roundDistance(n) {
  return Math.round(n * 10) / 10;
}

function normalizeCoordinate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getRestaurantLocation(restaurant) {
  return RESTAURANT_LOCATION_BY_ID.get(restaurant.id) ?? DEFAULT_RESTAURANT_LOCATION;
}

function withRestaurantLocation(restaurant) {
  const fallback = getRestaurantLocation(restaurant);
  return {
    ...restaurant,
    latitude: normalizeCoordinate(restaurant.latitude ?? restaurant.lat) ?? fallback.latitude,
    longitude: normalizeCoordinate(restaurant.longitude ?? restaurant.lng) ?? fallback.longitude
  };
}

function withDestinationLocation(destination) {
  const fallback = DESTINATION_LOCATION_BY_ID.get(destination.id);
  return {
    ...destination,
    latitude: normalizeCoordinate(destination.latitude ?? destination.lat) ?? fallback?.latitude ?? null,
    longitude: normalizeCoordinate(destination.longitude ?? destination.lng) ?? fallback?.longitude ?? null
  };
}

function getDistanceKm(from, to) {
  const earthRadiusKm = 6371;
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLng = ((to.longitude - from.longitude) * Math.PI) / 180;
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function rankNearby(items, origin, radiusKm, kind) {
  return items
    .map((item) => {
      const latitude = normalizeCoordinate(item.latitude);
      const longitude = normalizeCoordinate(item.longitude);
      if (latitude === null || longitude === null) return null;
      return {
        ...item,
        kind,
        distanceKm: roundDistance(getDistanceKm(origin, { latitude, longitude }))
      };
    })
    .filter(Boolean)
    .filter((item) => item.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

function buildNearbyResult({ latitude, longitude, radiusKm, type, restaurants, destinations }) {
  const origin = { latitude, longitude };
  const includeRestaurants = type === 'all' || type === 'restaurants';
  const includeDestinations = type === 'all' || type === 'destinations';

  return {
    origin,
    radiusKm,
    type,
    restaurants: includeRestaurants ? rankNearby(restaurants.map(withRestaurantLocation), origin, radiusKm, 'restaurant') : [],
    destinations: includeDestinations ? rankNearby(destinations.map(withDestinationLocation), origin, radiusKm, 'destination') : []
  };
}

function toRestaurant(row) {
  return withRestaurantLocation({
    id: row.id,
    name: row.name,
    city: row.city,
    district: row.district,
    category: row.category,
    createdBy: row.created_by,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    reviewCount: Number(row.review_count),
    avgTaste: Number(row.avg_taste),
    avgHygiene: Number(row.avg_hygiene),
    avgService: Number(row.avg_service),
    avgOverall: Number(row.avg_overall),
    address: row.address,
    photoUrl: row.photo_url,
    latitude: row.latitude,
    longitude: row.longitude
  });
}

function toReview(row) {
  return {
    id: row.id,
    userId: row.user_id,
    userDisplayName: row.user_display_name,
    tasteRating: Number(row.taste_rating),
    hygieneRating: Number(row.hygiene_rating),
    serviceRating: Number(row.service_rating),
    comment: row.comment,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  };
}

function toOrder(row, items = []) {
  return {
    id: row.id,
    customerName: row.customer_name,
    phone: row.phone,
    note: row.note,
    mode: row.mode,
    status: row.status,
    subtotal: Number(row.subtotal),
    serviceFee: Number(row.service_fee),
    total: Number(row.total),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    items
  };
}

function toOrderItem(row) {
  return {
    id: row.id,
    dishId: row.dish_id,
    name: row.name,
    price: Number(row.price),
    qty: Number(row.qty),
    lineTotal: Number(row.line_total)
  };
}

function toDestination(row) {
  return withDestinationLocation({
    id: row.id,
    name: row.name,
    region: row.region,
    type: row.type,
    season: row.season,
    highlights: Array.isArray(row.highlights) ? row.highlights : [],
    suggestedDurationHours: Number(row.suggested_duration_hours),
    latitude: row.latitude,
    longitude: row.longitude
  });
}

function toSocialComment(row) {
  return {
    id: row.id,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    userDisplayName: row.user_display_name,
    comment: row.comment,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  };
}

function toBacklogItem(row) {
  return {
    id: row.id,
    title: row.title,
    domain: row.domain,
    target: row.target,
    priority: row.priority,
    status: row.status,
    source: row.source,
    evidence: Array.isArray(row.evidence) ? row.evidence : [],
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  };
}

async function recalculatePgRestaurant(client, restaurantId) {
  const { rows } = await client.query(
    `
      SELECT
        COUNT(*)::int AS review_count,
        COALESCE(ROUND(AVG(taste_rating)::numeric, 1), 0)::float AS avg_taste,
        COALESCE(ROUND(AVG(hygiene_rating)::numeric, 1), 0)::float AS avg_hygiene,
        COALESCE(ROUND(AVG(service_rating)::numeric, 1), 0)::float AS avg_service
      FROM reviews
      WHERE restaurant_id = $1
    `,
    [restaurantId]
  );
  const stats = rows[0];
  const avgOverall = round1((Number(stats.avg_taste) + Number(stats.avg_hygiene) + Number(stats.avg_service)) / 3);

  const updated = await client.query(
    `
      UPDATE restaurants
      SET review_count = $2,
          avg_taste = $3,
          avg_hygiene = $4,
          avg_service = $5,
          avg_overall = $6
      WHERE id = $1
      RETURNING *
    `,
    [restaurantId, stats.review_count, stats.avg_taste, stats.avg_hygiene, stats.avg_service, avgOverall]
  );

  return toRestaurant(updated.rows[0]);
}

function recalculateJsonRestaurant(data, restaurantId) {
  const restaurant = data.restaurants.find((item) => item.id === restaurantId);
  const reviews = data.reviews[restaurantId] ?? [];

  if (!restaurant) return null;

  if (reviews.length === 0) {
    restaurant.avgTaste = 0;
    restaurant.avgHygiene = 0;
    restaurant.avgService = 0;
    restaurant.avgOverall = 0;
  } else {
    restaurant.avgTaste = round1(reviews.reduce((sum, review) => sum + review.tasteRating, 0) / reviews.length);
    restaurant.avgHygiene = round1(reviews.reduce((sum, review) => sum + review.hygieneRating, 0) / reviews.length);
    restaurant.avgService = round1(reviews.reduce((sum, review) => sum + review.serviceRating, 0) / reviews.length);
    restaurant.avgOverall = round1((restaurant.avgTaste + restaurant.avgHygiene + restaurant.avgService) / 3);
  }
  restaurant.reviewCount = reviews.length;
  return restaurant;
}

async function seedPostgresFromJson(pool, dataFilePath) {
  const count = await pool.query('SELECT COUNT(*)::int AS count FROM restaurants');
  if (count.rows[0].count > 0 || !fs.existsSync(dataFilePath)) {
    return;
  }

  const seed = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const restaurant of seed.restaurants ?? []) {
      await client.query(
        `
          INSERT INTO restaurants (
            id, name, city, district, category, created_by, created_at,
            review_count, avg_taste, avg_hygiene, avg_service, avg_overall,
            address, photo_url, latitude, longitude
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT (id) DO NOTHING
        `,
        [
          restaurant.id,
          restaurant.name,
          restaurant.city,
          restaurant.district,
          restaurant.category,
          restaurant.createdBy,
          restaurant.createdAt,
          restaurant.reviewCount,
          restaurant.avgTaste,
          restaurant.avgHygiene,
          restaurant.avgService,
          restaurant.avgOverall,
          restaurant.address,
          restaurant.photoUrl,
          withRestaurantLocation(restaurant).latitude,
          withRestaurantLocation(restaurant).longitude
        ]
      );
    }

    for (const [restaurantId, reviews] of Object.entries(seed.reviews ?? {})) {
      for (const review of reviews) {
        await client.query(
          `
            INSERT INTO reviews (
              id, restaurant_id, user_id, user_display_name, taste_rating,
              hygiene_rating, service_rating, comment, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO NOTHING
          `,
          [
            review.id,
            restaurantId,
            review.userId,
            review.userDisplayName,
            review.tasteRating,
            review.hygieneRating,
            review.serviceRating,
            review.comment,
            review.createdAt,
            review.updatedAt
          ]
        );
      }
      await recalculatePgRestaurant(client, restaurantId);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function seedPostgresTourism(pool) {
  const count = await pool.query('SELECT COUNT(*)::int AS count FROM destinations');
  if (count.rows[0].count > 0) {
    return;
  }

  for (const destination of tourismStarterDestinations) {
    await pool.query(
      `
        INSERT INTO destinations (id, name, region, type, season, highlights, suggested_duration_hours, latitude, longitude)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING
      `,
      [
        destination.id,
        destination.name,
        destination.region,
        destination.type,
        destination.season,
        destination.highlights,
        destination.suggestedDurationHours,
        destination.latitude,
        destination.longitude
      ]
    );
  }
}

async function ensurePostgresLocationDefaults(pool) {
  for (const [id, location] of RESTAURANT_LOCATION_BY_ID.entries()) {
    await pool.query(
      `
        UPDATE restaurants
        SET latitude = COALESCE(latitude, $2),
            longitude = COALESCE(longitude, $3)
        WHERE id = $1
      `,
      [id, location.latitude, location.longitude]
    );
  }

  await pool.query(
    `
      UPDATE restaurants
      SET latitude = COALESCE(latitude, $1),
          longitude = COALESCE(longitude, $2)
      WHERE latitude IS NULL OR longitude IS NULL
    `,
    [DEFAULT_RESTAURANT_LOCATION.latitude, DEFAULT_RESTAURANT_LOCATION.longitude]
  );

  for (const destination of tourismStarterDestinations) {
    await pool.query(
      `
        UPDATE destinations
        SET latitude = COALESCE(latitude, $2),
            longitude = COALESCE(longitude, $3)
        WHERE id = $1
      `,
      [destination.id, destination.latitude, destination.longitude]
    );
  }
}

function createJsonStorage(dataFilePath) {
  const data = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
  data.tokens ??= { restaurants: {}, reviews: {} };
  data.tokens.restaurants ??= {};
  data.tokens.reviews ??= {};
  data.orders ??= [];
  data.destinations ??= tourismStarterDestinations;
  data.restaurants = data.restaurants.map(withRestaurantLocation);
  data.destinations = data.destinations.map(withDestinationLocation);
  data.social ??= { likes: [], comments: [], shares: [] };
  data.social.likes ??= [];
  data.social.comments ??= [];
  data.social.shares ??= [];
  data.backlog ??= [];

  function save() {
    const tmpPath = `${dataFilePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
    fs.renameSync(tmpPath, dataFilePath);
  }

  return {
    mode: 'json',
    async init() {},
    async getRestaurants() {
      return data.restaurants;
    },
    async getRestaurant(id) {
      return data.restaurants.find((restaurant) => restaurant.id === id) ?? null;
    },
    async getReviews(restaurantId) {
      return data.reviews[restaurantId] ?? [];
    },
    async getOrders() {
      return data.orders;
    },
    async getNearby(options) {
      return buildNearbyResult({
        ...options,
        restaurants: data.restaurants,
        destinations: data.destinations
      });
    },
    async getTourismDestinations() {
      return {
        status: 'active',
        destinations: data.destinations
      };
    },
    async getSocialSummary(resourceType, resourceId) {
      return {
        resourceType,
        resourceId,
        likeCount: data.social.likes.filter((item) => item.resourceType === resourceType && item.resourceId === resourceId).length,
        commentCount: data.social.comments.filter((item) => item.resourceType === resourceType && item.resourceId === resourceId).length,
        shareCount: data.social.shares.filter((item) => item.resourceType === resourceType && item.resourceId === resourceId).length,
        comments: data.social.comments
          .filter((item) => item.resourceType === resourceType && item.resourceId === resourceId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 10)
      };
    },
    async addSocialLike(resourceType, resourceId) {
      data.social.likes.push({
        id: randomUUID(),
        resourceType,
        resourceId,
        createdAt: new Date().toISOString()
      });
      save();
      return this.getSocialSummary(resourceType, resourceId);
    },
    async addSocialComment(resourceType, resourceId, input) {
      const comment = {
        id: randomUUID(),
        resourceType,
        resourceId,
        userDisplayName: input.userDisplayName.trim(),
        comment: input.comment.trim(),
        createdAt: new Date().toISOString()
      };
      data.social.comments.push(comment);
      save();
      return { comment, summary: await this.getSocialSummary(resourceType, resourceId) };
    },
    async addSocialShare(resourceType, resourceId, input) {
      data.social.shares.push({
        id: randomUUID(),
        resourceType,
        resourceId,
        channel: input.channel?.trim() || 'internal',
        note: input.note ? input.note.trim() : null,
        createdAt: new Date().toISOString()
      });
      save();
      return this.getSocialSummary(resourceType, resourceId);
    },
    async getBacklogItems() {
      return data.backlog;
    },
    async createBacklogItem(input) {
      const item = {
        id: randomUUID(),
        title: input.title.trim(),
        domain: input.domain,
        target: input.target,
        priority: input.priority,
        status: input.status || 'idea',
        source: input.source || 'research',
        evidence: Array.isArray(input.evidence) ? input.evidence.slice(0, 8) : [],
        createdAt: new Date().toISOString()
      };
      data.backlog.unshift(item);
      save();
      return item;
    },
    async updateBacklogStatus(id, status) {
      const item = data.backlog.find((backlogItem) => backlogItem.id === id);
      if (!item) return { status: 'not_found' };
      item.status = status;
      save();
      return { status: 'ok', item };
    },
    async createOrder(input) {
      const items = input.items.map((item) => ({
        id: randomUUID(),
        dishId: item.dishId,
        name: item.name.trim(),
        price: item.price,
        qty: item.qty,
        lineTotal: item.price * item.qty
      }));
      const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
      const serviceFee = input.mode === 'pickup' || subtotal === 0 ? 0 : 5000;
      const order = {
        id: randomUUID(),
        customerName: input.customerName.trim(),
        phone: input.phone.trim(),
        note: input.note ? input.note.trim() : null,
        mode: input.mode,
        status: 'new',
        subtotal,
        serviceFee,
        total: subtotal + serviceFee,
        createdAt: new Date().toISOString(),
        items
      };

      data.orders.unshift(order);
      save();
      return order;
    },
    async createRestaurant(input) {
      const restaurant = {
        id: randomUUID(),
        name: input.name.trim(),
        city: input.city.trim(),
        district: input.district.trim(),
        category: input.category.trim(),
        createdBy: 'guest',
        createdAt: new Date().toISOString(),
        reviewCount: 0,
        avgTaste: 0,
        avgHygiene: 0,
        avgService: 0,
        avgOverall: 0,
        address: input.address ? input.address.trim() : null,
        photoUrl: null,
        ...DEFAULT_RESTAURANT_LOCATION
      };
      const editToken = randomUUID();
      data.restaurants.push(restaurant);
      data.reviews[restaurant.id] = [];
      data.tokens.restaurants[restaurant.id] = editToken;
      save();
      return { ...restaurant, editToken };
    },
    async updateRestaurant(id, input, editToken) {
      const restaurant = data.restaurants.find((item) => item.id === id);
      if (!restaurant) return { status: 'not_found' };
      if (data.tokens.restaurants[id] !== editToken) return { status: 'forbidden' };

      if (input.name !== undefined) restaurant.name = input.name.trim();
      if (input.city !== undefined) restaurant.city = input.city.trim();
      if (input.district !== undefined) restaurant.district = input.district.trim();
      if (input.category !== undefined) restaurant.category = input.category.trim();
      if (input.address !== undefined) restaurant.address = input.address ? input.address.trim() : null;
      save();
      return { status: 'ok', restaurant };
    },
    async deleteRestaurant(id, editToken) {
      const restaurant = data.restaurants.find((item) => item.id === id);
      if (!restaurant) return { status: 'not_found' };
      if (data.tokens.restaurants[id] !== editToken) return { status: 'forbidden' };

      data.restaurants = data.restaurants.filter((item) => item.id !== id);
      for (const review of data.reviews[id] ?? []) {
        delete data.tokens.reviews[review.id];
      }
      delete data.reviews[id];
      delete data.tokens.restaurants[id];
      save();
      return { status: 'ok' };
    },
    async createReview(restaurantId, input) {
      const restaurant = data.restaurants.find((item) => item.id === restaurantId);
      if (!restaurant) return { status: 'not_found' };

      const review = {
        id: randomUUID(),
        userId: `guest-${randomUUID()}`,
        userDisplayName: input.userDisplayName.trim(),
        tasteRating: input.tasteRating,
        hygieneRating: input.hygieneRating,
        serviceRating: input.serviceRating,
        comment: input.comment.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: null
      };
      const editToken = randomUUID();
      data.reviews[restaurantId] ??= [];
      data.reviews[restaurantId].push(review);
      data.tokens.reviews[review.id] = editToken;
      recalculateJsonRestaurant(data, restaurantId);
      save();
      return { status: 'ok', review: { ...review, editToken }, restaurant };
    },
    async deleteReview(restaurantId, reviewId, editToken) {
      const restaurant = data.restaurants.find((item) => item.id === restaurantId);
      if (!restaurant) return { status: 'not_found_restaurant' };

      const reviews = data.reviews[restaurantId] ?? [];
      const review = reviews.find((item) => item.id === reviewId);
      if (!review) return { status: 'not_found_review' };
      if (data.tokens.reviews[reviewId] !== editToken) return { status: 'forbidden' };

      data.reviews[restaurantId] = reviews.filter((item) => item.id !== reviewId);
      delete data.tokens.reviews[reviewId];
      const updatedRestaurant = recalculateJsonRestaurant(data, restaurantId);
      save();
      return { status: 'ok', restaurant: updatedRestaurant };
    }
  };
}

function createPostgresStorage(connectionString, dataFilePath) {
  const pool = new Pool({
    connectionString,
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined
  });

  return {
    mode: 'postgres',
    async init() {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS restaurants (
          id text PRIMARY KEY,
          name text NOT NULL,
          city text NOT NULL,
          district text NOT NULL,
          category text NOT NULL,
          created_by text NOT NULL DEFAULT 'guest',
          created_at timestamptz NOT NULL DEFAULT now(),
          review_count integer NOT NULL DEFAULT 0,
          avg_taste numeric(2, 1) NOT NULL DEFAULT 0,
          avg_hygiene numeric(2, 1) NOT NULL DEFAULT 0,
          avg_service numeric(2, 1) NOT NULL DEFAULT 0,
          avg_overall numeric(2, 1) NOT NULL DEFAULT 0,
          address text,
          photo_url text,
          latitude double precision,
          longitude double precision
        );

        CREATE TABLE IF NOT EXISTS reviews (
          id text PRIMARY KEY,
          restaurant_id text NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
          user_id text NOT NULL,
          user_display_name text NOT NULL,
          taste_rating integer NOT NULL CHECK (taste_rating BETWEEN 1 AND 5),
          hygiene_rating integer NOT NULL CHECK (hygiene_rating BETWEEN 1 AND 5),
          service_rating integer NOT NULL CHECK (service_rating BETWEEN 1 AND 5),
          comment text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz
        );

        CREATE TABLE IF NOT EXISTS edit_tokens (
          resource_type text NOT NULL CHECK (resource_type IN ('restaurant', 'review')),
          resource_id text NOT NULL,
          token text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (resource_type, resource_id)
        );

        CREATE TABLE IF NOT EXISTS orders (
          id text PRIMARY KEY,
          customer_name text NOT NULL,
          phone text NOT NULL,
          note text,
          mode text NOT NULL CHECK (mode IN ('delivery', 'pickup')),
          status text NOT NULL DEFAULT 'new',
          subtotal integer NOT NULL,
          service_fee integer NOT NULL,
          total integer NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS order_items (
          id text PRIMARY KEY,
          order_id text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          dish_id text NOT NULL,
          name text NOT NULL,
          price integer NOT NULL,
          qty integer NOT NULL CHECK (qty > 0),
          line_total integer NOT NULL
        );

        CREATE TABLE IF NOT EXISTS destinations (
          id text PRIMARY KEY,
          name text NOT NULL,
          region text NOT NULL,
          type text NOT NULL,
          season text NOT NULL,
          highlights text[] NOT NULL DEFAULT '{}',
          suggested_duration_hours integer NOT NULL CHECK (suggested_duration_hours > 0),
          latitude double precision,
          longitude double precision,
          created_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS social_likes (
          id text PRIMARY KEY,
          resource_type text NOT NULL,
          resource_id text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS social_comments (
          id text PRIMARY KEY,
          resource_type text NOT NULL,
          resource_id text NOT NULL,
          user_display_name text NOT NULL,
          comment text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS social_shares (
          id text PRIMARY KEY,
          resource_type text NOT NULL,
          resource_id text NOT NULL,
          channel text NOT NULL DEFAULT 'internal',
          note text,
          created_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS product_backlog (
          id text PRIMARY KEY,
          title text NOT NULL,
          domain text NOT NULL CHECK (domain IN ('food', 'tourism', 'platform')),
          target text NOT NULL CHECK (target IN ('web', 'app', 'both')),
          priority text NOT NULL CHECK (priority IN ('fire3', 'fire2', 'fire1', 'watch')),
          status text NOT NULL CHECK (status IN ('idea', 'planned', 'doing', 'done')) DEFAULT 'idea',
          source text NOT NULL DEFAULT 'research',
          evidence text[] NOT NULL DEFAULT '{}',
          created_at timestamptz NOT NULL DEFAULT now()
        );

        ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS latitude double precision;
        ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS longitude double precision;
        ALTER TABLE destinations ADD COLUMN IF NOT EXISTS latitude double precision;
        ALTER TABLE destinations ADD COLUMN IF NOT EXISTS longitude double precision;
      `);
      await seedPostgresFromJson(pool, dataFilePath);
      await seedPostgresTourism(pool);
      await ensurePostgresLocationDefaults(pool);
    },
    async getRestaurants() {
      const { rows } = await pool.query('SELECT * FROM restaurants ORDER BY avg_overall DESC, created_at DESC');
      return rows.map(toRestaurant);
    },
    async getRestaurant(id) {
      const { rows } = await pool.query('SELECT * FROM restaurants WHERE id = $1', [id]);
      return rows[0] ? toRestaurant(rows[0]) : null;
    },
    async getReviews(restaurantId) {
      const { rows } = await pool.query('SELECT * FROM reviews WHERE restaurant_id = $1 ORDER BY created_at DESC', [restaurantId]);
      return rows.map(toReview);
    },
    async getOrders() {
      const orders = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
      if (orders.rows.length === 0) {
        return [];
      }

      const orderIds = orders.rows.map((order) => order.id);
      const items = await pool.query('SELECT * FROM order_items WHERE order_id = ANY($1) ORDER BY name ASC', [orderIds]);
      const itemsByOrder = new Map();

      for (const item of items.rows) {
        const current = itemsByOrder.get(item.order_id) ?? [];
        current.push(toOrderItem(item));
        itemsByOrder.set(item.order_id, current);
      }

      return orders.rows.map((order) => toOrder(order, itemsByOrder.get(order.id) ?? []));
    },
    async getNearby(options) {
      const [restaurants, destinations] = await Promise.all([
        this.getRestaurants(),
        this.getTourismDestinations()
      ]);
      return buildNearbyResult({
        ...options,
        restaurants,
        destinations: destinations.destinations
      });
    },
    async getTourismDestinations() {
      const { rows } = await pool.query('SELECT * FROM destinations ORDER BY suggested_duration_hours ASC, name ASC');
      return {
        status: 'active',
        destinations: rows.map(toDestination)
      };
    },
    async getSocialSummary(resourceType, resourceId) {
      const [likes, commentsCount, shares, comments] = await Promise.all([
        pool.query('SELECT COUNT(*)::int AS count FROM social_likes WHERE resource_type = $1 AND resource_id = $2', [resourceType, resourceId]),
        pool.query('SELECT COUNT(*)::int AS count FROM social_comments WHERE resource_type = $1 AND resource_id = $2', [resourceType, resourceId]),
        pool.query('SELECT COUNT(*)::int AS count FROM social_shares WHERE resource_type = $1 AND resource_id = $2', [resourceType, resourceId]),
        pool.query(
          `
            SELECT *
            FROM social_comments
            WHERE resource_type = $1 AND resource_id = $2
            ORDER BY created_at DESC
            LIMIT 10
          `,
          [resourceType, resourceId]
        )
      ]);

      return {
        resourceType,
        resourceId,
        likeCount: likes.rows[0].count,
        commentCount: commentsCount.rows[0].count,
        shareCount: shares.rows[0].count,
        comments: comments.rows.map(toSocialComment)
      };
    },
    async addSocialLike(resourceType, resourceId) {
      await pool.query(
        'INSERT INTO social_likes (id, resource_type, resource_id) VALUES ($1, $2, $3)',
        [randomUUID(), resourceType, resourceId]
      );
      return this.getSocialSummary(resourceType, resourceId);
    },
    async addSocialComment(resourceType, resourceId, input) {
      const { rows } = await pool.query(
        `
          INSERT INTO social_comments (id, resource_type, resource_id, user_display_name, comment)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `,
        [randomUUID(), resourceType, resourceId, input.userDisplayName.trim(), input.comment.trim()]
      );
      return {
        comment: toSocialComment(rows[0]),
        summary: await this.getSocialSummary(resourceType, resourceId)
      };
    },
    async addSocialShare(resourceType, resourceId, input) {
      await pool.query(
        `
          INSERT INTO social_shares (id, resource_type, resource_id, channel, note)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [randomUUID(), resourceType, resourceId, input.channel?.trim() || 'internal', input.note ? input.note.trim() : null]
      );
      return this.getSocialSummary(resourceType, resourceId);
    },
    async getBacklogItems() {
      const { rows } = await pool.query('SELECT * FROM product_backlog ORDER BY created_at DESC');
      return rows.map(toBacklogItem);
    },
    async createBacklogItem(input) {
      const { rows } = await pool.query(
        `
          INSERT INTO product_backlog (id, title, domain, target, priority, status, source, evidence)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `,
        [
          randomUUID(),
          input.title.trim(),
          input.domain,
          input.target,
          input.priority,
          input.status || 'idea',
          input.source || 'research',
          Array.isArray(input.evidence) ? input.evidence.slice(0, 8) : []
        ]
      );
      return toBacklogItem(rows[0]);
    },
    async updateBacklogStatus(id, status) {
      const { rows } = await pool.query(
        `
          UPDATE product_backlog
          SET status = $2
          WHERE id = $1
          RETURNING *
        `,
        [id, status]
      );
      if (!rows[0]) {
        return { status: 'not_found' };
      }
      return { status: 'ok', item: toBacklogItem(rows[0]) };
    },
    async createOrder(input) {
      const id = randomUUID();
      const items = input.items.map((item) => ({
        id: randomUUID(),
        dishId: item.dishId,
        name: item.name.trim(),
        price: item.price,
        qty: item.qty,
        lineTotal: item.price * item.qty
      }));
      const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
      const serviceFee = input.mode === 'pickup' || subtotal === 0 ? 0 : 5000;
      const total = subtotal + serviceFee;
      const client = await pool.connect();

      try {
        await client.query('BEGIN');
        const insertedOrder = await client.query(
          `
            INSERT INTO orders (id, customer_name, phone, note, mode, status, subtotal, service_fee, total)
            VALUES ($1, $2, $3, $4, $5, 'new', $6, $7, $8)
            RETURNING *
          `,
          [id, input.customerName.trim(), input.phone.trim(), input.note ? input.note.trim() : null, input.mode, subtotal, serviceFee, total]
        );

        for (const item of items) {
          await client.query(
            `
              INSERT INTO order_items (id, order_id, dish_id, name, price, qty, line_total)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
            `,
            [item.id, id, item.dishId, item.name, item.price, item.qty, item.lineTotal]
          );
        }

        await client.query('COMMIT');
        return toOrder(insertedOrder.rows[0], items);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    async createRestaurant(input) {
      const id = randomUUID();
      const editToken = randomUUID();
      const client = await pool.connect();

      try {
        await client.query('BEGIN');
        const { rows } = await client.query(
          `
            INSERT INTO restaurants (id, name, city, district, category, created_by, address, latitude, longitude)
            VALUES ($1, $2, $3, $4, $5, 'guest', $6, $7, $8)
            RETURNING *
          `,
          [
            id,
            input.name.trim(),
            input.city.trim(),
            input.district.trim(),
            input.category.trim(),
            input.address ? input.address.trim() : null,
            DEFAULT_RESTAURANT_LOCATION.latitude,
            DEFAULT_RESTAURANT_LOCATION.longitude
          ]
        );
        await client.query('INSERT INTO edit_tokens (resource_type, resource_id, token) VALUES ($1, $2, $3)', ['restaurant', id, editToken]);
        await client.query('COMMIT');
        return { ...toRestaurant(rows[0]), editToken };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    async updateRestaurant(id, input, editToken) {
      const token = await pool.query('SELECT token FROM edit_tokens WHERE resource_type = $1 AND resource_id = $2', ['restaurant', id]);
      const existing = await this.getRestaurant(id);
      if (!existing) return { status: 'not_found' };
      if (token.rows[0]?.token !== editToken) return { status: 'forbidden' };

      const updated = {
        name: input.name?.trim() ?? existing.name,
        city: input.city?.trim() ?? existing.city,
        district: input.district?.trim() ?? existing.district,
        category: input.category?.trim() ?? existing.category,
        address: input.address === undefined ? existing.address : input.address ? input.address.trim() : null
      };
      const { rows } = await pool.query(
        `
          UPDATE restaurants
          SET name = $2, city = $3, district = $4, category = $5, address = $6
          WHERE id = $1
          RETURNING *
        `,
        [id, updated.name, updated.city, updated.district, updated.category, updated.address]
      );
      return { status: 'ok', restaurant: toRestaurant(rows[0]) };
    },
    async deleteRestaurant(id, editToken) {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        const existing = await client.query('SELECT id FROM restaurants WHERE id = $1', [id]);
        if (!existing.rows[0]) {
          await client.query('ROLLBACK');
          return { status: 'not_found' };
        }

        const token = await client.query('SELECT token FROM edit_tokens WHERE resource_type = $1 AND resource_id = $2', ['restaurant', id]);
        if (token.rows[0]?.token !== editToken) {
          await client.query('ROLLBACK');
          return { status: 'forbidden' };
        }

        await client.query(
          `
            DELETE FROM edit_tokens
            WHERE (resource_type = 'restaurant' AND resource_id = $1)
               OR (resource_type = 'review' AND resource_id IN (
                    SELECT id FROM reviews WHERE restaurant_id = $1
                  ))
          `,
          [id]
        );
        await client.query('DELETE FROM restaurants WHERE id = $1', [id]);
        await client.query('COMMIT');
        return { status: 'ok' };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    async createReview(restaurantId, input) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const restaurant = await client.query('SELECT id FROM restaurants WHERE id = $1', [restaurantId]);
        if (!restaurant.rows[0]) {
          await client.query('ROLLBACK');
          return { status: 'not_found' };
        }

        const id = randomUUID();
        const editToken = randomUUID();
        const inserted = await client.query(
          `
            INSERT INTO reviews (
              id, restaurant_id, user_id, user_display_name, taste_rating,
              hygiene_rating, service_rating, comment
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
          `,
          [
            id,
            restaurantId,
            `guest-${randomUUID()}`,
            input.userDisplayName.trim(),
            input.tasteRating,
            input.hygieneRating,
            input.serviceRating,
            input.comment.trim()
          ]
        );
        await client.query('INSERT INTO edit_tokens (resource_type, resource_id, token) VALUES ($1, $2, $3)', ['review', id, editToken]);
        const updatedRestaurant = await recalculatePgRestaurant(client, restaurantId);
        await client.query('COMMIT');
        return { status: 'ok', review: { ...toReview(inserted.rows[0]), editToken }, restaurant: updatedRestaurant };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    async deleteReview(restaurantId, reviewId, editToken) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const restaurant = await client.query('SELECT id FROM restaurants WHERE id = $1', [restaurantId]);
        if (!restaurant.rows[0]) {
          await client.query('ROLLBACK');
          return { status: 'not_found_restaurant' };
        }

        const review = await client.query('SELECT id FROM reviews WHERE id = $1 AND restaurant_id = $2', [reviewId, restaurantId]);
        if (!review.rows[0]) {
          await client.query('ROLLBACK');
          return { status: 'not_found_review' };
        }

        const token = await client.query('SELECT token FROM edit_tokens WHERE resource_type = $1 AND resource_id = $2', ['review', reviewId]);
        if (token.rows[0]?.token !== editToken) {
          await client.query('ROLLBACK');
          return { status: 'forbidden' };
        }

        await client.query('DELETE FROM reviews WHERE id = $1', [reviewId]);
        await client.query('DELETE FROM edit_tokens WHERE resource_type = $1 AND resource_id = $2', ['review', reviewId]);
        const updatedRestaurant = await recalculatePgRestaurant(client, restaurantId);
        await client.query('COMMIT');
        return { status: 'ok', restaurant: updatedRestaurant };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  };
}

export function createStorage({ dataFilePath = path.join(process.cwd(), 'data', 'restaurants.json') } = {}) {
  if (process.env.DATABASE_URL) {
    return createPostgresStorage(process.env.DATABASE_URL, dataFilePath);
  }
  return createJsonStorage(dataFilePath);
}
