// «Вальдорфські школи світу»: дані data/schools.json (колекція), сторінка /about-us/shkoly-svitu/
const { createCollection } = require('./routes/collection');
const { wrapInShell, escapeHtml: esc } = require('./site-shell');

const SECTIONS = [
  ['org', 'Міжнародні організації'],
  ['school', 'Відомі школи світу'],
  ['ua', 'Україна'],
  ['alumni', 'Відомі випускники'],
];
const schools = createCollection({
  file: 'schools.json',
  fields: { title: 's', section: 's', country: 's', flag: 's', description: 's', url: 's', linkLabel: 's', image: 's', order: 'number', visible: 'bool' },
});

const SEED = (() => {
  let n = 0; const S = (section, x) => ({ id: 'sch-' + (++n), order: n * 10, visible: true, section, image: '', linkLabel: 'Сайт', ...x });
  return { items: [
    S('org', { title: 'Freunde der Erziehungskunst Rudolf Steiners', country: 'Німеччина, Берлін', flag: '🇩🇪', description: 'Друзі вальдорфської педагогіки ведуть світовий список вальдорфських шкіл і садків, підтримують нові школи в різних країнах і співпрацюють, зокрема, з ЮНЕСКО та ECSWE.', url: 'https://www.freunde-waldorf.de/en/' }),
    S('org', { title: 'ECSWE — Європейська рада Штайнер-вальдорфської освіти', country: 'Бельгія, Брюссель', flag: '🇪🇺', description: 'Об’єднує національні вальдорфські асоціації європейських країн і представляє вальдорфську освіту в діалозі з інституціями ЄС. Серед членів є і українська асоціація.', url: 'https://ecswe.eu/' }),
    S('org', { title: 'Педагогічна секція Гетеанума', country: 'Швейцарія, Дорнах', flag: '🇨🇭', description: 'Міжнародний центр вальдорфської педагогіки: дослідження, конференції для вчителів з усього світу, спільна редакція світового списку шкіл.', url: 'https://www.goetheanum-paedagogik.ch/' }),
    S('org', { title: 'AWSNA — Асоціація вальдорфських шкіл Північної Америки', country: 'США та Канада', flag: '🇺🇸', description: 'Заснована 1968 року для підтримки вальдорфських шкіл і педагогічних інститутів у США та Канаді.', url: 'https://www.waldorfeducation.org/' }),
    S('org', { title: 'Waldorf UK (раніше Steiner Waldorf Schools Fellowship)', country: 'Велика Британія', flag: '🇬🇧', description: 'Об’єднання вальдорфських шкіл і садків Великої Британії, зареєстрована благодійна організація.', url: 'https://waldorfeducation.uk/' }),
    S('org', { title: 'IASWECE — Міжнародна асоціація вальдорфської дошкільної освіти', country: 'Міжнародна', flag: '🌍', description: 'Об’єднує вальдорфські дитячі садки світу і разом з Freunde der Erziehungskunst веде світовий список садків.', url: 'https://iaswece.org/' }),
    S('org', { title: 'Bund der Freien Waldorfschulen', country: 'Німеччина, Штутгарт', flag: '🇩🇪', description: 'Союз вільних вальдорфських шкіл Німеччини: 258 шкіл і близько 90 000 учнів (дані на січень 2026 року).', url: 'https://www.waldorfschule.de/' }),
    S('school', { title: 'Freie Waldorfschule Uhlandshöhe', country: 'Німеччина, Штутгарт', flag: '🇩🇪', description: 'Перша вальдорфська школа у світі: її відкрили у вересні 1919 року для дітей працівників фабрики «Waldorf-Astoria».', url: 'https://www.uhlandshoehe.de/' }),
    S('school', { title: 'Michael Hall', country: 'Велика Британія, Східний Сассекс', flag: '🇬🇧', description: 'Найстаріша Штайнер-школа Британії, заснована 1925 року. Близько 400 учнів віком від 3 до 18 років.', url: 'https://www.michaelhall.co.uk/' }),
    S('school', { title: 'Rudolf Steiner School', country: 'США, Нью-Йорк', flag: '🇺🇸', description: 'Вальдорфська школа в Нью-Йорку з дошкільною групою (Nursery).', url: 'https://www.steiner.edu/' }),
    S('school', { title: 'Waldorf School of the Peninsula', country: 'США, Кремнієва долина', flag: '🇺🇸', description: 'Школа з двома кампусами — у Лос-Альтосі (дошкілля – 5 клас) та Маунтин-В’ю (6–12 класи), у самому серці Кремнієвої долини.', url: 'https://www.waldorfpeninsula.org/' }),
    S('school', { title: 'Rudolf Steiner Schule Basel', country: 'Швейцарія, Базель', flag: '🇨🇭', description: 'Школа від дитячого садка до матури (швейцарського атестата зрілості).', url: 'https://www.steinerschule-basel.ch/' }),
    S('school', { title: 'Kristofferskolan', country: 'Швеція, Стокгольм (Бромма)', flag: '🇸🇪', description: 'Вальдорфська школа з 1 по 12 клас: ковальство, музика, театр, евритмія, палітурна справа поряд з математикою, фізикою й хімією.', url: 'https://kristofferskolan.se/' }),
    S('school', { title: 'Rudolf Steinerskolen i Oslo', country: 'Норвегія, Осло', flag: '🇳🇴', description: 'Найстаріша Штайнер-школа Норвегії, заснована 1926 року, близько 470 учнів. Посилання — на сайт норвезьких Штайнер-шкіл.', url: 'https://www.steinerskolen.no/' }),
    S('school', { title: 'Michael Park School', country: 'Нова Зеландія, Окленд', flag: '🇳🇿', description: 'Вальдорфська школа, що працює з 1979 року; приймає дітей від 2 до 18 років — від ігрової групи до старших класів.', url: 'https://michaelpark.school.nz/' }),
    S('school', { title: 'Асоціація вальдорфської освіти Ізраїлю', country: 'Ізраїль', flag: '🇮🇱', description: 'Громадська організація, що розвиває освіту, натхненну вальдорфською педагогікою, і об’єднує вальдорфські садки та школи країни.', url: 'https://www.waldorf.org.il/' }),
    S('ua', { title: 'Асоціація вальдорфських ініціатив в Україні', country: 'Україна', flag: '🇺🇦', description: 'Всеукраїнська громадська організація. Представляє Україну в IAO, ECSWE, IASWECE та Гаазькому колі — міжнародній конференції вальдорфських шкіл.', url: 'http://www.waldorf.in.ua/' }),
    S('ua', { title: 'Вальдорфська школа «Софія»', country: 'Київ', flag: '🇺🇦', description: 'Вальдорфська школа в Києві (бульвар Перова).', url: 'https://www.sofia.school/' }),
    S('ua', { title: 'Вальдорфський НВК', country: 'Дніпро', flag: '🇺🇦', description: 'Комунальний заклад, створений 1995 року з ініціативи батьків і вчителів. Понад 330 учнів 1–11 класів і 50 дітей у садку.', url: 'http://www.waldorf-nvk.dp.sch.in.ua/' }),
    S('ua', { title: 'Харківська гімназія № 94 — вальдорфські класи', country: 'Харків', flag: '🇺🇦', description: 'Вальдорфські класи працюють у комунальній гімназії з 2016 року.', url: 'http://school94.edu.kh.ua/valjdorfsjka_shkola' }),
    S('ua', { title: 'Вальдорфський ліцей «Ступені»', country: 'Одеса', flag: '🇺🇦', description: 'Наш ліцей: дитячий садок, початкова школа, гімназія і ліцей.', url: '/', linkLabel: 'Про нас' }),
    S('alumni', { title: 'Єнс Столтенберг', country: 'Норвегія', flag: '🇳🇴', description: 'Генеральний секретар НАТО у 2014–2024 роках, колишній прем’єр-міністр Норвегії. Навчався в Rudolf Steinerskolen в Осло.', url: 'https://en.wikipedia.org/wiki/Jens_Stoltenberg', linkLabel: 'Вікіпедія' }),
    S('alumni', { title: 'Міхаель Енде', country: 'Німеччина', flag: '🇩🇪', description: 'Автор «Нескінченної історії» та «Момо». Закінчував навчання у вальдорфській школі в Штутгарті.', url: 'https://en.wikipedia.org/wiki/Michael_Ende', linkLabel: 'Вікіпедія' }),
    S('alumni', { title: 'Сандра Буллок', country: 'США / Німеччина', flag: '🇺🇸', description: 'Акторка, володарка «Оскара». Здобувала вальдорфську освіту в Нюрнберзі.', url: 'https://en.wikipedia.org/wiki/Sandra_Bullock', linkLabel: 'Вікіпедія' }),
    S('alumni', { title: 'Дженніфер Еністон', country: 'США', flag: '🇺🇸', description: 'Акторка. З шести років навчалася у вальдорфській школі, де в 11 років відкрила для себе акторство.', url: 'https://en.wikipedia.org/wiki/Jennifer_Aniston', linkLabel: 'Вікіпедія' }),
  ] };
})();

