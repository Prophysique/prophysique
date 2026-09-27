import crypto from 'node:crypto';
import express from 'express';
import { eq } from 'drizzle-orm';
import { db, schema } from './db/index.js';

const { articles } = schema;

// Constant-time comparison so the key can't be guessed via response timing.
function keyMatches(provided) {
  const expected = process.env.GRANDRANKER_SECRET;
  if (!expected || typeof provided !== 'string') return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const str = (v) => (v === undefined || v === null || v === '' ? null : String(v));

function toInt(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function toDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// JSON columns: accept objects/arrays as-is; accept JSON given as a string.
function toJson(v) {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'string') {
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }
  return v;
}

// Build a row from ONLY the table's columns. Every other field in the payload
// (author_initials, hreflang_tags, …) is deliberately ignored.
export function rowFromItem(item) {
  return {
    externalId: String(item.id),
    title: str(item.title),
    slug: str(item.slug),
    contentHtml: str(item.content_html),
    contentMarkdown: str(item.content_markdown),
    metaTitle: str(item.meta_title),
    metaDescription: str(item.meta_description),
    subtitle: str(item.subtitle),
    category: str(item.category),
    authorName: str(item.author_name),
    imageUrl: str(item.image_url),
    readTime: str(item.read_time),
    wordCount: toInt(item.word_count),
    tags: toJson(item.tags),
    faqs: toJson(item.faqs),
    jsonLdSchema: toJson(item.json_ld_schema),
    languageCode: str(item.language_code),
    publishedAt: toDate(item.publish_date),
    updatedAt: toDate(item.updated_at) ?? new Date(),
  };
}

export const webhookRouter = express.Router();

// Health check: GET and HEAD always answer 200 (Express answers HEAD from the GET handler).
webhookRouter.get('/', (req, res) => {
  res.status(200).json({ ok: true, service: 'articles-webhook' });
});

webhookRouter.post(
  '/',
  // Check the key BEFORE reading a potentially 10 MB body.
  (req, res, next) => {
    if (!keyMatches(req.get('X-API-Key'))) {
      if (!process.env.GRANDRANKER_SECRET) {
        console.error('GRANDRANKER_SECRET is not set; rejecting webhook request.');
      }
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  },
  // Full articles include their HTML, so allow bodies up to 10 MB.
  // type: () => true parses JSON even if the sender omits the Content-Type header.
  express.json({ limit: '10mb', type: () => true }),
  async (req, res) => {
    const body = req.body ?? {};
    const eventType = body.event_type;

    try {
      if (eventType === 'publish_articles') {
        const items = Array.isArray(body.data?.articles) ? body.data.articles : [];
        const rows = items.filter((item) => item && item.id !== undefined && item.id !== null).map(rowFromItem);

        if (rows.length !== items.length) {
          return res.status(400).json({ error: 'Every article needs an "id".' });
        }

        await db.transaction(async (tx) => {
          for (const row of rows) {
            const { externalId, ...rest } = row;
            await tx
              .insert(articles)
              .values(row)
              .onConflictDoUpdate({ target: articles.externalId, set: rest });
          }
        });

        return res.status(200).json({ ok: true, upserted: rows.length });
      }

      if (eventType === 'unpublish_article') {
        const id = body.data?.id;
        if (id === undefined || id === null) {
          return res.status(400).json({ error: 'data.id is required.' });
        }
        const deleted = await db
          .delete(articles)
          .where(eq(articles.externalId, String(id)))
          .returning({ id: articles.id });
        return res.status(200).json({ ok: true, deleted: deleted.length });
      }

      // Unknown events (e.g. a connection test) are acknowledged but do nothing.
      return res.status(200).json({ ok: true, ignored: true, event_type: eventType ?? null });
    } catch (err) {
      // Postgres unique violation — most likely two different articles sharing a slug.
      if (err?.code === '23505' || err?.cause?.code === '23505') {
        console.error('Webhook conflict:', err.detail || err.cause?.detail || err.message);
        return res.status(409).json({ error: 'Conflict: another article already uses this slug.' });
      }
      console.error('Webhook error:', err);
      return res.status(500).json({ error: 'Internal error' });
    }
  }
);

// Malformed JSON or an over-limit body → clear error instead of an HTML page.
webhookRouter.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Body larger than 10 MB' });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  next(err);
});

