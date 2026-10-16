/**
 * Синхронізація адмінки з матеріалами сайту:
 * розділи (текст з WP JSON / HTML), фото, галерея, вчителі, документи, навігація.
 * Календарні події cal-20* не перезаписуються.
 */
const fs = require('fs');
const path = require('path');
const { ensureDirs, readJson, writeJson, DATA_DIR } = require('./store');
const { ensureDefaultAdmin } = require('./auth');

const ROOT = path.join(__dirname, '..');
const catalogPath = path.join(ROOT, 'catalog.json');
const uploadsRoot = path.join(ROOT, 'wp-content', 'uploads');

const COVER_BY_SLUG = {
  'haj-vsi-rany-zagoyuyutsya-skorishe': './wp-content/uploads/2023/12/1.jpg',
  'rizdvyanyj-yarmarok-16-grudnya': './wp-content/uploads/2023/12/christmas-performance.jpg',
  'meni-nudno': './wp-content/uploads/2023/12/1.png',
  'ochikuvannya-rizdva': './wp-content/uploads/2023/12/2-1.jpg',
  'a-vashi-dity-chytayut': './wp-content/uploads/2023/12/1-3.jpg',
};

const GALLERY_FILES = [
  'school1.jpg',
  'school2.jpg',
  'school3-rotated.jpg',
  'school4.jpg',
  'school5.jpg',
];

