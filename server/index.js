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

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.PORT) || 5180;

ensureDirs();
ensureDefaultAdmin();
seed(false);

const app = express();
app.use(express.json({ limit: '2mb' }));

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

// Admin API (JWT)
const admin = express.Router();
admin.use(authMiddleware);

admin.use('/news', requirePermission('news'), newsRoutes.createAdminRouter());
admin.use('/events', requirePermission('events'), eventsRoutes.createAdminRouter());
admin.use('/media', requirePermission('media'), mediaRoutes.createAdminRouter());
admin.use('/pages', requirePermission('pages'), pagesRoutes.createAdminRouter());
admin.use('/nav', requirePermission('nav'), navRoutes.createAdminRouter());
admin.use('/settings', requirePermission('settings'), settingsRoutes.createAdminRouter());
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

app.use('/api/admin', admin);

// Uploads + data
app.use('/data/uploads', express.static(UPLOADS_DIR));
app.use('/data', express.static(DATA_DIR));

// Admin SPA
app.use('/admin', express.static(path.join(ROOT, 'admin')));
app.get('/admin/*', (_req, res) => {
  res.sendFile(path.join(ROOT, 'admin', 'index.html'));
});

function renderCmsArticle({ title, banner, body, date }) {
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
  </style>
</head>
<body>
  <a class="cms-back btn orange" href="/">← На головну</a>
  <article class="cms-page">
    <h1>${escapeHtml(title)}</h1>
    ${dateHtml}
    ${bannerHtml}
    <div class="cms-body">${body || ''}</div>
  </article>
</body>
</html>`;
}

// Dynamic CMS pages + news
app.get('/p/:slug', (req, res) => {
  const page = pagesRoutes.publicBySlug(req.params.slug);
  if (page) {
    return res.type('html').send(
      renderCmsArticle({ title: page.title, banner: page.banner, body: page.body })
    );
  }
  const newsItem = newsRoutes.publicList().find((n) => n.slug === req.params.slug);
  if (newsItem) {
    return res.type('html').send(
      renderCmsArticle({
        title: newsItem.title,
        banner: newsItem.cover,
        body: newsItem.body,
        date: newsItem.date,
      })
    );
  }
  return res.status(404).send('Сторінку не знайдено');
});

// Static site (mirror) — after API routes
app.use(express.static(ROOT, { extensions: ['html'] }));

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
  console.log(`Логін супер-адміна: admin / admin`);
});