const SOURCES = [
  ['Waldorf World List (PDF, редакція Гаазького кола, Педагогічної секції Гетеанума та Freunde der Erziehungskunst)', 'https://centerforanthroposophy.org/wp-content/uploads/2024/12/Waldorf_World_List.pdf'],
  ['Freunde der Erziehungskunst — Waldorf World List', 'https://www.freunde-waldorf.de/en/waldorf-worldwide/waldorf-education/waldorf-world-list/'],
  ['Bund der Freien Waldorfschulen — Waldorfschulen weltweit (цифри на січень 2026)', 'https://www.waldorfschule.de/lernen/schul-und-seminarsuche/schulverzeichnisse'],
  ['Школа «Софія» — Вальдорф в Україні', 'https://www.sofia.school/pedahohika/valdorf-v-ukraini'],
  ['Wikipedia — Michael Hall (school)', 'https://en.wikipedia.org/wiki/Michael_Hall_(school)'],
  ['Wikipedia (no) — Rudolf Steinerskolen i Oslo', 'https://no.wikipedia.org/wiki/Rudolf_Steinerskolen_i_Oslo'],
  ['Wikipedia — Michael Park School', 'https://en.wikipedia.org/wiki/Michael_Park_School'],
  ['Wikipedia (sv) — Kristofferskolan', 'https://sv.wikipedia.org/wiki/Kristofferskolan'],
];

