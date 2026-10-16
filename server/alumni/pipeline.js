const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { readJson, writeJson, slugify, DATA_DIR } = require('../store');
const { buildArticle, buildEmail, displayName } = require('./templates');
const { sendMail } = require('../mail/mailer');

const ALUMNI_FILE = 'alumni.json';
const ARTICLES_FILE = 'alumni-articles.json';
const PARENTS_FILE = 'parents.json';
const ROOT = path.join(__dirname, '..', '..');
const VYPUSK_DIR = path.join(ROOT, 'vypusknyky');

function siteUrl() {
  return (process.env.SITE_URL || 'http://127.0.0.1:5180').replace(/\/$/, '');
}

function loadAlumni() {
  return readJson(ALUMNI_FILE, { meta: {}, items: [] });
}

function saveAlumni(data) {
  data.meta = { ...(data.meta || {}), updatedAt: new Date().toISOString() };
  writeJson(ALUMNI_FILE, data);
}

function loadArticles() {
  return readJson(ARTICLES_FILE, { items: [] });
}

function saveArticles(data) {
  writeJson(ARTICLES_FILE, data);
}

function loadParents() {
  return readJson(PARENTS_FILE, { items: [] });
}

function nextQueued(items) {
  return items.find((a) => a.status === 'queued');
}

function ensureVypuskIndex(articles) {
  if (!fs.existsSync(VYPUSK_DIR)) fs.mkdirSync(VYPUSK_DIR, { recursive: true });
  const published = articles.items
    .filter((a) => a.status === 'published')
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));

  const list = published
    .map(
      (a) =>
        `<li><a href="/vypusknyky/${escapeHtml(a.slug)}/">${escapeHtml(
          a.title
        )}</a> <span class="muted">${escapeHtml(a.publishedAt?.slice(0, 10) || '')}</span></li>`
    )
    .join('\n') || '<li>Поки немає публікацій — запустіть <code>npm run alumni:weekly</code>.</li>';

  const html = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Випускники тижня — Ступені</title>
  <link rel="stylesheet" href="/wp-content/themes/waldorf/style.css">
  <style>
    .alumni-index { max-width: 720px; margin: 2rem auto; padding: 1rem 1.5rem 3rem; }
    .alumni-index ul { line-height: 1.8; padding-left: 1.25rem; }
    .muted { color: #777; font-size: 0.9rem; }
    .alumni-nav { margin: 1rem 1.5rem; display: flex; gap: 1rem; flex-wrap: wrap; }
  </style>
</head>
<body>
  <nav class="alumni-nav">
    <a class="btn orange" href="/">← На головну</a>
    <a class="btn" href="/batky/">Реєстрація для батьків</a>
  </nav>
  <main class="alumni-index">
    <h1>Випускники вальдорфських шкіл</h1>
    <p>Раз на тиждень ми коротко знайомимо спільноту з людьми, які навчалися у вальдорфських (Steiner) школах світу.</p>
    <ul>
${list}
    </ul>
    <p class="muted">Джерело каталогу імен: <a href="https://www.thewaldorfs.waldorf.net/" target="_blank" rel="noopener">theWaldorfs</a>.</p>
  </main>
</body>
</html>`;

  fs.writeFileSync(path.join(VYPUSK_DIR, 'index.html'), html, 'utf8');
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Один тижневий цикл: стаття + розсилка.
 * @param {{ dryRun?: boolean }} opts
 */
async function runWeeklyCycle(opts = {}) {
  const dryRun = Boolean(opts.dryRun);
  const alumniData = loadAlumni();
  const alumni = nextQueued(alumniData.items);

  if (!alumni) {
    return {
      ok: false,
      error: 'Немає випускників у черзі (status=queued). Запустіть npm run alumni:seed',
    };
  }

  const baseSlug = slugify(
    `${alumni.firstName || ''}-${alumni.lastName || ''}-vypusknyk`
  );
  const slug = `${baseSlug}-${new Date().toISOString().slice(0, 10)}`;
  const article = buildArticle({ alumni, siteUrl: siteUrl() });
  const articleUrl = `${siteUrl()}/vypusknyky/${slug}/`;

  const articleRecord = {
    id: uuidv4(),
    alumniId: alumni.id,
    slug,
    title: article.title,
    excerpt: article.excerpt,
    body: article.bodyHtml,
    sourceUrl: alumni.sourceUrl || '',
    status: 'published',
    publishedAt: new Date().toISOString(),
  };

  if (!dryRun) {
    const dir = path.join(VYPUSK_DIR, slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), article.htmlPage, 'utf8');

    const articles = loadArticles();
    articles.items.unshift(articleRecord);
    saveArticles(articles);
    ensureVypuskIndex(articles);

    alumni.status = 'published';
    alumni.publishedAt = articleRecord.publishedAt;
    alumni.articleSlug = slug;
    saveAlumni(alumniData);
  }

  const parents = loadParents().items.filter(
    (p) => p.status === 'active' && p.consentNewsletter !== false
  );

  const mailResults = [];
  for (const parent of parents) {
    const unsub = `${siteUrl()}/api/public/parents/unsubscribe?token=${encodeURIComponent(
      parent.unsubscribeToken || ''
    )}`;
    const email = buildEmail({
      alumni,
      articleUrl,
      unsubscribeUrl: unsub,
    });
    if (dryRun) {
      mailResults.push({ to: parent.email, dryRun: true, subject: email.subject });
    } else {
      // eslint-disable-next-line no-await-in-loop
      const r = await sendMail({
        to: parent.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        kind: 'alumni-weekly',
      });
      mailResults.push(r);
    }
  }

  return {
    ok: true,
    dryRun,
    alumni: { id: alumni.id, name: displayName(alumni) },
    article: dryRun
      ? { slug, title: article.title, preview: true }
      : { slug, title: article.title, url: articleUrl },
    mailed: mailResults.length,
    mailResults,
    note:
      parents.length === 0
        ? 'Немає active батьків — листів не надіслано (перевірте реєстрацію /batky/)'
        : undefined,
  };
}

function addAlumni(item) {
  const data = loadAlumni();
  const record = {
    id: item.id || uuidv4(),
    firstName: String(item.firstName || '').trim(),
    lastName: String(item.lastName || '').trim(),
    aka: item.aka || '',
    gender: item.gender || '',
    country: item.country || '',
    continent: item.continent || '',
    occupationalGroup: item.occupationalGroup || '',
    profession: item.profession || '',
    sourceUrl: item.sourceUrl || '',
    profileShort: item.profileShort || '',
    source: item.source || 'manual',
    status: item.status || 'queued',
    publishedAt: null,
    articleSlug: null,
    createdAt: new Date().toISOString(),
  };
  if (!record.firstName && !record.lastName) {
    return { ok: false, error: 'Потрібне ім’я або прізвище' };
  }
  data.items.push(record);
  saveAlumni(data);
  return { ok: true, item: record };
}

function publicPublished() {
  return loadArticles()
    .items.filter((a) => a.status === 'published')
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
}

function publicBySlug(slug) {
  return publicPublished().find((a) => a.slug === slug) || null;
}

module.exports = {
  loadAlumni,
  saveAlumni,
  loadArticles,
  runWeeklyCycle,
  addAlumni,
  publicPublished,
  publicBySlug,
  ensureVypuskIndex,
  siteUrl,
  VYPUSK_DIR,
  DATA_DIR,
};
