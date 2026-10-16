const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (['node_modules', '.git', 'wp-includes', 'wp-json', 'admin', 'data', 'docs', 'r', 'screenshots'].includes(name)) {
      continue;
    }
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name === 'index.html') out.push(p);
  }
  return out;
}

const oldFix =
  /function fixHeader\(\)\s*\{[\s\S]*?window\.innerWidth > 1024[\s\S]*?classList\.remove\(["']small-header["']\)[\s\S]*?\}\s*\}/;

const newFix = `function fixHeader() {
\t\tif (window.innerWidth > 1024) {
\t\t\theader.classList.add("small-header");
\t\t}
    }`;

const files = walk(root);
let fixedHeader = 0;
let addedNav = 0;

for (const file of files) {
  let html = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (oldFix.test(html)) {
    html = html.replace(oldFix, newFix);
    changed = true;
    fixedHeader += 1;
  }

  if (!html.includes('nash-kalendar') && html.includes('>Новини</a>')) {
    const rel = path.relative(root, path.dirname(file));
    const depth = rel ? rel.split(path.sep).filter(Boolean).length : 0;
    const prefix = depth === 0 ? './nash-kalendar/' : '../'.repeat(depth) + 'nash-kalendar/';
    html = html.replace(/>Новини<\/a><\/li>/g, () => {
      return `>Новини</a></li>
<li class="menu-item menu-item-type-custom menu-item-object-custom menu-item-calendar"><a href="${prefix}" itemprop="url" class="navigate">Календар</a></li>`;
    });
    changed = true;
    addedNav += 1;
  }

  if (changed) fs.writeFileSync(file, html, 'utf8');
}

// Restore index.html CMS hooks
const indexPath = path.join(root, 'index.html');
let index = fs.readFileSync(indexPath, 'utf8');
if (!index.includes('data-cms="events"')) {
  index = index.replace(
    '<div class="rhythm-year rel">',
    '<div class="rhythm-year rel" data-cms="events">'
  );
}
if (!index.includes('data-cms="news"')) {
  index = index.replace(
    '<div class="news flex rel" id="news">',
    '<div class="news flex rel" id="news" data-cms="news">'
  );
}
if (!index.includes('data-cms="gallery"')) {
  index = index.replace(
    '<div class="gallery rel" id="gallery">',
    '<div class="gallery rel" id="gallery" data-cms="gallery">'
  );
}
if (!index.includes('cms-bridge.js')) {
  index = index.replace(
    '<script id="wpcf7-recaptcha-js" src="./wp-content/plugins/contact-form-7/modules/recaptcha/index.js"></script>',
    '<script id="wpcf7-recaptcha-js" src="./wp-content/plugins/contact-form-7/modules/recaptcha/index.js"></script>\n<script src="./wp-content/themes/waldorf/js/cms-bridge.js" defer></script>'
  );
}
fs.writeFileSync(indexPath, index, 'utf8');

console.log({ files: files.length, fixedHeader, addedNav, indexOk: true });
