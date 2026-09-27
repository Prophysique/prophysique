import { fileURLToPath } from 'node:url';
import { pool } from './db/index.js';

// Creates the "articles" table if it doesn't exist yet. Safe to run on every start.
// Kept in sync with src/db/schema.js.
export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS articles (
      id                serial PRIMARY KEY,
      external_id       text NOT NULL UNIQUE,
      title             text,
      slug              text UNIQUE,
      content_html      text,
      content_markdown  text,
      meta_title        text,
      meta_description  text,
      subtitle          text,
      category          text,
      author_name       text,
      image_url         text,
      read_time         text,
      word_count        integer,
      tags              json,
      faqs              json,
      json_ld_schema    json,
      language_code     text,
      published_at      timestamptz,
      updated_at        timestamptz DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS articles_published_at_idx ON articles (published_at DESC);
  `);
}

// Allow `npm run migrate` to run this file directly.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate()
    .then(() => {
      console.log('Migration complete: "articles" table is ready.');
      return pool.end();
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