function initials(t) { return String(t).replace(/[«»"()—–-]/g, ' ').split(/\s+/).filter((w) => /^[A-ZА-ЯІЇЄҐ]/.test(w)).slice(0, 2).map((w) => w[0]).join('') || '★'; }

/* Прапори: локальні SVG (flag-icons, MIT) у /assets/flags/4x3/<код>.svg; старі емодзі перетворюються на код */
function flagCode(v) {
  const t = String(v || '').trim();
  if (/^[a-z]{2}(-[a-z]+)?$/i.test(t)) return t.toLowerCase();
  if (t === 'world' || /\u{1F30D}|\u{1F30E}|\u{1F30F}/u.test(t)) return 'world';
  const cps = [...t].map((c) => c.codePointAt(0)).filter((c) => c >= 0x1F1E6 && c <= 0x1F1FF);
  return cps.length === 2 ? String.fromCharCode(...cps.map((c) => c - 0x1F1E6 + 97)) : '';
}
function flagImg(v, cls) {
  const c = flagCode(v); if (!c) return '';
  const src = c === 'world' ? '/assets/flags/world.svg' : '/assets/flags/4x3/' + c + '.svg';
  return '<img class="' + (cls || 'st-flag') + '" src="' + src + '" alt="" width="28" height="21">';
}

function renderBody(items) {
  const card = (s) => {
    const ext = /^https?:/.test(s.url);
    const media = s.image ? `<img src="${esc(s.image)}" alt="" loading="lazy">` : `<span class="st-world-ph" aria-hidden="true">${flagImg(s.flag, 'st-flag st-flag--big')}<b>${esc(initials(s.title))}</b></span>`;
    return `<article class="st-card st-world-card">
	<div class="st-world-media">${media}</div>
	<div class="st-world-text"><h3>${esc(s.title)}</h3><p class="muted st-world-country">${flagImg(s.flag)}${esc(s.country)}</p><p>${esc(s.description)}</p>
	${s.url ? `<a class="btn orange" href="${esc(s.url)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${esc(s.linkLabel || 'Сайт')} →</a>` : ''}</div>
</article>`;
  };
  const secs = SECTIONS.map(([k, name]) => {
    const list = items.filter((s) => (s.section || 'school') === k); if (!list.length) return '';
    const extra = k === 'ua' ? '<p class="st-intro">За даними школи «Софія», вальдорфські садки та школи працюють у Києві, Дніпрі, Кривому Розі, Одесі, Харкові, Городенці, Кам’янці-Подільському та Миколаєві.</p>' : '';
    return `<h2 class="docs-section-title">${esc(name)}</h2>${extra}<div class="st-world-grid">${list.map(card).join('\n')}</div>`;
  }).join('\n');
  return `<div class="st-intro st-world-intro">
	<p>Вальдорфська педагогіка — не експеримент і не «альтернатива на узбіччі». Перша вальдорфська школа відкрилася у Штутгарті у вересні 1919 року, перший вальдорфський садок — у 1926-му.</p>
	<div class="st-world-stats">
		<div class="st-card"><b>1283</b><span>вальдорфські школи</span></div>
		<div class="st-card"><b>71</b><span>країна світу</span></div>
		<div class="st-card"><b>1922</b><span>вальдорфські садки у понад 60 країнах</span></div>
		<div class="st-card"><b>90 тис.</b><span>учнів лише в Німеччині (258 шкіл)</span></div>
	</div>
	<p>Вальдорфські школи об’єднані в національні асоціації та міжнародні мережі, що співпрацюють з освітніми інституціями Європи й світу. Нижче — головні організації, відомі школи, українські заклади та кілька відомих випускників.</p>
</div>
${secs}
<h2 class="docs-section-title">Джерела</h2>
<ol class="st-sources">${SOURCES.map(([t, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join('')}</ol>
<p class="muted">Цифри — за світовим списком вальдорфських шкіл і даними Союзу вільних вальдорфських шкіл Німеччини. Посилання перевірено в жовтні 2026 року.</p>`;
}

function mount(app, admin, requirePermission) {
  const { readJson, writeJson } = require('./store');
  const d = readJson('schools.json', { items: [] }); if (!d.items || !d.items.length) writeJson('schools.json', SEED);
  admin.use('/schools', requirePermission('pages'), schools.createAdminRouter());
  app.get('/about-us/shkoly-svitu', (q, res, next) => (q.originalUrl.split('?')[0].endsWith('/') ? next() : res.redirect(301, '/about-us/shkoly-svitu/')));
  app.get('/about-us/shkoly-svitu/', (_q, res) => {
    const html = wrapInShell({ title: 'Вальдорфські школи світу', urlPath: '/about-us/shkoly-svitu/', crumbs: [['Про нас', '/about-us/']], description: 'Вальдорфська освіта у світі: 1283 школи в 71 країні, 1922 садки. Міжнародні організації, відомі школи, вальдорфські заклади України.', bodyHtml: renderBody(schools.publicList()) });
    if (!html) return res.status(500).send('Помилка шаблону');
    res.type('html').send(html);
  });
}
module.exports = { flagCode, mount };
