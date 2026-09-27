// Server-side HTML templates for the blog. Everything here is rendered into the
// initial HTML response, so search engines and AI crawlers see the full content
// and meta tags without running any JavaScript.

const SITE_NAME = 'Pro Physique Fitness';

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// JSON inside <script> must not be able to close the tag early.
function safeJsonForScript(value) {
  const data = typeof value === 'string' ? value : JSON.stringify(value);
  return data
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Chicago',
  });
}

function isoDate(date) {
  return date ? new Date(date).toISOString() : '';
}

const styles = `
  :root { --black:#0A0A0A; --gold:#C9A84C; --ink:#1a1a1a; --muted:#5f5f5f; --line:#e7e2d6; --bg:#faf9f6; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:18px/1.7 Georgia, 'Times New Roman', serif; }
  a { color:inherit; }
  .site-header { background:var(--black); border-bottom:3px solid var(--gold); }
  .site-header .wrap { display:flex; align-items:center; justify-content:space-between; padding:18px 20px; }
  .brand { color:#fff; text-decoration:none; font:700 18px/1 system-ui, -apple-system, 'Segoe UI', sans-serif; letter-spacing:.08em; text-transform:uppercase; }
  .brand span { color:var(--gold); }
  .nav a { color:var(--gold); text-decoration:none; font:600 14px/1 system-ui, sans-serif; letter-spacing:.06em; text-transform:uppercase; }
  .wrap { max-width:760px; margin:0 auto; padding:0 20px; }
  .page-title { font:800 clamp(32px,6vw,48px)/1.1 system-ui, -apple-system, 'Segoe UI', sans-serif; margin:48px 0 8px; letter-spacing:-.02em; }
  .lede { color:var(--muted); margin:0 0 32px; font-size:18px; }
  .card { display:block; text-decoration:none; padding:28px 0; border-top:1px solid var(--line); }
  .card:hover h2 { color:#8a6d1f; }
  .card img { width:100%; aspect-ratio:16/9; object-fit:cover; border-radius:6px; margin-bottom:16px; background:#eee; }
  .card h2 { font:700 26px/1.25 system-ui, -apple-system, 'Segoe UI', sans-serif; margin:6px 0 8px; transition:color .15s; }
  .card p { margin:0; color:var(--muted); font-size:17px; }
  .meta { font:600 13px/1.4 system-ui, sans-serif; color:var(--muted); letter-spacing:.04em; text-transform:uppercase; }
  .meta .cat { color:#8a6d1f; }
  .empty { padding:40px 0; color:var(--muted); border-top:1px solid var(--line); }
  article header { margin:40px 0 28px; }
  article h1 { font:800 clamp(30px,5.5vw,44px)/1.15 system-ui, -apple-system, 'Segoe UI', sans-serif; margin:10px 0 12px; letter-spacing:-.02em; }
  article .subtitle { font-size:21px; color:var(--muted); margin:0 0 16px; }
  .hero { width:100%; border-radius:8px; margin:0 0 32px; }
  .content img, .content video, .content iframe { max-width:100%; height:auto; }
  .content h2, .content h3 { font-family:system-ui, -apple-system, 'Segoe UI', sans-serif; line-height:1.3; margin:1.8em 0 .5em; }
  .content a { color:#8a6d1f; }
  .content blockquote { margin:1.5em 0; padding:.2em 1em; border-left:4px solid var(--gold); color:var(--muted); }
  .content table { width:100%; border-collapse:collapse; display:block; overflow-x:auto; }
  .content th, .content td { border:1px solid var(--line); padding:8px 10px; text-align:left; }
  .content pre { overflow-x:auto; background:#f1efe9; padding:14px; border-radius:6px; }
  .tags { display:flex; flex-wrap:wrap; gap:8px; margin:40px 0 0; padding:0; list-style:none; }
  .tags li { font:600 13px/1 system-ui, sans-serif; border:1px solid var(--gold); color:#8a6d1f; padding:7px 10px; border-radius:99px; }
  .back { display:inline-block; margin:40px 0 0; font:600 15px/1 system-ui, sans-serif; color:#8a6d1f; }
  .site-footer { margin-top:72px; background:var(--black); color:#bdbdbd; font:14px/1.6 system-ui, sans-serif; }
  .site-footer .wrap { padding:28px 20px; }
  .site-footer strong { color:var(--gold); }
`;

function layout({ lang = 'en', head, body }) {
  return `<!doctype html>
<html lang="${escapeHtml(lang || 'en')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${head}
<style>${styles}</style>
</head>
<body>
<header class="site-header"><div class="wrap">
  <a class="brand" href="/blog">Pro <span>Physique</span></a>
  <nav class="nav"><a href="/blog">Blog</a></nav>
</div></header>
<main class="wrap">
${body}
</main>
<footer class="site-footer"><div class="wrap">
  <strong>${SITE_NAME}</strong> · Houston, TX
</div></footer>
</body>
</html>`;
}

