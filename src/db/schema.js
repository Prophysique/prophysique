import {
  pgTable,
  serial,
  text,
  integer,
  json,
  timestamp,
} from 'drizzle-orm/pg-core';

// The "articles" table. Rows are written by the GrandRanker webhook
// (src/webhook.js) and read by the /blog pages and /sitemap.xml.
export const articles = pgTable('articles', {
  id: serial('id').primaryKey(),
  externalId: text('external_id').notNull().unique(),
  title: text('title'),
  slug: text('slug').unique(),
  contentHtml: text('content_html'),
  contentMarkdown: text('content_markdown'),
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),
  subtitle: text('subtitle'),
  category: text('category'),
  authorName: text('author_name'),
  imageUrl: text('image_url'),
  readTime: text('read_time'),
  wordCount: integer('word_count'),
  tags: json('tags'),
  faqs: json('faqs'),
  jsonLdSchema: json('json_ld_schema'),
  languageCode: text('language_code'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
