import express from 'express';
import { desc, eq, isNotNull, sql } from 'drizzle-orm';
import { db, schema } from './db/index.js';
import { migrate } from './migrate.js';
import { webhookRouter } from './webhook.js';
import { renderArticle, renderBlogIndex, renderNotFound, renderSitemap } from './views.js';

const { articles } = schema;
const app = express();

// Hosts like Render and Railway sit behind a proxy; this makes req.protocol report https.
app.set('trust proxy', true);
app.disable('x-powered-by');

// Public site address used in canonical tags, og:url and the sitemap.
// Set SITE_URL (e.g. https://blog.prophysique.com) in production; otherwise the request's host is used.
function baseUrl(req) {
  const configured = process.env.SITE_URL?.trim().replace(/\/+$/, '');
  return configured || `${req.protocol}://${req.get('host')}`;
}

const newestFirst = [sql`${articles.publishedAt} DESC NULLS LAST`, desc(articles.updatedAt)];

// ── Webhook (GrandRanker → articles table) ──────────────────────────────────
app.use('/api/articles-webhook', webhookRouter);

// ── Sitemap and robots.txt (registered before any catch-all) ────────────────
app.get('/sitemap.xml', async (req, res, next) => {
  try {
    const rows = await db
      .select({ slug: articles.slug, updatedAt: articles.updatedAt })
      .from(articles)
      .where(isNotNull(articles.slug))
      .orderBy(...newestFirst);
    res.type('application/xml').set('Cache-Control', 'public, max-age=300').send(renderSitemap({ baseUrl: baseUrl(req), articles: rows }));
  } catch (err) {
    next(err);
  }
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${baseUrl(req)}/sitemap.xml\n`);
});

// ── Blog pages (server-rendered) ────────────────────────────────────────────
app.get('/', (req, res) => res.redirect(302, '/blog'));

app.get('/blog', async (req, res, next) => {
  try {
    const rows = await db
      .select({
        slug: articles.slug,
        title: articles.title,
        subtitle: articles.subtitle,
        metaDescription: articles.metaDescription,
        category: articles.category,
        imageUrl: articles.imageUrl,
        readTime: articles.readTime,
        publishedAt: articles.publishedAt,
        updatedAt: articles.updatedAt,
      })
      .from(articles)
      .where(isNotNull(articles.slug))
      .orderBy(...newestFirst);
    res.type('html').send(renderBlogIndex({ baseUrl: baseUrl(req), articles: rows }));
  } catch (err) {
    next(err);
  }
});

app.get('/blog/:slug', async (req, res, next) => {
  try {
    const [article] = await db.select().from(articles).where(eq(articles.slug, req.params.slug)).limit(1);
    if (!article) {
      return res.status(404).type('html').send(renderNotFound());
    }
    res.type('html').send(renderArticle({ baseUrl: baseUrl(req), article }));
  } catch (err) {
    next(err);
  }
});

// ── Everything else: a real 404, never a 200 fallback page ─────────────────
app.use((req, res) => {
  res.status(404).type('html').send(renderNotFound());
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).type('text/plain').send('Something went wrong.');
});

const port = Number(process.env.PORT) || 3000;

migrate()
  .then(() => {
    app.listen(port, () => {
      console.log(`Pro Physique blog listening on port ${port}`);
      if (!process.env.GRANDRANKER_SECRET) {
        console.warn('Warning: GRANDRANKER_SECRET is not set — the webhook will reject every POST with 401.');
      }
    });
  })
  .catch((err) => {
    console.error('Could not prepare the database:', err);
    process.exit(1);
  });
