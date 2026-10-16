const path = require('path');
const express = require('express');
const {
  ensureDefaultAdmin,
  login,
  authMiddleware,
  requirePermission,
  hasPermission,
} = require('./auth');
const { ensureDirs, UPLOADS_DIR, DATA_DIR } = require('./store');
const { run: seed } = require('./seed-from-catalog');

const newsRoutes = require('./routes/news');
const eventsRoutes = require('./routes/events');
const mediaRoutes = require('./routes/media');
const pagesRoutes = require('./routes/pages');
const navRoutes = require('./routes/nav');
const settingsRoutes = require('./routes/settings');
const usersRoutes = require('./routes/users');
const parentsRoutes = require('./routes/parents');
const alumniRoutes = require('./routes/alumni');
const inboxRoutes = require('./routes/inbox');
const staffRoutes = require('./routes/staff');
const fs = require('fs');

const SITE_URL = (process.env.SITE_URL || 'https://www.waldorf-stupeni.school').replace(/\/$/, '');

const ROOT = path.join(__dirname, '..');
function sendNotFound(req, res) {
  res.status(404);
  if (req.path.startsWith('/api/') || !(req.accepts(['html', 'json']) === 'html')) return res.send('Not found');
  let html = null;
  try {
    html = require('./site-shell').wrapInShell({ title: 'Сторінку не знайдено', urlPath: req.path, bodyHtml: '',
      after: '<div class="levels rel flex st-page st-page--text" id="st-page"><h2>Сторінку не знайдено</h2><div class="st-textcard st-404"><p>На жаль, такої сторінки немає або її перенесли.</p><p><a class="btn orange" href="/">На головну</a> <a class="btn orange" href="/contacts/">Контакти</a></p></div></div>' });
    if (html) html = html.replace('<head>', '<head>\n<meta name="robots" content="noindex">');
  } catch { /* */ }
  return res.type('html').send(html || 'Сторінку не знайдено');
}
const PORT = Number(process.env.PORT) || 5180;

ensureDirs();
ensureDefaultAdmin();
seed(false);

const app = express();
app.use(express.json({ limit: '2mb' }));

// Адмінка та API — не індексувати
app.use(['/admin', '/api'], (_req, res, next) => { res.set('X-Robots-Tag', 'noindex, nofollow'); next(); });

// 301: дублікати сторінок дзеркала -> канонічні адреси з меню
const DUPLICATES = {
  kindergarten: 'school-structure/kindergarten', 'elementary-school': 'school-structure/elementary-school',
  'secondary-school': 'school-structure/secondary-school', 'high-school': 'school-structure/high-school',
  'correctional-treatment-block': 'school-structure/correctional-treatment-block', seminar: 'school-structure/seminar',
  rules: 'about-us/rules', history: 'about-us/history', media: 'about-us/media',
  'methodical-materials': 'about-us/methodical-materials', 'waldorf-pedagogy': 'about-us/waldorf-pedagogy',
};
app.use((req, res, next) => {
  const m = req.path.match(/^\/([a-z-]+)(\/(index\.html)?)?$/);
  if (m && DUPLICATES[m[1]]) return res.redirect(301, '/' + DUPLICATES[m[1]] + '/');
  // INDEX-REDIRECT: /шлях/index.html → /шлях/ для CMS-сторінок, яких немає як файлів (гуртки, школи світу, /p/…)
  if (/\/index\.html$/.test(req.path) && !req.path.startsWith('/admin') && !req.path.startsWith('/api/')) {
    const base = req.path.slice(0, -'index.html'.length);
    let exists = false; try { exists = fs.existsSync(path.join(__dirname, '..', decodeURIComponent(req.path))); } catch { /* */ }
    if (!exists) return res.redirect(301, base + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''));
  }
  // Службові копії WordPress (/r/, /feed/, /comments/) — закрито
  // старі WP-адреси «/r/» (копії випадкового запису в дзеркалі) → список новин
  if (/^(\/[\w-]+)*\/r(\/r)*\/?$/.test(req.path)) return res.redirect(301, '/news/');
  if (/(^|\/)(r|feed|comments|wp-json|xmlrpc\.php)(\/|$)/.test(req.path) && !req.path.startsWith('/api/') && !req.path.startsWith('/admin')) {
    return sendNotFound(req, res);
  }
  next();
});

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(`User-agent: *\nDisallow: /admin/\nDisallow: /api/\nDisallow: /data/\nAllow: /data/uploads/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
});

app.get('/sitemap.xml', (_req, res) => {
  const urls = new Set(['/']);
  const walk = (items) => (items || []).forEach((i) => {
    if (i.href && !i.href.includes('#') && !/^https?:/.test(i.href)) {
      urls.add(('/' + i.href.replace(/^\.?\//, '')).replace(/index\.html$/, ''));
    }
    walk(i.children);
  });
  const nav = navRoutes.load();
  walk(nav.left); walk(nav.right);
  pagesRoutes.load().items.filter((p) => p.cmsManaged).forEach((p) => urls.add('/p/' + p.slug));
  newsRoutes.publicList().forEach((n) => n.slug && urls.add('/p/' + n.slug));
  ['/batky/', '/vypusknyky/'].forEach((u) => urls.add(u));
  const xml = [...urls].sort().map((u) => `  <url><loc>${SITE_URL}${encodeURI(u)}</loc></url>`).join('\n');
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xml}\n</urlset>\n`);
});

