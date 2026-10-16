const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const srcDir = String.raw`c:\Users\mi\OneDrive\Рабочий стол\документы школы`;
const destDir = path.join(root, 'wp-content', 'uploads', 'dokumenty');
const histPath = path.join(root, 'about-us', 'history', 'index.html');
const pagePath = path.join(root, 'about-us', 'dokumenty', 'index.html');
const methodPath = path.join(root, 'about-us', 'methodical-materials', 'index.html');

fs.mkdirSync(destDir, { recursive: true });
fs.mkdirSync(path.dirname(pagePath), { recursive: true });

const files = [
  {
    src: '1 ЛІЦЕЙ_Статут.pdf',
    dest: 'statut.pdf',
    title: 'Статут ліцею',
    type: 'pdf',
  },
  {
    src: '2 ЛІЦЕЙ_ліцензія_2.pdf',
    dest: 'licenziya.pdf',
    title: 'Ліцензія на освітню діяльність',
    type: 'pdf',
  },
  {
    src: '3 ОСВІТНЯ ПРОГРАМА.pdf',
    dest: 'osvitnya-programa.pdf',
    title: 'Освітня програма',
    type: 'pdf',
  },
  {
    src: '4 РІЧНИЙ ПЛАН РОБОТИ_2026_2027.pdf',
    dest: 'richnyy-plan-roboty-2026-2027.pdf',
    title: 'Річний план роботи 2026/2027',
    type: 'pdf',
  },
  {
    src: '5 РІЧНИЙ ПЛАН ВИХОВНОЇ РОБОТИ.pdf',
    dest: 'richnyy-plan-vyhovnoyi-roboty.pdf',
    title: 'Річний план виховної роботи',
    type: 'pdf',
  },
  {
    src: '6 Про запобігання і протидію насильству.pdf',
    dest: 'protydiya-nasylstvu.pdf',
    title: 'Про запобігання і протидію насильству',
    type: 'pdf',
  },
];

for (const f of files) {
  const from = path.join(srcDir, f.src);
  const to = path.join(destDir, f.dest);
  if (!fs.existsSync(from)) {
    console.warn('missing', f.src);
    continue;
  }
  fs.copyFileSync(from, to);
  console.log('copied', f.dest, fs.statSync(to).size);
}

// Build page from history template (correct menus + dokumenty link)
let page = fs.readFileSync(histPath, 'utf8');

page = page.replace(
  /<title>Історія школи \|/,
  '<title>Документи |'
);

// Fix about submenu: history current -> normal; dokumenty current
page = page.replace(
  /(<li id="menu-item-136"[^>]*) current-menu-item page_item page-item-\d+ current_page_item([^>]*>)(<a href="\.\/index\.html" aria-current="page"[^>]*>Історія школи<\/a>)/g,
  '$1$2<a href="../history/index.html" itemprop="url" class="navigate">Історія школи</a>'
);
page = page.replace(
  /(<li id="menu-item-193"[^>]*) current-menu-item page_item page-item-\d+ current_page_item([^>]*>)(<a href="\.\/index\.html" aria-current="page"[^>]*>Історія школи<\/a>)/g,
  '$1$2<a href="../history/index.html" itemprop="url" class="navigate">Історія школи</a>'
);
page = page.replace(
  /href="\.\/index\.html" aria-current="page" itemprop="url" class="navigate">Історія школи<\/a>/g,
  'href="../history/index.html" itemprop="url" class="navigate">Історія школи</a>'
);

// Ensure dokumenty item is current
page = page.replace(
  /<li class="menu-item menu-item-type-custom menu-item-object-custom menu-item-dokumenty"><a href="\.\.\/dokumenty\/index\.html" itemprop="url" class="navigate">Документи<\/a><\/li>/g,
  '<li class="menu-item menu-item-type-custom menu-item-object-custom menu-item-dokumenty current-menu-item"><a href="./index.html" aria-current="page" itemprop="url" class="navigate">Документи</a></li>'
);

page = page.replace(
  /<h1>\s*Історія школи\s*<\/h1>/,
  '<h1>Документи</h1>'
);

page = page.replace(
  /current-item">Історія школи<\/span><meta property="url" content="\.\/index\.html"/,
  'current-item">Документи</span><meta property="url" content="./index.html"'
);

const docsHtml = files
  .map((f) => {
    const href = `../../wp-content/uploads/dokumenty/${f.dest}`;
    if (f.type === 'image') {
      return `<article class="school-doc school-doc--image">
  <h2>${f.title}</h2>
  <a class="school-doc__preview" href="${href}" target="_blank" rel="noopener">
    <img src="${href}" alt="${f.title}" loading="lazy" />
    <span class="school-doc__open">Відкрити на весь екран</span>
  </a>
</article>`;
    }
    return `<article class="school-doc school-doc--pdf">
  <h2>${f.title}</h2>
  <div class="school-doc__actions">
    <a class="btn orange" href="${href}" target="_blank" rel="noopener">Читати</a>
    <a class="btn" href="${href}" download>Завантажити</a>
  </div>
  <iframe class="school-doc__frame" src="${href}#view=FitH" title="${f.title}" loading="lazy"></iframe>
</article>`;
  })
  .join('\n');

