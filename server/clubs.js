// «Гуртки та майстер-класи»: data/clubs.json, сторінки /about-us/hurtky/ та /about-us/hurtky/<slug>/
const { createCollection } = require('./routes/collection');
const { wrapInShell, escapeHtml: esc } = require('./site-shell');

const BASE = '/about-us/hurtky/';
const PENDING = 'Інформація уточнюється';
const clubs = createCollection({
  file: 'clubs.json',
  fields: { title: 's', slug: 's', kind: 's', age: 's', short: 's', description: 's', detail: 's', schedule: 's', leader: 's', image: 's', imagePos: 's', cardImage: 's', gallery: 'links', hasPage: 'bool', order: 'number', visible: 'bool' },
});

const SEED = { items: [
  { id: 'club-acting', order: 10, visible: true, hasPage: false, slug: 'aktorska-maysternist', kind: 'Гурток', title: 'Акторська майстерність', age: '', image: '', imagePos: '', schedule: '', leader: '',
    short: 'Голос, рух, імпровізація і робота в ансамблі.',
    description: 'На заняттях діти вчаться володіти голосом і тілом, імпровізувати, слухати партнера по сцені і працювати разом над спільною виставою. Театр розвиває уяву, мовлення, впевненість у собі та вміння бути частиною команди.\nУ вальдорфській школі театр — звична частина навчання: класи ставлять п’єси протягом усіх років, а в старших класах готують великі вистави. Гурток продовжує цю традицію поза уроками.' },
  { id: 'club-parkour', order: 20, visible: true, hasPage: false, slug: 'parkur', kind: 'Гурток', title: 'Паркур', age: '', image: '', imagePos: '', schedule: '', leader: '',
    short: 'Безпечне подолання перешкод, сила, спритність і координація.',
    description: 'Паркур — це вміння рухатися вільно й упевнено: бігати, стрибати, перелазити й балансувати, долаючи перешкоди. На тренуваннях діти розвивають силу, спритність, координацію, відчуття власного тіла і вчаться оцінювати ризик.\nВальдорфська педагогіка надає руху великого значення: через рух дитина пізнає простір і себе, а подолання складної перешкоди виховує волю й наполегливість.' },
  { id: 'club-wood', order: 30, visible: true, hasPage: true, slug: 'rizba-po-derevu', kind: 'Майстер-клас', title: 'Різьба по дереву', age: '', image: '', imagePos: '', schedule: '', leader: '',
    short: 'Справжній інструмент, жива деревина і річ, зроблена власними руками.',
    description: 'Учасники працюють зі справжнім деревом і ручним інструментом: вчаться відчувати матеріал, планувати роботу і доводити її до кінця. Результат — річ, створена власними руками.\nДетальніше про заняття — на окремій сторінці.',
    detail: '## Чому дерево\nДерево — живий, теплий матеріал. Воно має волокна, напрям і характер, тож кожен виріб вимагає уваги та поваги до матеріалу. Робота з деревом вчить терпіння: поспіх тут одразу видно.\n## Що розвиває\nРізьблення тренує дрібну моторику, точність рухів, просторове мислення і зосередженість. Дитина вчиться планувати роботу кроками, безпечно поводитися з інструментом і доводити задум до готової речі.\n## Зв’язок з вальдорфською педагогікою\nУ вальдорфській школі ремесла — не додаток, а частина навчання: від в’язання і шиття в молодших класах до роботи з деревом, металом і глиною в старших. Праця руками виховує волю, а створена річ дає дитині відчуття «я можу».\n## Як проходять заняття\nФормат, вік учасників, розклад і керівника буде оголошено додатково. Слідкуйте за новинами або запитайте в адміністрації школи.' },
] };

const paras = (t) => String(t || '').split(/\n+/).map((s) => s.trim()).filter(Boolean);
const md = (t) => paras(t).map((l) => (l.startsWith('## ') ? `<h3>${esc(l.slice(3))}</h3>` : `<p>${esc(l)}</p>`)).join('\n');
const url = (c) => BASE + encodeURIComponent(c.slug) + '/';

