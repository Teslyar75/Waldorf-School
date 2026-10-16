const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pagePath = path.join(root, 'about-us', 'dokumenty', 'index.html');
const cssPath = path.join(root, 'wp-content', 'themes', 'waldorf', 'style.css');

const docs = [
  {
    id: 'statut',
    file: 'statut.pdf',
    title: 'Статут ліцею',
    note: 'Установчий документ навчального закладу',
  },
  {
    id: 'licenziya',
    file: 'licenziya.pdf',
    title: 'Ліцензія на освітню діяльність',
    note: 'Ліцензія на провадження освітньої діяльності',
  },
  {
    id: 'programa',
    file: 'osvitnya-programa.pdf',
    title: 'Освітня програма',
    note: 'Освітня програма ліцею',
  },
  {
    id: 'plan-roboty',
    file: 'richnyy-plan-roboty-2026-2027.pdf',
    title: 'Річний план роботи 2026/2027',
    note: 'План роботи на навчальний рік',
  },
  {
    id: 'plan-vyhovna',
    file: 'richnyy-plan-vyhovnoyi-roboty.pdf',
    title: 'Річний план виховної роботи',
    note: 'План виховної роботи',
  },
  {
    id: 'nasylstvo',
    file: 'protydiya-nasylstvu.pdf',
    title: 'Про запобігання і протидію насильству',
    note: 'Документ з протидії насильству',
  },
];

const docsJson = JSON.stringify(
  docs.map((d) => ({
    id: d.id,
    title: d.title,
    note: d.note,
    src: `../../wp-content/uploads/dokumenty/${d.file}`,
  }))
);

const thumbs = docs
  .map(
    (d, i) =>
      `					<button type="button" class="school-docs__thumb" data-index="${i}" aria-label="${d.title}">
						<span class="school-docs__thumb-num">${i + 1}</span>
						<span class="school-docs__thumb-title">${d.title}</span>
					</button>`
  )
  .join('\n');

const section = `			<section class="school-docs" id="school-docs">
				<p class="school-docs__lead">Офіційні документи Вальдорфського ліцею «Ступені». Листайте стрілками або оберіть документ знизу — PDF відкривається для читання прямо на сторінці.</p>

				<div class="school-docs__viewer-wrap">
					<div class="school-docs__toolbar">
						<button type="button" class="btn orange school-docs__nav" id="docs-prev" aria-label="Попередній документ">‹</button>
						<div class="school-docs__heading">
							<p class="school-docs__counter" id="docs-counter">1 / ${docs.length}</p>
							<h2 id="docs-title">${docs[0].title}</h2>
							<p class="school-docs__note" id="docs-note">${docs[0].note}</p>
						</div>
						<button type="button" class="btn orange school-docs__nav" id="docs-next" aria-label="Наступний документ">›</button>
					</div>

					<div class="school-docs__stage">
						<iframe id="docs-frame" class="school-docs__frame" title="${docs[0].title}" src="../../wp-content/uploads/dokumenty/${docs[0].file}#toolbar=1&navpanes=0&view=FitH"></iframe>
					</div>

					<div class="school-docs__actions">
						<a class="btn orange" id="docs-open" href="../../wp-content/uploads/dokumenty/${docs[0].file}" target="_blank" rel="noopener">Відкрити у новій вкладці</a>
						<a class="btn" id="docs-download" href="../../wp-content/uploads/dokumenty/${docs[0].file}" download>Завантажити PDF</a>
					</div>
				</div>

				<div class="school-docs__thumbs" role="tablist" aria-label="Список документів">
${thumbs}
				</div>
			</section>
			<script>
			(function () {
				var docs = ${docsJson};
				var index = 0;
				var frame = document.getElementById('docs-frame');
				var titleEl = document.getElementById('docs-title');
				var noteEl = document.getElementById('docs-note');
				var counterEl = document.getElementById('docs-counter');
				var openEl = document.getElementById('docs-open');
				var downloadEl = document.getElementById('docs-download');
				var thumbs = Array.prototype.slice.call(document.querySelectorAll('.school-docs__thumb'));

				function show(i) {
					if (i < 0) i = docs.length - 1;
					if (i >= docs.length) i = 0;
					index = i;
					var doc = docs[index];
					frame.src = doc.src + '#toolbar=1&navpanes=0&view=FitH';
					frame.title = doc.title;
					titleEl.textContent = doc.title;
					noteEl.textContent = doc.note;
					counterEl.textContent = (index + 1) + ' / ' + docs.length;
					openEl.href = doc.src;
					downloadEl.href = doc.src;
					thumbs.forEach(function (btn, n) {
						btn.classList.toggle('is-active', n === index);
						btn.setAttribute('aria-selected', n === index ? 'true' : 'false');
					});
				}

				document.getElementById('docs-prev').addEventListener('click', function () { show(index - 1); });
				document.getElementById('docs-next').addEventListener('click', function () { show(index + 1); });
				thumbs.forEach(function (btn) {
					btn.addEventListener('click', function () {
						show(parseInt(btn.getAttribute('data-index'), 10));
					});
				});
				document.addEventListener('keydown', function (e) {
					if (!document.getElementById('school-docs')) return;
					if (e.key === 'ArrowLeft') show(index - 1);
					if (e.key === 'ArrowRight') show(index + 1);
				});
				show(0);
			})();
			</script>`;