const PAGE_HTML_BY_SLUG = {
  home: 'index.html',
  news: path.join('news', 'index.html'),
  contacts: path.join('contacts', 'index.html'),
  'help-us': path.join('help-us', 'index.html'),
  'about-us': path.join('about-us', 'index.html'),
  'waldorf-pedagogy': path.join('about-us', 'waldorf-pedagogy', 'index.html'),
  history: path.join('about-us', 'history', 'index.html'),
  media: path.join('about-us', 'media', 'index.html'),
  rules: path.join('about-us', 'rules', 'index.html'),
  'methodical-materials': path.join('about-us', 'methodical-materials', 'index.html'),
  dokumenty: path.join('about-us', 'dokumenty', 'index.html'),
  'school-structure': path.join('school-structure', 'index.html'),
  kindergarten: path.join('school-structure', 'kindergarten', 'index.html'),
  'elementary-school': path.join('school-structure', 'elementary-school', 'index.html'),
  'secondary-school': path.join('school-structure', 'secondary-school', 'index.html'),
  'high-school': path.join('school-structure', 'high-school', 'index.html'),
  'correctional-treatment-block': path.join(
    'school-structure',
    'correctional-treatment-block',
    'index.html'
  ),
  seminar: path.join('school-structure', 'seminar', 'index.html'),
  'nash-kalendar': path.join('nash-kalendar', 'index.html'),
};

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&hellip;/g, '…')
    .replace(/&#8211;/g, '–')
    .replace(/&#8220;/g, '«')
    .replace(/&#8221;/g, '»')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadWpJson(kind, id) {
  const fp = path.join(ROOT, 'wp-json', 'wp', 'v2', kind, String(id), 'index.html');
  if (!fs.existsSync(fp)) return null;
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch {
    return null;
  }
}

function extractHtmlBody(html) {
  if (!html) return '';
  const m = html.match(/<main[\s\S]*?<div class="content"[^>]*>([\s\S]*?)<\/div>\s*<\/main>/i);
  if (!m) return '';
  let body = m[1];
  body = body.replace(/<div class="breadcrumbs"[\s\S]*?<\/div>/i, '');
  return body.trim();
}

function extractBanner(html) {
  if (!html) return '';
  const m = html.match(/background:\s*url\(['"]?([^'")\s]+)['"]?\)/i);
  if (!m) return '';
  let url = m[1].replace(/\\/g, '/');
  // normalize relative depths to site-root style
  url = url.replace(/^(\.\.\/)+/, './');
  if (!url.startsWith('./') && !url.startsWith('/')) url = './' + url;
  return url;
}

function readPageHtml(slug) {
  const rel = PAGE_HTML_BY_SLUG[slug];
  if (!rel) return '';
  const fp = path.join(ROOT, rel);
  if (!fs.existsSync(fp)) return '';
  return fs.readFileSync(fp, 'utf8');
}

function walkFiles(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    let st;
    try {
      st = fs.statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walkFiles(full, exts, out);
    else if (exts.has(path.extname(name).toLowerCase())) out.push(full);
  }
  return out;
}

function toSiteUrl(absPath) {
  const rel = path.relative(ROOT, absPath).split(path.sep).join('/');
  return './' + rel;
}

function parseTeachers(indexHtml) {
  const block = indexHtml.match(/id="teachers"[\s\S]*?(?=<div class="gallery|<\/main>)/i);
  if (!block) return [];
  const cells = [...block[0].matchAll(/<div class="carousel-cell flex">([\s\S]*?)<\/div>/gi)];
  return cells
    .map((m) => {
      const chunk = m[1];
      const img = (chunk.match(/src="([^"]+)"/) || [])[1];
      const name = stripHtml((chunk.match(/<h3>([\s\S]*?)<\/h3>/) || [])[1] || '').replace(/\s+/g, ' ');
      const role = stripHtml((chunk.match(/<h4>([\s\S]*?)<\/h4>/) || [])[1] || '');
      if (!img) return null;
      return { url: img, title: name || path.basename(img), caption: role };
    })
    .filter(Boolean);
}

function seedNews(catalog) {
  const items = (catalog.posts || []).map((p, i) => {
    const full = loadWpJson('posts', p.id);
    const content = full?.content?.rendered || '';
    const excerpt = stripHtml(full?.excerpt?.rendered || content).slice(0, 220);
    return {
      id: `news-${p.id}`,
      title: p.title,
      slug: p.slug,
      date: (p.date || '').slice(0, 10),
      cover: COVER_BY_SLUG[p.slug] || './wp-content/themes/waldorf/images/no-image.png',
      excerpt,
      body: content || `<p>${excerpt}</p>`,
      status: 'published',
      order: i,
      updatedAt: new Date().toISOString(),
    };
  });
  writeJson('news.json', { items });
  return items.length;
}

function seedMedia(catalog) {
  const items = [];
  const seen = new Set();
  const now = new Date().toISOString();

  function push(item) {
    const key = item.url;
    if (!key) return;
    if (seen.has(key)) {
      const prev = items.find((x) => x.url === key);
      if (prev) {
        if (item.teacher) {
          prev.teacher = true;
          prev.title = item.title || prev.title;
          prev.caption = item.caption || prev.caption;
          prev.childrenOnPhoto = false;
          prev.source = prev.source || item.source;
        }
        if (item.gallery) prev.gallery = true;
        if (item.document) {
          prev.document = true;
          prev.mime = item.mime;
        }
        if (item.caption && !prev.caption) prev.caption = item.caption;
      }
      return;
    }
    seen.add(key);
    items.push(item);
  }

  // 1) усі локальні зображення з uploads
  const imageExt = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
  for (const file of walkFiles(uploadsRoot, imageExt)) {
    const url = toSiteUrl(file);
    const base = path.basename(file);
    const isGallery = GALLERY_FILES.includes(base);
    push({
      id: `file-${base.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
      title: path.basename(base, path.extname(base)),
      url,
      caption: isGallery ? 'Наша школа' : '',
      childrenOnPhoto: !isGallery,
      gallery: isGallery,
      source: 'uploads',
      createdAt: now,
    });
  }

  // 2) каталог WP (доповнення метаданих / відсутніх)
  for (const m of catalog.media || []) {
    if (!String(m.mime_type || '').startsWith('image/')) continue;
    const local = String(m.source_url || '').replace(
      'https://www.waldorf-stupeni.school/',
      './'
    );
    push({
      id: `media-${m.id}`,
      title: m.title || `Медіа ${m.id}`,
      url: local,
      caption: '',
      childrenOnPhoto: true,
      gallery: false,
      source: 'catalog',
      createdAt: now,
    });
  }

  // 3) вчителі з головної
  const indexHtml = fs.existsSync(path.join(ROOT, 'index.html'))
    ? fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
    : '';
  for (const t of parseTeachers(indexHtml)) {
    push({
      id: `teacher-${path.basename(t.url, path.extname(t.url))}`,
      title: t.title,
      url: t.url,
      caption: t.caption,
      childrenOnPhoto: false,
      gallery: false,
      teacher: true,
      source: 'teachers',
      createdAt: now,
    });
  }

  // 4) PDF документи
  const docsDir = path.join(uploadsRoot, 'dokumenty');
  for (const file of walkFiles(docsDir, new Set(['.pdf']))) {
    const url = toSiteUrl(file);
    const base = path.basename(file);
    push({
      id: `doc-${base.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
      title: base,
      url,
      caption: 'Офіційний документ',
      childrenOnPhoto: false,
      gallery: false,
      document: true,
      mime: 'application/pdf',
      source: 'dokumenty',
      createdAt: now,
    });
  }

  writeJson('media.json', { items });
  return items.length;
}

function seedPages(catalog) {
  const bySlug = new Map();

  for (const p of catalog.pages || []) {
    const full = loadWpJson('pages', p.id);
    let pathHint = String(p.link || '')
      .replace('https://www.waldorf-stupeni.school', '')
      .replace(/\/$/, '');
    if (!pathHint) pathHint = '/';

    const html = readPageHtml(p.slug);
    const bodyFromWp = full?.content?.rendered || '';
    const bodyFromHtml = extractHtmlBody(html);
    const body = bodyFromWp || bodyFromHtml || '';
    const banner = extractBanner(html) || './wp-content/themes/waldorf/images/banner.jpg';

    bySlug.set(p.slug, {
      id: `page-${p.id}`,
      title: p.title,
      slug: p.slug,
      path: pathHint,
      body,
      banner,
      cmsManaged: false,
      mirror: true,
      updatedAt: p.modified || full?.modified || new Date().toISOString(),
    });
  }

  // Документи
  const docsHtml = readPageHtml('dokumenty');
  bySlug.set('dokumenty', {
    id: 'page-dokumenty',
    title: 'Документи',
    slug: 'dokumenty',
    path: '/about-us/dokumenty',
    href: './about-us/dokumenty/index.html',
    parent: 'about-us',
    body:
      extractHtmlBody(docsHtml) ||
      '<p>Офіційні документи Вальдорфського ліцею «Ступені».</p>',
    banner: extractBanner(docsHtml) || './wp-content/themes/waldorf/images/banner.jpg',
    cmsManaged: false,
    mirror: true,
    status: 'published',
    updatedAt: new Date().toISOString(),
  });

  // Календар
  bySlug.set('nash-kalendar', {
    id: 'page-calendar-2026',
    title: 'Наш календар',
    slug: 'nash-kalendar',
    path: '/nash-kalendar/',
    href: './nash-kalendar/index.html',
    body: 'План свят і канікул 2026/2027 навчального року.',
    banner: './wp-content/themes/waldorf/images/banner.jpg',
    cmsManaged: true,
    updatedAt: new Date().toISOString(),
  });

  const items = [...bySlug.values()];
  writeJson('pages.json', { items });
  return items.length;
}

function seedNav() {
  const data = {
    left: [
      { id: 'nav-home', label: 'Головна', href: './index.html', visible: true },
      {
        id: 'nav-about',
        label: 'Про нас',
        href: './about-us/index.html',
        visible: true,
        children: [
          {
            id: 'nav-ped',
            label: 'Вальдорфська педагогіка',
            href: './about-us/waldorf-pedagogy/index.html',
            visible: true,
          },
          {
            id: 'nav-hist',
            label: 'Історія школи',
            href: './about-us/history/index.html',
            visible: true,
          },
          {
            id: 'nav-media',
            label: 'Медіа в освітньому процесі',
            href: './about-us/media/index.html',
            visible: true,
          },
          { id: 'nav-gallery', label: 'Наша школа (фото)', href: './index.html#gallery', visible: true },
          {
            id: 'nav-rules',
            label: 'Правила школи',
            href: './about-us/rules/index.html',
            visible: true,
          },
          {
            id: 'nav-teachers',
            label: 'Наші вчителі та вихователі',
            href: './index.html#teachers',
            visible: true,
          },
          {
            id: 'nav-method',
            label: 'Методичні матеріали',
            href: './about-us/methodical-materials/index.html',
            visible: true,
          },
          {
            id: 'nav-docs',
            label: 'Документи',
            href: './about-us/dokumenty/index.html',
            visible: true,
          },
        ],
      },
      {
        id: 'nav-structure',
        label: 'Структура',
        href: './school-structure/index.html',
        visible: true,
        children: [
          {
            id: 'nav-kg',
            label: 'Дитячий садочок “Ступені”',
            href: './school-structure/kindergarten/index.html',
            visible: true,
          },
          {
            id: 'nav-el',
            label: 'Початкова школа',
            href: './school-structure/elementary-school/index.html',
            visible: true,
          },
          {
            id: 'nav-sec',
            label: 'Середня школа',
            href: './school-structure/secondary-school/index.html',
            visible: true,
          },
          {
            id: 'nav-hi',
            label: 'Старша школа',
            href: './school-structure/high-school/index.html',
            visible: true,
          },
          {
            id: 'nav-corr',
            label: 'Корекційно-лікувальний блок',
            href: './school-structure/correctional-treatment-block/index.html',
            visible: true,
          },
          {
            id: 'nav-sem',
            label: 'Семінар',
            href: './school-structure/seminar/index.html',
            visible: true,
          },
        ],
      },
      { id: 'nav-news', label: 'Новини', href: './news/index.html', visible: true },
      { id: 'nav-calendar', label: 'Календар', href: './nash-kalendar/index.html', visible: true },
    ],
    right: [
      { id: 'nav-contacts', label: 'Контакти', href: './contacts/index.html', visible: true },
      { id: 'nav-help', label: 'Підтримайте нас', href: './help-us/index.html', visible: true },
    ],
  };
  writeJson('nav.json', data);
  return data.left.length + data.right.length;
}

function seedSettings() {
  writeJson('settings.json', {
    phone: '+380 48 799-70-24',
    address: "Україна 65104, м. Одеса, вул. Сім'ї Глодан, 31-А (колишня вул. Ільфа та Петрова)",
    email: 'stupeni@waldorf-school.org',
    siteTitle: 'Ступені — Вальдорфський ліцей і дитячий садок',
  });
}

function run() {
  ensureDirs();
  ensureDefaultAdmin();

  if (!fs.existsSync(catalogPath)) {
    throw new Error('catalog.json not found');
  }
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

  // Не чіпаємо навчальний календар
  const eventsBefore = readJson('events.json', { items: [] });
  const calCount = (eventsBefore.items || []).filter((e) =>
    String(e.id || '').startsWith('cal-20')
  ).length;

  const newsN = seedNews(catalog);
  const mediaN = seedMedia(catalog);
  const pagesN = seedPages(catalog);
  const navN = seedNav();
  seedSettings();

  const media = readJson('media.json', { items: [] });
  const teachers = (media.items || []).filter((m) => m.teacher).length;
  const gallery = (media.items || []).filter((m) => m.gallery).length;
  const docs = (media.items || []).filter((m) => m.document).length;
  const pagesWithBody = readJson('pages.json', { items: [] }).items.filter((p) => p.body).length;

  console.log(
    JSON.stringify(
      {
        news: newsN,
        media: mediaN,
        teachers,
        gallery,
        documents: docs,
        pages: pagesN,
        pagesWithBody,
        nav: navN,
        calendarEventsKept: calCount,
        dataDir: DATA_DIR,
      },
      null,
      2
    )
  );
}

if (require.main === module) {
  run();
}

module.exports = { run };