export function renderBlogIndex({ baseUrl, articles }) {
  const url = `${baseUrl}/blog`;
  const title = `Blog | ${SITE_NAME}`;
  const description = 'Articles on fat loss, nutrition, metabolism and strength for busy professionals from Pro Physique Fitness in Houston.';

  const items = articles.length
    ? articles
        .map((a) => {
          const date = a.publishedAt ?? a.updatedAt;
          return `<a class="card" href="/blog/${encodeURIComponent(a.slug)}">
  ${a.imageUrl ? `<img src="${escapeHtml(a.imageUrl)}" alt="" loading="lazy">` : ''}
  <div class="meta">${a.category ? `<span class="cat">${escapeHtml(a.category)}</span> · ` : ''}<time datetime="${isoDate(date)}">${formatDate(date)}</time>${a.readTime ? ` · ${escapeHtml(a.readTime)}` : ''}</div>
  <h2>${escapeHtml(a.title || 'Untitled')}</h2>
  ${a.subtitle || a.metaDescription ? `<p>${escapeHtml(a.subtitle || a.metaDescription)}</p>` : ''}
</a>`;
        })
        .join('\n')
    : '<p class="empty">No articles yet — check back soon.</p>';

  return layout({
    head: `<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(url)}">`,
    body: `<h1 class="page-title">The Pro Physique Blog</h1>
<p class="lede">Practical coaching on getting lean and strong — without living in the gym.</p>
${items}`,
  });
}

export function renderArticle({ baseUrl, article: a }) {
  const url = `${baseUrl}/blog/${encodeURIComponent(a.slug)}`;
  const title = a.metaTitle || a.title || SITE_NAME;
  const description = a.metaDescription || a.subtitle || '';
  const date = a.publishedAt ?? a.updatedAt;
  const tags = Array.isArray(a.tags) ? a.tags.filter((t) => typeof t === 'string' && t.trim()) : [];

  const head = [
    `<title>${escapeHtml(title)}</title>`,
    description && `<meta name="description" content="${escapeHtml(description)}">`,
    `<link rel="canonical" href="${escapeHtml(url)}">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:site_name" content="${SITE_NAME}">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    description && `<meta property="og:description" content="${escapeHtml(description)}">`,
    a.imageUrl && `<meta property="og:image" content="${escapeHtml(a.imageUrl)}">`,
    `<meta property="og:url" content="${escapeHtml(url)}">`,
    a.publishedAt && `<meta property="article:published_time" content="${isoDate(a.publishedAt)}">`,
    a.updatedAt && `<meta property="article:modified_time" content="${isoDate(a.updatedAt)}">`,
    `<meta name="twitter:card" content="${a.imageUrl ? 'summary_large_image' : 'summary'}">`,
    `<meta name="twitter:title" content="${escapeHtml(title)}">`,
    description && `<meta name="twitter:description" content="${escapeHtml(description)}">`,
    a.imageUrl && `<meta name="twitter:image" content="${escapeHtml(a.imageUrl)}">`,
    a.jsonLdSchema != null && `<script type="application/ld+json">${safeJsonForScript(a.jsonLdSchema)}</script>`,
  ]
    .filter(Boolean)
    .join('\n');

  const body = `<article>
<header>
  <div class="meta">${a.category ? `<span class="cat">${escapeHtml(a.category)}</span> · ` : ''}<time datetime="${isoDate(date)}">${formatDate(date)}</time>${a.readTime ? ` · ${escapeHtml(a.readTime)}` : ''}</div>
  <h1>${escapeHtml(a.title || 'Untitled')}</h1>
  ${a.subtitle ? `<p class="subtitle">${escapeHtml(a.subtitle)}</p>` : ''}
  ${a.authorName ? `<div class="meta">By ${escapeHtml(a.authorName)}</div>` : ''}
</header>
${a.imageUrl ? `<img class="hero" src="${escapeHtml(a.imageUrl)}" alt="${escapeHtml(a.title || '')}">` : ''}
<div class="content">
${a.contentHtml || ''}
</div>
${tags.length ? `<ul class="tags">${tags.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>` : ''}
<a class="back" href="/blog">← All articles</a>
</article>`;

  return layout({ lang: a.languageCode, head, body });
}

export function renderNotFound() {
  return layout({
    head: `<title>Page not found | ${SITE_NAME}</title>
<meta name="robots" content="noindex">`,
    body: `<h1 class="page-title">Page not found</h1>
<p class="lede">That article doesn't exist or has been removed.</p>
<a class="back" href="/blog">← Back to the blog</a>`,
  });
}

export function renderSitemap({ baseUrl, articles }) {
  const xmlEscape = (s) => escapeHtml(s).replace(/&#39;/g, '&apos;');
  const latest = articles.reduce((max, a) => (a.updatedAt && (!max || a.updatedAt > max) ? a.updatedAt : max), null);

  const urls = [
    `  <url>\n    <loc>${xmlEscape(`${baseUrl}/blog`)}</loc>${latest ? `\n    <lastmod>${isoDate(latest)}</lastmod>` : ''}\n  </url>`,
    ...articles.map(
      (a) =>
        `  <url>\n    <loc>${xmlEscape(`${baseUrl}/blog/${encodeURIComponent(a.slug)}`)}</loc>${
          a.updatedAt ? `\n    <lastmod>${isoDate(a.updatedAt)}</lastmod>` : ''
        }\n  </url>`
    ),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}