// Auth
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const result = login(username, password);
  if (!result) return res.status(401).json({ error: 'Невірний логін або пароль' });
  res.json(result);
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const { loadUsers, publicUser } = require('./auth');
  const data = loadUsers();
  const user = data.users.find((u) => u.id === req.user.sub);
  if (!user) return res.status(401).json({ error: 'Користувача не знайдено' });
  res.json({ user: publicUser(user) });
});

// Public API
app.get('/api/public/news', (_req, res) => {
  res.json({ items: newsRoutes.publicList() });
});
app.get('/api/public/events', (_req, res) => {
  res.json({ items: eventsRoutes.publicList() });
});
app.get('/api/public/gallery', (_req, res) => {
  res.json({ items: mediaRoutes.publicGallery() });
});
app.get('/api/public/nav', (_req, res) => {
  res.json(navRoutes.publicNav());
});
app.get('/api/public/settings', (_req, res) => {
  res.json(settingsRoutes.load());
});
app.get('/api/public/pages/:slug', (req, res) => {
  const page = pagesRoutes.publicBySlug(req.params.slug);
  if (!page) return res.status(404).json({ error: 'Сторінку не знайдено' });
  res.json(page);
});

app.get('/api/public/staff', (_req, res) => res.json({ items: staffRoutes.publicList() }));
app.post('/api/public/contact', inboxRoutes.createPublicHandler('contact'));
app.post('/api/public/applications', inboxRoutes.createPublicHandler('applications'));

// Батьки + випускники (публічні)
app.use('/api/public/parents', parentsRoutes.createPublicRouter());
app.use('/api/public/alumni', alumniRoutes.createPublicRouter());

// Admin API (JWT)
const admin = express.Router();
admin.use(authMiddleware);

admin.use('/news', requirePermission('news'), newsRoutes.createAdminRouter());
admin.use('/events', requirePermission('events'), eventsRoutes.createAdminRouter());
admin.use('/media', requirePermission('media'), mediaRoutes.createAdminRouter());
admin.use('/pages', requirePermission('pages'), pagesRoutes.createAdminRouter());
admin.use('/nav', requirePermission('nav'), navRoutes.createAdminRouter());
admin.use('/settings', requirePermission('settings'), settingsRoutes.createAdminRouter());
admin.use('/parents', requirePermission('settings'), parentsRoutes.createAdminRouter());
admin.use('/alumni', requirePermission('news'), alumniRoutes.createAdminRouter());
admin.use('/staff', requirePermission('pages'), staffRoutes.createAdminRouter());
admin.use('/contact', requirePermission('settings'), inboxRoutes.createAdminRouter('contact'));
admin.use('/applications', requirePermission('settings'), inboxRoutes.createAdminRouter('applications'));
// Зміна власного пароля — усі ролі
admin.post('/me/password', (req, res) => {
  if (!hasPermission(req.user.role, 'password:self') && req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Недостатньо прав' });
  }
  const { changePassword } = require('./auth');
  const result = changePassword(req.user.username, req.body.currentPassword, req.body.newPassword);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ ok: true });
});
admin.use('/users', usersRoutes.createAdminRouter());