const contentBlock = `		<div class="content">
							<div class="breadcrumbs" xmlns:v="http://rdf.data-vocabulary.org/#">
					<span property="itemListElement" typeof="ListItem"><a property="item" typeof="WebPage" title="Перейти на Головну." href="../../index.html" class="home" ><span property="name">Головна</span></a><meta property="position" content="1"></span> &gt; <span property="itemListElement" typeof="ListItem"><a property="item" typeof="WebPage" title="Перейти до Про нас." href="../index.html" class="post post-page" ><span property="name">Про нас</span></a><meta property="position" content="2"></span> &gt; <span property="itemListElement" typeof="ListItem"><span property="name" class="post post-page current-item">Документи</span><meta property="url" content="./index.html"><meta property="position" content="3"></span>				</div>
			<section class="school-docs">
				<p class="school-docs__lead">Офіційні документи Вальдорфського ліцею «Ступені». Натисніть «Читати», щоб відкрити файл у новій вкладці, або перегляньте прямо на сторінці.</p>
${docsHtml}
			</section>
		</div>`;

page = page.replace(
  /<div class="content">[\s\S]*?<\/div>\s*<\/main>/,
  contentBlock + '\n\t</main>'
);

// footer history current item if any
page = page.replace(
  /class="menu-item menu-item-type-post_type menu-item-object-page current-menu-item page_item page-item-\d+ current_page_item menu-item-193"><a href="\.\/index\.html" aria-current="page" itemprop="url" class="navigate">Історія школи<\/a>/g,
  'class="menu-item menu-item-type-post_type menu-item-object-page menu-item-193"><a href="../history/index.html" itemprop="url" class="navigate">Історія школи</a>'
);

fs.writeFileSync(pagePath, page, 'utf8');

// Add dokumenty link on methodical-materials if missing
let method = fs.readFileSync(methodPath, 'utf8');
if (!method.includes('menu-item-dokumenty')) {
  method = method.replace(
    /(>Методичні матеріали<\/a><\/li>)/g,
    `$1\n\t<li class="menu-item menu-item-type-custom menu-item-object-custom menu-item-dokumenty"><a href="../dokumenty/index.html" itemprop="url" class="navigate">Документи</a></li>`
  );
  fs.writeFileSync(methodPath, method, 'utf8');
}

// CSS for docs
const cssPath = path.join(root, 'wp-content', 'themes', 'waldorf', 'style.css');
let css = fs.readFileSync(cssPath, 'utf8');
const cssMark = '/* --- school documents page --- */';
const cssBlock = `
${cssMark}
.school-docs {
  max-width: 920px;
  margin: 0 auto;
  padding: 1rem 0 3rem;
}
.school-docs__lead {
  margin: 0 0 2rem;
  font-size: 1.15rem;
  line-height: 1.5;
  text-transform: none;
  font-family: BaarLemuria, Georgia, serif;
}
.school-doc {
  margin: 0 0 2.5rem;
  padding: 1.25rem 1.25rem 1.5rem;
  background: #fff;
  border: 1px solid rgba(91, 80, 86, 0.12);
}
.school-doc h2 {
  margin: 0 0 1rem;
  font-size: clamp(1.2rem, 2vw, 1.6rem);
  color: #f08b3b;
  text-transform: uppercase;
  font-family: Antropos, Georgia, serif;
  font-weight: 400;
}
.school-doc__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.school-doc__actions .btn {
  display: inline-block;
  text-transform: uppercase;
  font-family: Antropos, Georgia, serif;
}
.school-doc__frame {
  width: 100%;
  min-height: 70vh;
  height: 820px;
  border: 1px solid rgba(91, 80, 86, 0.18);
  background: #f7f3ef;
}
.school-doc__preview {
  display: block;
  position: relative;
  text-align: center;
}
.school-doc__preview img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0 auto;
  box-shadow: 0 8px 24px rgba(0,0,0,.12);
}
.school-doc__open {
  display: inline-block;
  margin-top: 0.85rem;
  color: #f08b3b;
  text-transform: uppercase;
  font-family: Antropos, Georgia, serif;
}
.school-doc__preview:hover .school-doc__open {
  text-decoration: underline;
}
@media (max-width: 768px) {
  .school-doc__frame {
    min-height: 55vh;
    height: 65vh;
  }
}
`;

if (!css.includes(cssMark)) {
  fs.writeFileSync(cssPath, css + '\n' + cssBlock, 'utf8');
}

console.log({ page: pagePath, docs: files.length });
