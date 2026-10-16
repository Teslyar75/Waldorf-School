// Редагування статичних сторінок дзеркала без зміни файлів:
// правки зберігаються в data/overrides.json і накладаються сервером під час віддачі HTML.
// Також тут — динамічні блоки: книги (методичні матеріали) і документи.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { readJson, writeJson } = require('./store');

const ROOT = path.join(__dirname, '..');
const OV_FILE = 'overrides.json';
const SKIP = /^\/(admin|api|data|p|wp-content|wp-includes|wp-json|assets|server|scripts|docs|node_modules)(\/|$)/;
const ITEM_RE = /<(h1|h2|h3|p)\b([^>]*)>([\s\S]*?)<\/\1>|<img\b[^>]*>|url\('([^']+)'\)/g;

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const hash = (s) => crypto.createHash('md5').update(s).digest('hex').slice(0, 10);
const loadOv = () => readJson(OV_FILE, { pages: {} });
const BN_FILE = 'banners.json';
const loadBn = () => readJson(BN_FILE, { pages: {} });
const BANNER_RE = /(<div class="banner[^"]*"[^>]*style=")([^"]*)(")/;
// Банер (шапка-фото) сторінки: data/banners.json { pages: { "/path/": { src, pos } } }
function applyBanner(html, urlPath) {
  const b = (loadBn().pages || {})[canonicalPath(urlPath || '/')];
  if (!b || !b.src) return html;
  const pos = b.pos || 'center';
  return html.replace(BANNER_RE, (_m, a, _old, c) => `${a}background: url('${esc(b.src)}') no-repeat; background-size: cover; background-position: ${esc(pos)};${c}`);
}
// Меню з ОДНОГО джерела (data/nav.json): підменю всіх пунктів з дітьми перебудовуються на сервері для кожної сторінки.
function navHref(h) { h = String(h || '').trim(); if (/^(https?:|mailto:|tel:)/.test(h)) return h; h = h.replace(/^(\.\.\/|\.\/)+/, '/'); if (!h.startsWith('/')) h = '/' + h; return h.replace(/index\.html(?=$|#|\?)/, '').replace(/^\/p\/([^/#?]+)$/, '/p/$1/'); }
function applyNav(html, urlPath) {
  html = String(html).replace(/<link\b[^>]*href="[^"]*(?:\/feed\/|wp-json|xmlrpc\.php)[^"]*"[^>]*>\s*/gi, ''); // dead WP head links (feed, oEmbed, REST, RSD)
  let nav; try { nav = readJson('nav.json', { left: [], right: [] }); } catch { return html; }
  const cp = canonicalPath(urlPath || '/');
  for (const top of [...(nav.left || []), ...(nav.right || [])]) {
    const kids = (top.children || []).filter((c) => c.visible !== false); if (!kids.length) continue;
    const lis = kids.map((c) => { const href = navHref(c.href); const cur = href === cp; return `\t<li class="menu-item menu-item-cms${cur ? ' current-menu-item' : ''}"><a href="${esc(href)}"${cur ? ' aria-current="page"' : ''} itemprop="url" class="navigate">${esc(c.label)}</a></li>`; }).join('\n');
    const lbl = top.label.replace(/[.*+?^${}()|[\]\\]/g, '\\function currentBanner(');
    html = html.replace(new RegExp('(>' + lbl + '</a>\\s*<ul class="sub-menu">)[\\s\\S]*?(</ul>)', 'g'), (_m, a, b) => `${a}\n${lis}\n${b}`);
  }
  html = applyUnified(html);
  return html.replace(/(<span class="st-copy-year">)\d{4}(<\/span>)/g, `$1${new Date().getFullYear()}$2`); // st-copy-year
}
function currentBanner(html) { const m = html.match(BANNER_RE); return m ? ((m[2].match(/url\(['"]?([^'")]+)/) || [])[1] || '') : ''; }

function fileFor(urlPath) {
  let p = decodeURIComponent(urlPath);
  if (p.endsWith('/')) p += 'index.html';
  if (!p.endsWith('.html')) return null;
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp)) return null;
  return fp;
}
function canonicalPath(urlPath) { let p = String(urlPath || '/').split(/[?#]/)[0].replace(/index\.html$/, ''); if (!p.endsWith('/') && !/\.[a-z0-9]+$/i.test(p)) p += '/'; return p; }

function region(html) {
  const s = html.indexOf('<main'); const e = html.indexOf('</main>');
  return s >= 0 && e > s ? [s, e] : [0, 0];
}

function listItems(html) {
  const [s, e] = region(html); const part = html.slice(s, e); const out = []; let n = 0; let m;
  ITEM_RE.lastIndex = 0;
  while ((m = ITEM_RE.exec(part))) {
    const id = 'e' + n++;
    if (m[1]) {
      const text = m[3].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (!text || text.length < 2) continue;
      out.push({ id, type: 'text', tag: m[1], html: m[3].trim(), text, h: hash(m[0]) });
    } else if (m[4]) {
      out.push({ id, type: 'bg', src: m[4], h: hash(m[0]) });
    } else {
      const src = (m[0].match(/(?:data-flickity-lazyload|src)=["']([^"']+)/) || [])[1];
      if (!src || /\.svg$/.test(src)) continue;
      out.push({ id, type: 'img', src, alt: (m[0].match(/alt="([^"]*)"/) || [])[1] || '', h: hash(m[0]) });
    }
  }
  return out;
}

function applyOverrides(html, ov) {
  if (!ov || !Object.keys(ov).length) return html;
  const [s, e] = region(html); if (!e) return html;
  let n = 0;
  const part = html.slice(s, e).replace(ITEM_RE, (m0, tag, attrs, inner, bg) => {
    const id = 'e' + n++; const o = ov[id];
    if (!o || o.h !== hash(m0)) return m0;
    if (tag) return `<${tag}${attrs}>${o.html}</${tag}>`;
    if (bg) return `url('${o.src || bg}')` + (o.pos ? `; background-position: ${o.pos}; background-size: cover` : '');
    let out = m0;
    if (o.src) out = out.replace(/(data-flickity-lazyload|src)=["'][^"']+["']/, `$1="${esc(o.src)}"`);
    if (o.alt !== undefined) out = /alt="/.test(out) ? out.replace(/alt="[^"]*"/, `alt="${esc(o.alt)}"`) : out.replace(/<img/, `<img alt="${esc(o.alt)}"`);
    if (o.pos) out = out.replace(/<img/, `<img style="object-position:${esc(o.pos)}"`);
    return out;
  });
  return html.slice(0, s) + part + html.slice(e);
}

// ---------- Динамічні блоки
function renderBooks(books) {
  const card = (b, i) => {
    const cover = b.cover
      ? (/\/books\/hq\/[\w-]+\.jpg$/.test(b.cover) ? `<picture class="st-cover"><source srcset="${esc(b.cover.replace(/\.jpg$/, '.webp'))}" type="image/webp">` : '<picture class="st-cover">') + `<img src="${esc(b.cover)}" width="600" height="900" alt="Обкладинка книги «${esc(b.title)}»${b.author ? ', ' + esc(b.author) : ''}" loading="lazy"></picture>`
      : `<div class="st-book-placeholder"><span>${esc(b.title)}</span></div>`;
    const badge = b.available ? `<p class="st-badge">Є в наявності на прохідній школи${b.price ? ' · ' + esc(b.price) : ''}</p>` : '';
    const links = (b.links || []).map((l) => `<a href="${esc(l.url)}" class="btn orange" target="_blank" rel="noopener">${esc(l.label)}</a>`).join(' ');
    return `
			<div class="level flex" id="book-${i + 1}">
				<div class="level-photo">${cover}</div>
				<div class="info">
					<h3>${esc(b.title)}</h3>
					<div class="desc">
						${badge}
						<p><strong>${esc(b.author)}</strong>${b.original ? ' · <em>' + esc(b.original) + '</em>' : ''}${b.language ? ' · ' + esc(b.language) : ''}</p>
						<p>${esc(b.description)}</p>
					</div>
					<div>${links}</div>
				</div>
			</div>`;
  };
  return `<div class="levels rel flex" id="levels">
			<h2>Методичні матеріали</h2>
			<div class="st-intro">
				<p>Добірка книжок про вальдорфську педагогіку для батьків і вчителів: українські та російські видання, а також класика англійською, якої поки немає в перекладі.</p>
				<p><strong>Багато книжок можна придбати на прохідній школи</strong> — запитайте на рецепції. Книжки, які зараз є в наявності, позначені відповідною позначкою.</p>
			</div>
${books.map(card).join('\n')}
			<p class="st-intro">Більше про підхід — на сторінці <a href="/about-us/waldorf-pedagogy/">«Вальдорфська педагогіка»</a>.</p>
		</div>`;
}

function renderDocuments(html, docs) {
  const pdfs = docs.filter((d) => /\.pdf(\?|$)/i.test(d.url));
  const viewer = pdfs.map((d) => ({ id: d.id, title: d.title, note: d.note || '', src: d.url }));
  html = html.replace(/var docs = \[[\s\S]*?\];/, () => 'var docs = ' + JSON.stringify(viewer) + ';');
  if (pdfs[0]) {
    html = html.replace(/(<p class="school-docs__counter" id="docs-counter">)[^<]*/, `$11 / ${pdfs.length}`)
      .replace(/(<h3 id="docs-title">)[^<]*/, () => `<h3 id="docs-title">${esc(pdfs[0].title)}`)
      .replace(/(<p class="school-docs__note" id="docs-note">)[^<]*/, () => `<p class="school-docs__note" id="docs-note">${esc(pdfs[0].note || '')}`)
      .replace(/(id="docs-open" href=")[^"]*/, `$1./viewer.html?src=${encodeURIComponent(pdfs[0].url)}`)
      .replace(/(id="docs-download" href=")[^"]*/, `$1${pdfs[0].url}`);
  }
  html = html.replace(/<div class="school-docs__thumbs"[\s\S]*?<\/div>(?=\s*<section class="school-docs__cards")/, () =>
    `<div class="school-docs__thumbs" role="tablist" aria-label="Список документів">\n${pdfs.map((d, i) => `<button type="button" class="school-docs__thumb" data-index="${i}" aria-label="${esc(d.title)}"><span class="school-docs__thumb-num">${i + 1}</span><span class="school-docs__thumb-title">${esc(d.title)}</span></button>`).join('\n')}\n</div>`);
  const sections = [];
  for (const d of docs) { const s = d.section || 'Документи'; let g = sections.find((x) => x.name === s); if (!g) sections.push((g = { name: s, items: [] })); g.items.push(d); }
  const cards = sections.map((g) => `<h2 class="docs-section-title">${esc(g.name)}</h2>
<div class="cms-docs-grid">${g.items.map((d) => /\.(jpe?g|png|webp)(\?|$)/i.test(d.url)
    ? `<a class="cms-doc cms-doc--img" href="${esc(d.url)}" target="_blank" rel="noopener"><img src="${esc(d.url)}" alt="${esc(d.title)}" loading="lazy"><span class="cms-doc-title">${esc(d.title)}</span><span class="cms-doc-open">Відкрити повний розмір →</span></a>`
    : `<a class="cms-doc" href="${esc(d.url)}" target="_blank" rel="noopener"><span class="cms-doc-icon">PDF</span><span class="cms-doc-title">${esc(d.title)}</span>${d.note ? `<span class="muted">${esc(d.note)}</span>` : ''}<span class="cms-doc-open">Відкрити / завантажити →</span></a>`).join('\n')}</div>`).join('\n');
  html = html.replace(/<section class="school-docs__cards"[\s\S]*?<\/section>/, () => `<section class="school-docs__cards" aria-label="Документи для перегляду та завантаження">\n${cards}\n</section>`);
  return html;
}

function createMiddleware({ books, documents }) {
  return (req, res, next) => {
    if (req.method !== 'GET' || SKIP.test(req.path)) return next();
    const fp = fileFor(req.path); if (!fp) return next();
    let html = fs.readFileSync(fp, 'utf8');
    const cp = canonicalPath(req.path);
    if (cp === '/about-us/methodical-materials/') {
      html = html.replace(/<div class="levels rel flex" id="levels">[\s\S]*?(?=\s*<\/main>)/, () => renderBooks(books.publicList()));
    }
    if (cp === '/about-us/dokumenty/') {
      const docs = documents.publicList();
      if (docs.length) html = renderDocuments(html, docs);
    }
    html = applyOverrides(html, (loadOv().pages || {})[cp]);
    html = applyBanner(html, cp);
    html = applyNav(html, cp);
    res.type('html').send(html);
  };
}

function listPages() {
  const out = [];
  const skipDir = /^(admin|docs|wp-content|wp-includes|wp-json|_debug-header|node_modules|server|scripts|data|assets|r|feed|comments)$/;
  (function walk(d) {
    for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
      if (e.isDirectory()) { if (!skipDir.test(e.name) && !e.name.startsWith('.')) walk(d ? d + '/' + e.name : e.name); }
      else if (e.name === 'index.html') {
        const html = fs.readFileSync(path.join(ROOT, d, e.name), 'utf8');
        if (!html.includes('<main')) continue;
        const title = ((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || d || 'Головна').replace(/<[^>]+>/g, '').trim();
        out.push({ path: '/' + (d ? d + '/' : ''), title: d ? title : 'Головна сторінка' });
      }
    }
  })('');
  const dup = /^\/(kindergarten|elementary-school|secondary-school|high-school|correctional-treatment-block|seminar|rules|history|media|methodical-materials|waldorf-pedagogy)\/$/;
  return out.filter((p) => !dup.test(p.path)).sort((a, b) => a.path.localeCompare(b.path));
}

function createAdminRouter() {
  const r = express.Router();
  r.get('/pages', (_q, res) => res.json({ items: listPages() }));
  r.get('/page', (q, res) => {
    const p = String(q.query.path || '/'); const fp = fileFor(p); if (!fp) return res.status(404).json({ error: 'Сторінку не знайдено' });
    const ov = (loadOv().pages || {})[canonicalPath(p)] || {};
    const items = listItems(fs.readFileSync(fp, 'utf8')).map((it) => ({ ...it, override: ov[it.id] && ov[it.id].h === it.h ? ov[it.id] : null }));
    res.json({ path: canonicalPath(p), items });
  });
  r.put('/page', (q, res) => {
    const p = canonicalPath(String(q.body.path || '')); const fp = fileFor(p); if (!fp) return res.status(404).json({ error: 'Сторінку не знайдено' });
    const it = listItems(fs.readFileSync(fp, 'utf8')).find((x) => x.id === q.body.id); if (!it) return res.status(404).json({ error: 'Елемент не знайдено' });
    const d = loadOv(); d.pages = d.pages || {}; d.pages[p] = d.pages[p] || {};
    const o = { h: it.h, updatedAt: new Date().toISOString(), by: q.user && q.user.username };
    if (it.type === 'text') o.html = String(q.body.html ?? it.html).slice(0, 20000).replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son\w+="[^"]*"/gi, '');
    else { if (q.body.src) o.src = String(q.body.src); if (q.body.pos) o.pos = String(q.body.pos).replace(/[^0-9.% ]/g, ''); if (q.body.alt !== undefined) o.alt = String(q.body.alt); }
    d.pages[p][it.id] = o; writeJson(OV_FILE, d); res.json({ ok: true, override: o });
  });
  r.delete('/page', (q, res) => {
    const p = canonicalPath(String(q.query.path || '')); const d = loadOv();
    if (d.pages && d.pages[p]) delete d.pages[p][String(q.query.id)];
    writeJson(OV_FILE, d); res.json({ ok: true });
  });
  r.get('/banners', (_q, res) => {
    const bn = loadBn().pages || {};
    const items = listPages().map((p) => {
      const fp = fileFor(p.path); const cur = fp ? currentBanner(fs.readFileSync(fp, 'utf8')) : '';
      return { ...p, kind: 'static', original: cur.replace(/^(\.\.\/|\.\/)+/, '/'), override: bn[p.path] || null };
    });
    let cms = []; try { cms = (readJson('pages.json', { items: [] }).items || []); } catch { /* */ }
    for (const c of cms) if (c.slug && !fileFor((c.path || '/p/' + c.slug).replace(/\/?$/, '/'))) { const pth = '/p/' + c.slug + '/'; items.push({ path: pth, title: c.title || c.slug, kind: 'cms', original: '/wp-content/themes/waldorf/images/banner.jpg', override: bn[pth] || null }); }
    for (const pth of ['/batky/', '/vypusknyky/']) if (!items.find((x) => x.path === pth)) items.push({ path: pth, title: pth, kind: 'generated', original: '/wp-content/themes/waldorf/images/banner.jpg', override: bn[pth] || null });
    res.json({ items });
  });
  r.put('/banner', (q, res) => {
    const p = canonicalPath(String(q.body.path || '')); const src = String(q.body.src || '').trim().replace(/^(\.\.\/|\.\/)+/, '/');
    if (!p.startsWith('/') || !/^\/(data\/uploads|wp-content)\//.test(src)) return res.status(400).json({ error: 'Оберіть зображення з медіатеки' });
    const pos = String(q.body.pos || '50% 50%').replace(/[^0-9.% ]/g, '').slice(0, 20);
    const d = loadBn(); d.pages = d.pages || {}; d.pages[p] = { src, pos, updatedAt: new Date().toISOString(), by: q.user && q.user.username };
    writeJson(BN_FILE, d); res.json({ ok: true, override: d.pages[p] });
  });
  r.delete('/banner', (q, res) => { const d = loadBn(); if (d.pages) delete d.pages[canonicalPath(String(q.query.path || ''))]; writeJson(BN_FILE, d); res.json({ ok: true }); });
  return r;
}

module.exports = { applyNav, createMiddleware, createAdminRouter, listItems, applyOverrides, applyBanner, listPages };


/* UNIFIED-LEGACY: старі WP-сторінки й записи → стиль «Структури школи».
   Хлібні крихти лишаються в .content, решта вмісту переноситься в персикову рвану підкладку
   (.levels.st-page) з читабельною кремовою карткою (.st-textcard) або широким блоком для списку новин. */
function applyUnified(html) {
  const mStart = html.search(/<main class="page[^"]*">/);
  if (mStart < 0) return html;
  const cIdx = html.indexOf('<div class="content">', mStart);
  const mEnd = html.indexOf('</main>', mStart);
  if (cIdx < 0 || mEnd < 0 || cIdx > mEnd) return html;
  // кінець .content — балансування div
  const re = /<\/?div\b[^>]*>/g; re.lastIndex = cIdx; let depth = 0, cEnd = -1, m;
  while ((m = re.exec(html))) { depth += m[0][1] === '/' ? -1 : 1; if (depth === 0) { cEnd = m.index; break; } if (m.index > mEnd) break; }
  if (cEnd < 0 || cEnd > mEnd) { cEnd = html.lastIndexOf('</div>', mEnd); if (cEnd <= cIdx) return html; } // незбалансовані div у дзеркалі
  const inner = html.slice(cIdx + '<div class="content">'.length, cEnd);
  const bc = inner.match(/^\s*<div class="breadcrumbs"[\s\S]*?<\/div>/);
  const rest = bc ? inner.slice(bc[0].length) : inner;
  if (!rest.replace(/<[^>]+>/g, '').trim() && !/<img|<iframe/.test(rest)) return html;
  if (/class="(levels|cms-body|cal-|school-docs|cms-hub|contacts|st-)/.test(rest) || /class="levels/.test(html.slice(cEnd, mEnd))) return html;
  const t = (html.slice(mStart, cIdx).match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [, ''])[1].trim();
  const wide = /class="news-list/.test(rest);
  const body = wide ? '<div class="st-wide st-news">' + rest + '</div>' : '<div class="st-textcard st-legacy-text">' + rest + '</div>';
  const panel = '<div class="levels rel flex st-page st-page--text st-legacy" id="st-page">' + (t ? '<h2>' + t + '</h2>' : '') + body + '</div>';
  return html.slice(0, cIdx) + '<div class="content">' + (bc ? bc[0] : '') + '</div>' + panel + html.slice(cEnd + 6);
}
module.exports.applyUnified = applyUnified;