// Колекції (книги, документи), редактор сторінок, банери, дашборд
const { createCollection } = require('./routes/collection');
const contentLayer = require('./content');
const books = createCollection({ file: 'books.json', fields: { title: 's', original: 's', author: 's', language: 's', description: 's', cover: 's', links: 'links', available: 'bool', price: 's', order: 'number', visible: 'bool' } });
const documents = createCollection({ file: 'documents.json', fields: { title: 's', section: 's', note: 's', url: 's', order: 'number', visible: 'bool' }, required: ['title', 'url'] });
admin.use('/books', requirePermission('pages'), books.createAdminRouter());
admin.use('/documents', requirePermission('pages'), documents.createAdminRouter());
admin.use('/content', requirePermission('pages'), contentLayer.createAdminRouter());
admin.get('/dashboard', (_req, res) => {
  const { readJson } = require('./store'); const n = (f) => ((readJson(f, { items: [] }).items) || []);
  const unread = (f) => n(f).filter((x) => !x.read && x.status !== 'done' && x.status !== 'processed').length;
  res.json({ counts: { news: n('news.json').length, events: n('events.json').length, media: n('media.json').length, pages: n('pages.json').length, staff: n('staff.json').length, books: n('books.json').length, documents: n('documents.json').length, applications: n('applications.json').length, contact: n('contact-messages.json').length, applicationsNew: unread('applications.json'), contactNew: unread('contact-messages.json') } });
});
require('./schools').mount(app, admin, requirePermission);
require('./clubs').mount(app, admin, requirePermission);
app.use('/api/admin', admin);

// Uploads + data
app.use('/data/uploads', express.static(UPLOADS_DIR));
// Службові дані (users.json, parents.json, mail-log.json …) назовні НЕ віддаються.
// Також не віддаємо серверний код, скрипти, залежності й логи через статику дзеркала.
const PRIVATE_PREFIXES = ['/data', '/server', '/scripts', '/node_modules', '/docs', '/_debug-header'];
const PRIVATE_FILES = new Set(['/package.json', '/package-lock.json', '/debug.log', '/start.bat', '/catalog.json', '/mirror-report.json', '/readme.md']);
app.use((req, res, next) => {
  let p;
  try { p = decodeURIComponent(req.path).replace(/\\/g, '/').toLowerCase(); } catch { return res.status(400).end(); }
  if (PRIVATE_FILES.has(p)) return res.status(404).send('Not found');
  if (PRIVATE_PREFIXES.some((pre) => p === pre || p.startsWith(pre + '/'))) return res.status(404).send('Not found');
  next();
});

// Admin SPA
app.use('/admin', express.static(path.join(ROOT, 'admin')));
app.get('/admin/*', (_req, res) => {
  res.sendFile(path.join(ROOT, 'admin', 'index.html'));
});

function renderDocs(documents) {
  const docs = (documents || []).filter((d) => d && d.url);
  if (!docs.length) return '';
  return `<section class="cms-docs"><h2>Документи</h2><div class="cms-docs-grid">${docs
    .map(
      (d) => `<a class="cms-doc" href="${escapeHtml(d.url)}" target="_blank" rel="noopener">
        <span class="cms-doc-icon">PDF</span>
        <span class="cms-doc-title">${escapeHtml(d.title || 'Документ')}</span>
        <span class="cms-doc-open">Відкрити / завантажити →</span>
      </a>`
    )
    .join('')}</div></section>`;
}

function renderCmsArticle({ title, banner, body, date, documents }) {
  const bannerHtml = banner
    ? `<div class="cms-banner"><img src="${escapeHtml(banner)}" alt=""></div>`
    : '';
  const dateHtml = date ? `<p class="cms-date">${escapeHtml(date)}</p>` : '';
  return `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} — Ступені</title>
  <link rel="stylesheet" href="/wp-content/themes/waldorf/style.css">
  <style>
    .cms-page { max-width: 900px; margin: 2rem auto; padding: 1rem 1.5rem 3rem; }
    .cms-page h1 { margin-bottom: 0.5rem; }
    .cms-date { color: #666; margin-bottom: 1rem; }
    .cms-banner img { width: 100%; height: auto; border-radius: 4px; margin-bottom: 1.5rem; }
    .cms-body { line-height: 1.6; }
    .cms-back { display: inline-block; margin: 1rem 1.5rem; }
    .cms-docs { margin-top: 2rem; }
    .cms-docs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }
    .cms-doc { display: flex; flex-direction: column; gap: .5rem; padding: 1rem; border: 1px solid #e5ddd0; border-radius: 8px; background: #fffaf3; text-decoration: none; color: inherit; transition: box-shadow .2s; }
    .cms-doc:hover { box-shadow: 0 4px 14px rgba(0,0,0,.1); }
    .cms-doc-icon { align-self: flex-start; background: #e8772e; color: #fff; font-weight: 700; padding: .35rem .6rem; border-radius: 4px; font-size: .85rem; }
    .cms-doc-title { font-weight: 600; }
    .cms-doc-open { color: #e8772e; font-size: .9rem; }
  </style>
</head>
<body>
  <a class="cms-back btn orange" href="/">← На головну</a>
  <article class="cms-page">
    <h1>${escapeHtml(title)}</h1>
    ${dateHtml}
    ${bannerHtml}
    <div class="cms-body">${body || ''}</div>
    ${renderDocs(documents)}
  </article>
</body>
</html>`;
}

