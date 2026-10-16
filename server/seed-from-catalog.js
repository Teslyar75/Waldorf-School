const fs = require('fs');
const path = require('path');
const { ensureDirs, readJson, writeJson, DATA_DIR } = require('./store');
const { ensureDefaultAdmin } = require('./auth');

const ROOT = path.join(__dirname, '..');
const catalogPath = path.join(ROOT, 'catalog.json');

const COVER_BY_SLUG = {
  'haj-vsi-rany-zagoyuyutsya-skorishe': './wp-content/uploads/2023/12/1.jpg',
  'rizdvyanyj-yarmarok-16-grudnya': './wp-content/themes/waldorf/images/no-image.png',
  'meni-nudno': './wp-content/uploads/2023/12/1.png',
  'ochikuvannya-rizdva': './wp-content/uploads/2023/12/2-1.jpg',
  'a-vashi-dity-chytayut': './wp-content/uploads/2023/12/1-3.jpg',
};

const RHYTHM_EVENTS = [
  { title: 'Свято врожаю', image: './wp-content/uploads/2023/12/harvest-festival.jpg', season: 'осінь' },
  { title: 'Свято св. Михаїла', image: './wp-content/uploads/2023/12/feast-of-st.-michael.jpg', season: 'осінь' },
  { title: 'Свято ліхтариків', image: './wp-content/uploads/2023/12/festival-of-lanterns.jpg', season: 'осінь' },
  { title: 'Проходження різдвяної спіралі', image: './wp-content/uploads/2023/12/passing-the-christmas-spiral.jpg', season: 'зима' },
  { title: 'Свято святого Миколая', image: './wp-content/uploads/2023/12/saint-nicholass-day.jpg', season: 'зима' },
  { title: 'Різдвяна вистава', image: './wp-content/uploads/2023/12/christmas-performance.jpg', season: 'зима' },
  { title: 'Масляна', image: './wp-content/uploads/2023/12/shrovetide.jpg', season: 'зима' },
  { title: '8 березня', image: './wp-content/uploads/2023/12/march-8.jpg', season: 'весна' },
  { title: 'Великдень', image: './wp-content/uploads/2023/12/easter.jpg', season: 'весна' },
  { title: 'Олімпійські ігри', image: './wp-content/uploads/2023/12/olympic-games.jpg', season: 'весна' },
  { title: 'Останній дзвоник', image: './wp-content/uploads/2023/12/the-last-bell.jpg', season: 'літо' },
  { title: 'День школи', image: './wp-content/uploads/2023/12/school-day-rotated.jpg', season: 'літо' },
  { title: 'Вечір старшокласників', image: './wp-content/uploads/2023/12/evening-of-high-school-students.jpg', season: 'літо' },
];

const GALLERY = [
  './wp-content/uploads/2023/12/school1.jpg',
  './wp-content/uploads/2023/12/school2.jpg',
  './wp-content/uploads/2023/12/school3-rotated.jpg',
  './wp-content/uploads/2023/12/school4.jpg',
  './wp-content/uploads/2023/12/school5.jpg',
];

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

function loadWpPost(id) {
  const fp = path.join(ROOT, 'wp-json', 'wp', 'v2', 'posts', String(id), 'index.html');
  if (!fs.existsSync(fp)) return null;
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch {
    return null;
  }
}

