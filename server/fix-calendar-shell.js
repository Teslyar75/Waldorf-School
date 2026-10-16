const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const newsPath = path.join(root, 'news', 'index.html');
const calPath = path.join(root, 'nash-kalendar', 'index.html');

const news = fs.readFileSync(newsPath, 'utf8');
const cal = fs.readFileSync(calPath, 'utf8');

const headerMatch = news.match(/<div class="blur"><\/div>[\s\S]*?<\/header>/);
const footerMatch = news.match(/<footer>[\s\S]*?<\/footer>/);
if (!headerMatch || !footerMatch) {
  console.error('extract fail', !!headerMatch, !!footerMatch);
  process.exit(1);
}

let header = headerMatch[0];
let footer = footerMatch[0];

header = header
  .replace(/current-menu-item page_item page-item-267 current_page_item /g, '')
  .replace(/href="\.\/index\.html" aria-current="page"/g, 'href="../news/index.html"')
  .replace(
    /(<li class="menu-item menu-item-type-custom menu-item-object-custom menu-item-calendar)("><a href="\.\.\/nash-kalendar\/")/g,
    '$1 current-menu-item$2'
  )
  .replace(
    /menu-item-calendar current-menu-item"><a href="\.\.\/nash-kalendar\/"/g,
    'menu-item-calendar current-menu-item"><a href="./" aria-current="page"'
  );

footer = footer
  .replace(/current-menu-item page_item page-item-267 current_page_item /g, '')
  .replace(
    /href="\.\/index\.html" aria-current="page" itemprop="url" class="navigate">Новини/g,
    'href="../news/index.html" itemprop="url" class="navigate">Новини'
  )
  .replace(
    /(<li class="menu-item menu-item-type-custom menu-item-object-custom menu-item-calendar)("><a href="\.\.\/nash-kalendar\/")/g,
    '$1 current-menu-item$2'
  )
  .replace(
    /menu-item-calendar current-menu-item"><a href="\.\.\/nash-kalendar\/"/g,
    'menu-item-calendar current-menu-item"><a href="./" aria-current="page"'
  );

let calInnerMatch = cal.match(/<main class="cal-wrap">[\s\S]*?<\/main>/);
if (!calInnerMatch) {
  calInnerMatch = cal.match(/<div class="cal-wrap">[\s\S]*?<\/div>\s*(?=<footer|<\/main>|<script)/);
}
if (!calInnerMatch) {
  // already wrapped or different structure — extract from cal-hero through cal-list
  const start = cal.indexOf('class="cal-wrap"');
  if (start === -1) {
    console.error('calendar content not found');
    process.exit(1);
  }
}

let calInner = cal.match(/<main class="cal-wrap">[\s\S]*?<\/main>/);
if (calInner) {
  calInner = calInner[0]
    .replace('<main class="cal-wrap">', '<div class="cal-wrap">')
    .replace(/<\/main>$/, '</div>');
} else if (cal.includes('class="cal-wrap"')) {
  // keep existing wrap div if present inside main.page
  const m = cal.match(/<div class="cal-wrap">[\s\S]*?<\/div>\s*(?=\s*<\/main>)/);
  calInner = m ? m[0] : null;
}

if (!calInner) {
  console.error('could not extract calendar body');
  process.exit(1);
}

const afterFooter = news.split('</footer>')[1] || '';
const readyStart = afterFooter.indexOf('$(document).ready');
const firstScriptStart = afterFooter.lastIndexOf('<script>', readyStart);
const fixIdx = afterFooter.indexOf('function fixHeader');
const fixScriptEnd = afterFooter.indexOf('</script>', fixIdx) + '</script>'.length;
const siteScripts = afterFooter.substring(firstScriptStart, fixScriptEnd);

const html = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Календар — Ступені</title>
  <link rel="stylesheet" href="../wp-content/themes/waldorf/style.css" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <link rel="stylesheet" href="./calendar.css" />
  <script src="../wp-content/themes/waldorf/js/jquery-3.7.0.min.js"></script>
  <link rel="icon" href="../wp-content/uploads/2023/08/logo-150x150.png" sizes="32x32" />
</head>
<body class="school-calendar-page">
  ${header}

  <main class="page school-calendar">
    ${calInner}
  </main>

  ${footer}

  ${siteScripts}
  <script src="./calendar.js"></script>
</body>
</html>
`;

fs.writeFileSync(calPath, html, 'utf8');
console.log({
  ok: true,
  bytes: html.length,
  hasFooter: html.includes('<footer>'),
  hasHeader: html.includes('id="header"'),
  calCurrent: html.includes('menu-item-calendar current-menu-item'),
});