function pic(src, alt, cls, pos) {
  const m = String(src).match(/^(\/data\/uploads\/rizba\/[\w-]+)\.jpg$/);
  const img = `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy"${cls ? ` class="${cls}"` : ''}${pos ? ` style="object-position:${esc(pos)}"` : ''}>`;
  return m ? `<picture><source srcset="${m[1]}.webp" type="image/webp">${img}</picture>` : img;
}
function photo(c, card) {
  const src = card && c.cardImage ? c.cardImage : c.image;
  if (src) return pic(src, c.title, '', c.imagePos);
  if (false) return `<img src="${esc(c.image)}" alt="${esc(c.title)}" loading="lazy"${c.imagePos ? ` style="object-position:${esc(c.imagePos)}"` : ''}>`;
  return `<div class="st-club-ph" role="img" aria-label="Фото незабаром"><span class="st-club-ph__icon">✦</span><b>${esc(c.title)}</b><small>Фото незабаром</small></div>`;
}
function gallery(c) {
  const g = (c.gallery || []).filter((x) => x.url); if (!g.length) return '';
  const th = (u) => { const m = String(u).match(/^(\/data\/uploads\/rizba\/[\w-]+)\.jpg$/); return m ? m[1] + '-sm.webp' : u; };
  return `<h3>Галерея робіт</h3><div class="st-club-gallery">${g.map((x, i) => `<a href="${esc(x.url)}" class="st-club-gallery__item" data-i="${i}" aria-label="Відкрити фото ${i + 1}"><img src="${esc(th(x.url))}" alt="${esc(x.label || c.title)}" loading="lazy"></a>`).join('')}</div>
<div class="st-lightbox" hidden><button type="button" class="st-lb-close" aria-label="Закрити">×</button><button type="button" class="st-lb-prev" aria-label="Попереднє">‹</button><img alt=""><button type="button" class="st-lb-next" aria-label="Наступне">›</button></div>
<script>(function(){var a=[].slice.call(document.querySelectorAll('.st-club-gallery__item')),lb=document.querySelector('.st-lightbox'),im=lb.querySelector('img'),i=0;document.body.appendChild(lb);function show(n){i=(n+a.length)%a.length;im.src=a[i].getAttribute('href');im.alt=a[i].querySelector('img').alt;lb.hidden=false;document.body.style.overflow='hidden';}function hide(){lb.hidden=true;document.body.style.overflow='';}a.forEach(function(el,n){el.addEventListener('click',function(e){e.preventDefault();show(n);});});lb.querySelector('.st-lb-close').onclick=hide;lb.querySelector('.st-lb-prev').onclick=function(){show(i-1)};lb.querySelector('.st-lb-next').onclick=function(){show(i+1)};lb.addEventListener('click',function(e){if(e.target===lb)hide();});document.addEventListener('keydown',function(e){if(lb.hidden)return;if(e.key==='Escape')hide();if(e.key==='ArrowLeft')show(i-1);if(e.key==='ArrowRight')show(i+1);});})();</script>`;
}
function facts(c) {
  const row = (l, v) => `<li><span>${l}:</span> ${v ? esc(v) : `<em class="info-pending-inline">${PENDING}</em>`}</li>`;
  return `<ul class="st-club-facts">${row('Вік', c.age)}${row('Розклад', c.schedule)}${row('Керівник', c.leader)}</ul>`;
}

function renderList(items) {
  const lv = items.map((c, i) => `
			<div class="level flex st-club" id="${esc(c.slug)}">
				<div class="level-photo">${photo(c, true)}</div>
				<div class="info">
					<p class="st-club-kind">${esc(c.kind || 'Гурток')}</p>
					<h3>${esc(c.title)}</h3>
					<div class="desc">${c.short ? `<p><strong>${esc(c.short)}</strong></p>` : ''}${md(c.description)}${facts(c)}</div>
					<div class="st-actions">${c.hasPage ? `<a class="btn orange" href="${url(c)}">Детальніше →</a>` : ''}<a class="btn" href="/contacts/">Записатися / запитати</a></div>
				</div>
			</div>`).join('\n');
  return `<div class="levels rel flex" id="levels">
			<h2>Гуртки та майстер-класи</h2>
			<div class="st-intro"><p>На базі школи працюють гуртки та майстер-класи для дітей. Вони продовжують те, що важливе для вальдорфської педагогіки: рух, мистецтво і роботу руками.</p><p>Розклад, вік учасників і керівників уточнюємо — актуальну інформацію можна отримати в адміністрації школи.</p></div>
${lv || `<p class="info-pending">${PENDING}</p>`}
		</div>`;
}

function mount(app, admin, requirePermission) {
  const { readJson, writeJson } = require('./store');
  const d = readJson('clubs.json', { items: [] }); if (!d.items || !d.items.length) writeJson('clubs.json', SEED);
  admin.use('/clubs', requirePermission('pages'), clubs.createAdminRouter());
  const slash = (q, res, next) => (q.originalUrl.split('?')[0].endsWith('/') ? next() : res.redirect(301, q.originalUrl.split('?')[0] + '/'));
  app.get('/about-us/hurtky', slash);
  app.get('/about-us/hurtky/', (_q, res) => {
    const html = wrapInShell({ title: 'Гуртки та майстер-класи', urlPath: BASE, crumbs: [['Про нас', '/about-us/']], description: 'Гуртки та майстер-класи на базі Вальдорфського ліцею «Ступені»: акторська майстерність, паркур, різьба по дереву.', bodyHtml: '', after: renderList(clubs.publicList()) });
    res.type('html').send(html);
  });
  app.get('/about-us/hurtky/:slug', slash);
  app.get('/about-us/hurtky/:slug/', (q, res, next) => {
    const c = clubs.publicList().find((x) => x.slug === q.params.slug && x.hasPage); if (!c) return next();
    const body = `<div class="st-club-page">
	<div class="st-club-hero">${photo(c)}</div>
	<p class="st-club-kind">${esc(c.kind || 'Гурток')}</p>
	${c.short ? `<p class="st-club-lead">${esc(c.short)}</p>` : ''}
	${md(c.detail || c.description)}
	${gallery(c)}
	<h3>Організаційна інформація</h3>${facts(c)}
	<div class="st-actions"><a class="btn orange" href="/contacts/">Записатися / запитати</a><a class="btn" href="${BASE}">← Усі гуртки</a></div>
</div>`;
    res.type('html').send(wrapInShell({ title: c.title, urlPath: url(c), crumbs: [['Про нас', '/about-us/'], ['Гуртки та майстер-класи', BASE]], description: c.short || c.title, bodyHtml: body }));
  });
}
module.exports = { mount };