function seedNews(catalog) {
  const items = (catalog.posts || []).map((p, i) => {
    const full = loadWpPost(p.id);
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
  let n = 0;
  for (const m of catalog.media || []) {
    if (!String(m.mime_type || '').startsWith('image/')) continue;
    const local = String(m.source_url || '').replace(
      'https://www.waldorf-stupeni.school/',
      './'
    );
    items.push({
      id: `media-${m.id}`,
      title: m.title || `Медіа ${m.id}`,
      url: local,
      caption: '',
      childrenOnPhoto: true,
      source: 'catalog',
      createdAt: new Date().toISOString(),
    });
    n += 1;
    if (n >= 40) break;
  }
  for (const url of GALLERY) {
    items.push({
      id: `gallery-${path.basename(url, path.extname(url))}`,
      title: path.basename(url),
      url,
      caption: 'Наша школа',
      childrenOnPhoto: false,
      gallery: true,
      source: 'gallery',
      createdAt: new Date().toISOString(),
    });
  }
  writeJson('media.json', { items });
  return items.length;
}

function seedEvents() {
  // Не перезаписуємо навчальний календар 2026/2027, якщо він уже є
  const existing = readJson('events.json', { items: [] });
  if (existing.items?.some((e) => String(e.id || '').startsWith('cal-20'))) {
    return existing.items.length;
  }
  const items = RHYTHM_EVENTS.map((e, i) => ({
    id: `event-${i + 1}`,
    title: e.title,
    date: '',
    season: e.season,
    description: '',
    image: e.image,
    order: i,
    published: true,
    showInRhythm: true,
    updatedAt: new Date().toISOString(),
  }));
  writeJson('events.json', { items });
  return items.length;
}

function seedPages(catalog) {
  const items = (catalog.pages || []).map((p) => {
    let pathHint = String(p.link || '')
      .replace('https://www.waldorf-stupeni.school', '')
      .replace(/\/$/, '');
    if (!pathHint || pathHint === '') pathHint = '/';
    return {
      id: `page-${p.id}`,
      title: p.title,
      slug: p.slug,
      path: pathHint,
      body: '',
      banner: '',
      cmsManaged: false,
      updatedAt: p.modified || new Date().toISOString(),
    };
  });
  writeJson('pages.json', { items });
  return items.length;
}

function seedNav() {
  const data = {
    left: [
      { id: 'nav-home', label: 'На головну', href: './index.html', visible: true },
      {
        id: 'nav-about',
        label: 'Про нас',
        href: './about-us/index.html',
        visible: true,
        children: [
          { id: 'nav-ped', label: 'Вальдорфська педагогіка', href: './about-us/waldorf-pedagogy/index.html', visible: true },
          { id: 'nav-hist', label: 'Історія школи', href: './about-us/history/index.html', visible: true },
          { id: 'nav-media', label: 'Медіа в освітньому процесі', href: './about-us/media/index.html', visible: true },
          { id: 'nav-gallery', label: 'Наша школа (фото)', href: '#gallery', visible: true },
          { id: 'nav-rules', label: 'Правила школи', href: './about-us/rules/index.html', visible: true },
          { id: 'nav-teachers', label: 'Наші вчителі та вихователі', href: '#teachers', visible: true },
          { id: 'nav-method', label: 'Методичні матеріали', href: './about-us/methodical-materials/index.html', visible: true },
        ],
      },
      {
        id: 'nav-structure',
        label: 'Структура школи',
        href: './school-structure/index.html',
        visible: true,
        children: [
          { id: 'nav-kg', label: 'Дитячий садочок “Ступені”', href: './school-structure/kindergarten/index.html', visible: true },
          { id: 'nav-el', label: 'Початкова школа', href: './school-structure/elementary-school/index.html', visible: true },
          { id: 'nav-sec', label: 'Середня школа', href: './school-structure/secondary-school/index.html', visible: true },
          { id: 'nav-hi', label: 'Старша школа', href: './school-structure/high-school/index.html', visible: true },
          { id: 'nav-corr', label: 'Корекційно-лікувальний блок', href: './school-structure/correctional-treatment-block/index.html', visible: true },
          { id: 'nav-sem', label: 'Семінар', href: './school-structure/seminar/index.html', visible: true },
        ],
      },
      { id: 'nav-news', label: 'Новини', href: './news/index.html', visible: true },
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
    siteTitle: 'Ступені — Вальдорфський ліцей і дитячий садок',
  });
}

function run(force = false) {
  ensureDirs();
  ensureDefaultAdmin();

  if (!force) {
    const marker = path.join(DATA_DIR, 'news.json');
    if (fs.existsSync(marker)) {
      console.log('Seed skipped (data already exists). Use --force to overwrite.');
      return;
    }
  }

  if (!fs.existsSync(catalogPath)) {
    throw new Error('catalog.json not found');
  }
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

  const newsN = seedNews(catalog);
  const mediaN = seedMedia(catalog);
  const eventsN = seedEvents();
  const pagesN = seedPages(catalog);
  const navN = seedNav();
  seedSettings();

  console.log(`Seeded: news=${newsN}, media=${mediaN}, events=${eventsN}, pages=${pagesN}, nav=${navN}`);
}

if (require.main === module) {
  run(process.argv.includes('--force'));
}

module.exports = { run };
