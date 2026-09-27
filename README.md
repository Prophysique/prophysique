# Pro Physique Fitness — Blog

A small server-rendered blog that receives articles from GrandRanker by webhook.

- **Stack:** Node.js + Express, Postgres, Drizzle ORM
- **Pages:** `/blog` (newest first) and `/blog/:slug` — full content and SEO tags are in the initial HTML, so search engines and AI crawlers can read them without JavaScript.
- **Webhook:** `POST /api/articles-webhook` (GET/HEAD return 200 as a health check)
- **SEO:** `/sitemap.xml` (built live from the database) and `/robots.txt` (allows crawling, points to the sitemap)

## Environment variables

| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `GRANDRANKER_SECRET` | Shared webhook key. Set it in your host's secret settings — never in code. |
| `SITE_URL` | Public address with no trailing slash, e.g. `https://blog.example.com`. Used for canonical tags, og:url and the sitemap. |
| `PORT` | Set automatically by most hosts |

The `articles` table is created automatically when the app starts (`src/migrate.js`).

## Deploy on Render

1. In Render, choose **New → Blueprint** and select this repo. `render.yaml` creates the web service and a Postgres database.
2. When asked, paste the GrandRanker key into `GRANDRANKER_SECRET` and your site address into `SITE_URL`.
3. After it deploys, give GrandRanker the webhook URL: `https://<your-site>/api/articles-webhook`.

## Webhook

Send the key in the `X-API-Key` header. Bodies up to 10 MB are accepted.

- `publish_articles` — upserts every item in `data.articles` by `id` (stored as `external_id`). Only the table's columns are saved; other fields such as `author_initials` or `hreflang_tags` are ignored. `publish_date` is stored as `published_at`.
- `unpublish_article` — deletes the article whose `external_id` equals `data.id`.

Responses: `200` on success, `401` for a missing or wrong key, `409` if two different articles use the same slug, `413` for bodies over 10 MB.

## Run locally

```sh
cp .env.example .env   # fill in DATABASE_URL and GRANDRANKER_SECRET
npm install
node --env-file=.env src/server.js
```