let page = fs.readFileSync(pagePath, 'utf8');
page = page.replace(/<section class="school-docs"[\s\S]*?<\/section>(?:\s*<script>[\s\S]*?<\/script>)?/, section);
page = page.replace(
  /action="\/about-us\/history\/#wpcf7-f254-o1"/,
  'action="/about-us/dokumenty/#wpcf7-f254-o1"'
);
fs.writeFileSync(pagePath, page, 'utf8');

const mark = '/* --- school documents page --- */';
const cssBlock = `${mark}
.school-docs {
  max-width: 1040px;
  margin: 0 auto;
  padding: 0.5rem 0 3.5rem;
}
.school-docs__lead {
  margin: 0 0 1.75rem;
  text-align: center;
  font-size: clamp(1.15rem, 1.8vw, 1.4rem);
  line-height: 1.55;
  text-transform: none;
  font-family: BaarLemuria, Georgia, serif;
  color: #5b5056;
}
.school-docs__viewer-wrap {
  position: relative;
  background: #fff6eb;
  padding: 1.25rem 1.1rem 1.4rem;
  margin-bottom: 1.5rem;
  overflow: hidden;
}
.school-docs__viewer-wrap::after {
  content: "";
  position: absolute;
  inset: -2%;
  background: url(./images/border-levels-home.png) center no-repeat;
  background-size: 100% 100%;
  pointer-events: none;
  z-index: 2;
}
.school-docs__toolbar,
.school-docs__stage,
.school-docs__actions {
  position: relative;
  z-index: 3;
}
.school-docs__toolbar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1rem;
}
.school-docs__heading {
  text-align: center;
  min-width: 0;
}
.school-docs__counter {
  margin: 0 0 0.35rem;
  font-family: Antropos, Georgia, serif;
  font-size: 0.95rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #5b5056;
}
.school-docs__heading h2 {
  margin: 0 0 0.35rem;
  font-family: Antropos, Georgia, serif;
  font-size: clamp(1.35rem, 2.4vw, 1.9rem);
  line-height: 1.15;
  font-weight: 400;
  text-transform: uppercase;
  color: #f08b3b;
}
.school-docs__note {
  margin: 0;
  font-family: BaarLemuria, Georgia, serif;
  font-size: clamp(1rem, 1.5vw, 1.2rem);
  line-height: 1.35;
  text-transform: none;
  color: #5b5056;
}
.school-docs__nav {
  min-width: 3rem;
  min-height: 3rem;
  border: none;
  border-radius: 50%;
  font-size: 1.8rem;
  line-height: 1;
  padding: 0.35rem 0.75rem;
  cursor: pointer;
  font-family: Antropos, Georgia, serif;
}
.school-docs__stage {
  background: #fff;
  border: 1px solid rgba(240, 139, 59, 0.28);
  box-shadow: 0 8px 22px rgba(91, 80, 86, 0.08);
}
.school-docs__frame {
  display: block;
  width: 100%;
  height: min(78vh, 920px);
  min-height: 560px;
  border: 0;
  background: #f4eee6;
}
.school-docs__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.7rem;
  margin-top: 1rem;
}
.school-docs__actions .btn {
  display: inline-block;
  text-transform: uppercase;
  font-family: Antropos, Georgia, serif;
  font-size: 0.95rem;
  padding: 0.75rem 1.25rem;
  border-radius: 2rem;
  line-height: 1;
  border: none;
}
.school-docs__actions .btn:not(.orange) {
  background: #fff;
  color: #343537;
  box-shadow: inset 0 0 0 1px rgba(91, 80, 86, 0.22);
}
.school-docs__actions .btn:not(.orange):hover {
  color: #f08b3b;
}
.school-docs__thumbs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}
.school-docs__thumb {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.4rem;
  text-align: left;
  padding: 0.9rem 0.95rem;
  border: 1px solid rgba(240, 139, 59, 0.28);
  background: #fff6eb;
  cursor: pointer;
  transition: all .25s;
  font: inherit;
  color: #343537;
}
.school-docs__thumb:hover,
.school-docs__thumb.is-active {
  background: #fff;
  border-color: #f08b3b;
  box-shadow: 0 6px 16px rgba(240, 139, 59, 0.18);
}
.school-docs__thumb-num {
  font-family: Antropos, Georgia, serif;
  font-size: 0.9rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #f08b3b;
}
.school-docs__thumb-title {
  font-family: Antropos, Georgia, serif;
  font-size: clamp(0.95rem, 1.4vw, 1.1rem);
  line-height: 1.25;
  text-transform: uppercase;
  color: #343537;
}
.school-docs__thumb.is-active .school-docs__thumb-title {
  color: #f08b3b;
}
@media (max-width: 900px) {
  .school-docs__thumbs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 640px) {
  .school-docs__toolbar {
    grid-template-columns: 1fr 1fr;
    grid-template-areas:
      "heading heading"
      "prev next";
  }
  .school-docs__heading { grid-area: heading; }
  #docs-prev { grid-area: prev; justify-self: start; }
  #docs-next { grid-area: next; justify-self: end; }
  .school-docs__frame {
    min-height: 65vh;
    height: 70vh;
  }
  .school-docs__thumbs {
    grid-template-columns: 1fr;
  }
}
`;

let css = fs.readFileSync(cssPath, 'utf8');
const idx = css.indexOf(mark);
if (idx !== -1) css = css.slice(0, idx) + cssBlock;
else css += '\n' + cssBlock;
fs.writeFileSync(cssPath, css, 'utf8');
console.log('docs flipper ready', docs.length);
