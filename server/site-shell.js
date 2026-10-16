// Спільна оболонка сайту (шапка, меню, банер, футер) для згенерованих сторінок.
// Береться з існуючої внутрішньої сторінки дзеркала, щоб стиль був єдиним.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE_URL = (process.env.SITE_URL || 'https://www.waldorf-stupeni.school').replace(/\/$/, '');
const TEMPLATE = path.join(ROOT, 'about-us', 'history', 'index.html');

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * @param {object} o
 * @param {string} o.title       Заголовок сторінки (банер + <title>)
 * @param {string} o.bodyHtml    Вміст під банером (всередині .content)
 * @param {string} o.urlPath     Шлях сторінки для canonical, напр. "/p/vstup"
 * @param {Array<[string,string]>} [o.crumbs] Хлібні крихти [[label, href], ...] (без «Головна» і поточної)
 * @param {string} [o.description]
 * @param {string} [o.extraHead] Додатковий HTML у <head>
 * @param {string} [o.scripts]   HTML скриптів перед </body>
 * @param {string} [o.after]     HTML після .content (напр. блоки .levels)
 */
function wrapInShell(o) {
  let tpl;
  try { tpl = fs.readFileSync(TEMPLATE, 'utf8'); } catch { return null; }
  const url = SITE_URL + (o.urlPath || '/');
  const plain = String(o.bodyHtml || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const desc = escapeHtml(o.description || plain.slice(0, 155) || o.title + ' — Вальдорфський ліцей «Ступені»');
  const crumbs = [['Головна', '/'], ...(o.crumbs || [])]
    .map(([l, h]) => `<a href="${escapeHtml(h)}">${escapeHtml(l)}</a>`)
    .concat([`<span class="current-item">${escapeHtml(o.title)}</span>`])
    .join(' &gt; ');
  const main = `<main class="page">
		<div class="banner rel" style="background: url('/wp-content/themes/waldorf/images/banner.jpg') center no-repeat; background-size: 100%;">
			<div class="info-bg"><div class="info rel flex"><h1>${escapeHtml(o.title)}</h1></div></div>
		</div>
		<div class="content">
			<div class="breadcrumbs">${crumbs}</div>
			<div class="cms-body">${o.bodyHtml || ''}</div>
		</div>
		${o.after || ''}
	</main>`;
  let html = tpl
    .replace(/<main class="page">[\s\S]*?<\/main>/, () => main)
    .replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(o.title)} | "Ступені" Вальдорфський ліцей і дитячий садок</title>`)
    .replace(/<link rel="canonical"[^>]*>/, () => `<link rel="canonical" href="${url}" />`)
    .replace(/<meta name="description"[^>]*>/, () => `<meta name="description" content="${desc}" />`)
    .replace(/<meta property="og:title"[^>]*>/, () => `<meta property="og:title" content="${escapeHtml(o.title)}" />`)
    .replace(/<meta property="og:description"[^>]*>/, () => `<meta property="og:description" content="${desc}" />`)
    .replace(/<meta property="og:url"[^>]*>/, () => `<meta property="og:url" content="${url}" />`)
    .replace(/ current-menu-item| current_page_item| current-menu-parent| current-menu-ancestor| current-page-ancestor| current_page_parent| current_page_ancestor| current-page-parent/g, '')
    .replace(/ aria-current="page"/g, '')
    .replace(/(src|href)="\.\.\/\.\.\//g, '$1="/')
    .replace(/(src|href)="\.\.\//g, '$1="/about-us/')
    .replace(/(src|href)="\.\//g, '$1="/about-us/history/')
    /* SQ-PATHS: те саме для одинарних лапок і url() */
    .replace(/(src|href)='\.\.\/\.\.\//g, "$1='/")
    .replace(/(src|href)='\.\.\//g, "$1='/about-us/")
    .replace(/(src|href)='\.\//g, "$1='/about-us/history/")
    .replace(/url\((['"]?)\.\.\/\.\.\//g, 'url($1/');
  if (o.extraHead) html = html.replace('</head>', o.extraHead + '\n</head>');
  if (o.scripts) html = html.replace(/<\/body>/i, o.scripts + '\n</body>');
  try { html = require('./content').applyBanner(html, o.urlPath); html = require('./content').applyNav(html, o.urlPath); } catch { /* */ }
  return html;
}

module.exports = { wrapInShell, escapeHtml, SITE_URL };