// Оболонка сайту — спільна (server/site-shell.js)
const { wrapInShell } = require('./site-shell');
function renderInShell({ title, body, documents, slug, date, banner }) {
  const dateHtml = date ? `<p class="muted">${escapeHtml(date)}</p>` : '';
  const bannerHtml = banner ? `<p><img src="${escapeHtml(banner)}" alt="${escapeHtml(title)}"></p>` : '';
  const html = wrapInShell({ title, urlPath: '/p/' + encodeURIComponent(slug), bodyHtml: dateHtml + bannerHtml + (body || '') + renderDocs(documents) });
  return html || renderCmsArticle({ title, banner, body: (body || '') + renderDocs(documents), date });
}

function renderStaff() {
  const items = staffRoutes.publicList();
  if (!items.length) {
    return '<div class="info-pending"><strong>Інформація оновлюється.</strong> Список педагогів з посадами та кваліфікацією буде опубліковано найближчим часом.</div>';
  }
  return `<div class="staff-grid">${items.map((s) => `<div class="staff-card">
    ${s.photo ? `<img src="${escapeHtml(s.photo)}" alt="${escapeHtml(s.name)}" loading="lazy">` : ''}
    <h3>${escapeHtml(s.name)}</h3>
    ${s.role ? `<p><strong>${escapeHtml(s.role)}</strong></p>` : ''}
    ${s.qualification ? `<p>${escapeHtml(s.qualification)}</p>` : ''}
  </div>`).join('')}</div>`;
}

// Dynamic CMS pages + news
app.get('/p/:slug', (req, res) => {
  const page = pagesRoutes.publicBySlug(req.params.slug);
  if (page) {
    const body = page.slug === 'pedahohy' ? (page.body || '') + renderStaff() : page.body;
    const pageStyle = require('./page-style');
    let html = null;
    if (pageStyle.styleable(page.body) && !page.banner) {
      html = wrapInShell({ title: page.title, urlPath: '/p/' + encodeURIComponent(page.slug), bodyHtml: '',
        description: String(page.body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 155) || undefined,
        after: pageStyle.renderStyled({ slug: page.slug, title: page.title, body: page.body,
          extraHtml: page.slug === 'pedahohy' ? renderStaff() : '', docsHtml: renderDocs(page.documents) }) });
    }
    if (!html) html = renderInShell({ title: page.title, banner: page.banner, body, documents: page.documents, slug: page.slug });
    if (/data-site-form/.test(body || '') && !html.includes('/assets/site-forms.js')) {
      html = html.replace('</body>', '<script src="/assets/site-forms.js"></script>\n</body>');
    }
    return res.type('html').send(html);
  }
  const newsItem = newsRoutes.publicList().find((n) => n.slug === req.params.slug);
  if (newsItem) {
    return res.type('html').send(
      renderInShell({
        title: newsItem.title,
        banner: newsItem.cover,
        body: newsItem.body,
        date: newsItem.date,
        slug: newsItem.slug,
      })
    );
  }
  return sendNotFound(req, res);
});

// Static site (mirror) — after API routes
app.use(contentLayer.createMiddleware({ books, documents }));
app.use(express.static(ROOT, { extensions: ['html'] }));

// NOT-FOUND-PAGE: оформлена сторінка 404 у стилі сайту
app.use((req, res) => sendNotFound(req, res));

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Ступені CMS: http://127.0.0.1:${PORT}/`);
  console.log(`Адмінка:     http://127.0.0.1:${PORT}/admin/`);
});
