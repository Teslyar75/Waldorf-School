const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const skip = new Set(['node_modules', '.git', 'wp-includes', 'wp-json', 'admin', 'data', 'docs', 'r', 'screenshots']);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (skip.has(name)) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name === 'index.html') out.push(p);
  }
  return out;
}

const insertRe =
  /(<a href="([^"]*?)methodical-materials\/index\.html"[^>]*>Методичні матеріали<\/a><\/li>)(?!\s*<li[^>]*dokumenty)/g;

function makeItem(prefix) {
  return `$1
	<li class="menu-item menu-item-type-custom menu-item-object-custom menu-item-dokumenty"><a href="${prefix}dokumenty/index.html" itemprop="url" class="navigate">Документи</a></li>`;
}

let updated = 0;
for (const file of walk(root)) {
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes('menu-item-dokumenty')) continue;
  if (!html.includes('methodical-materials/index.html')) continue;

  const next = html.replace(insertRe, (_, full, prefix) => {
    return full + `\n\t<li class="menu-item menu-item-type-custom menu-item-object-custom menu-item-dokumenty"><a href="${prefix}dokumenty/index.html" itemprop="url" class="navigate">Документи</a></li>`;
  });

  if (next !== html) {
    fs.writeFileSync(file, next, 'utf8');
    updated += 1;
  }
}

// Create page from methodical-materials template
const srcPage = path.join(root, 'about-us', 'methodical-materials', 'index.html');
const destDir = path.join(root, 'about-us', 'dokumenty');
const destPage = path.join(destDir, 'index.html');
fs.mkdirSync(destDir, { recursive: true });

let page = fs.readFileSync(srcPage, 'utf8');
page = page
  .replace(/Методичні матеріали/g, 'Документи')
  .replace(/methodical-materials/g, 'dokumenty')
  .replace(
    /Вибачте, ця сторінка в розробці\./,
    'Тут будуть офіційні документи школи. Сторінка в розробці.'
  );

// Mark dokumenty as current in this page menus
page = page.replace(
  /menu-item-dokumenty"><a href="\.\/dokumenty\/index\.html"/g,
  'menu-item-dokumenty current-menu-item"><a href="./index.html" aria-current="page"'
);

fs.writeFileSync(destPage, page, 'utf8');

// nav.json
const navPath = path.join(root, 'data', 'nav.json');
const nav = JSON.parse(fs.readFileSync(navPath, 'utf8'));
const about = nav.left.find((i) => i.id === 'nav-about');
if (about && about.children && !about.children.some((c) => c.id === 'nav-docs')) {
  about.children.push({
    id: 'nav-docs',
    label: 'Документи',
    href: './about-us/dokumenty/index.html',
    visible: true,
  });
  fs.writeFileSync(navPath, JSON.stringify(nav, null, 2) + '\n', 'utf8');
}

// pages.json seed if exists
const pagesPath = path.join(root, 'data', 'pages.json');
if (fs.existsSync(pagesPath)) {
  let pages = JSON.parse(fs.readFileSync(pagesPath, 'utf8'));
  const list = Array.isArray(pages) ? pages : pages.pages || pages.items || null;
  if (Array.isArray(list) && !list.some((p) => (p.slug || p.path || '') === 'dokumenty' || (p.href || '').includes('dokumenty'))) {
    list.push({
      id: 'page-dokumenty',
      title: 'Документи',
      slug: 'dokumenty',
      href: './about-us/dokumenty/index.html',
      parent: 'about-us',
      status: 'draft',
    });
    if (Array.isArray(pages)) {
      fs.writeFileSync(pagesPath, JSON.stringify(list, null, 2) + '\n', 'utf8');
    } else {
      fs.writeFileSync(pagesPath, JSON.stringify(pages, null, 2) + '\n', 'utf8');
    }
  }
}

console.log({ updatedMenus: updated, page: 'about-us/dokumenty/index.html' });
