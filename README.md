# Restaurant Project Starter

This workspace contains two starter options:

- Next.js frontend: [frontend](frontend)
- JavaScript: [js](js)
- Flutter: [flutter_app](flutter_app)

## Next.js frontend

Run the API first:

```bash
cd js
npm start
```

Then run the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:3002
```

The frontend also includes a tourism preview page for the next product domain:

```text
http://localhost:3002/tourism
```

The web app includes a social research workspace for pasted Facebook post/comment text:

```text
http://localhost:3002/research
```

Saved research insights can be managed on the backlog board:

```text
http://localhost:3002/backlog
```

## JavaScript

Run:

```bash
cd js
npm start
```

By default the API uses the JSON seed file for local development. To use PostgreSQL, set `DATABASE_URL` in `js/.env`:

```env
PORT=3001
DATABASE_URL=postgres://postgres:postgres@localhost:5432/restaurant
PGSSL=false
```

On startup the API creates the needed PostgreSQL tables and seeds restaurants from `js/data/restaurants.json` when the database is empty.
It also creates and seeds the tourism `destinations` table for the next product domain.

The API also stores checkout orders in PostgreSQL:

- `POST /api/orders`
- `GET /api/orders`

Domain planning endpoints:

- `GET /api/domains`
- `GET /api/tourism/destinations`
- `GET /api/location/nearby?lat=:lat&lng=:lng&radiusKm=25&type=all|restaurants|destinations`

Internal social interaction endpoints:

- `GET /api/social/:resourceType/:resourceId`
- `POST /api/social/:resourceType/:resourceId/likes`
- `POST /api/social/:resourceType/:resourceId/comments`
- `POST /api/social/:resourceType/:resourceId/shares`

Facebook feed endpoint:

- `GET /api/facebook/feed?sourceId=:id&sourceType=page|group&keywords=хоол,амралт&limit=30`

Product backlog endpoints:

- `GET /api/backlog`
- `POST /api/backlog`
- `PATCH /api/backlog/:id`

Configure it in `js/.env`:

```env
FACEBOOK_GRAPH_VERSION=v25.0
FACEBOOK_ACCESS_TOKEN=your_facebook_access_token_here
FACEBOOK_SOURCE_TYPE=page
FACEBOOK_SOURCE_ID=your_page_or_group_id_here
```

If you use Docker, start PostgreSQL with:

```bash
docker compose up -d postgres
```

Then restart the API:

```bash
cd js
npm start
```

## Flutter

Run after installing Flutter SDK:

```bash
cd flutter_app
flutter pub get
flutter run
```

## OpenAI assistant

1. Create a file named .env in the js folder.
2. Add your key:

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

3. Start the server again:

```bash
cd js
npm start
```

Then open the page and use the AI assistant section.
