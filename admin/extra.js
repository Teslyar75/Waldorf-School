/* Прапори для «Шкіл світу»: вибір країни за кодом ISO (SVG flag-icons, MIT) */
const FLAG_CODES = 'ad,ae,af,ag,ai,al,am,ao,aq,ar,arab,as,asean,at,au,aw,ax,az,ba,bb,bd,be,bf,bg,bh,bi,bj,bl,bm,bn,bo,bq,br,bs,bt,bv,bw,by,bz,ca,cc,cd,cefta,cf,cg,ch,ci,ck,cl,cm,cn,co,cp,cr,cu,cv,cw,cx,cy,cz,de,dg,dj,dk,dm,do,dz,eac,ec,ee,eg,eh,er,es-ct,es-ga,es-pv,es,et,eu,fi,fj,fk,fm,fo,fr,ga,gb-eng,gb-nir,gb-sct,gb-wls,gb,gd,ge,gf,gg,gh,gi,gl,gm,gn,gp,gq,gr,gs,gt,gu,gw,gy,hk,hm,hn,hr,ht,hu,ic,id,ie,il,im,in,io,iq,ir,is,it,je,jm,jo,jp,ke,kg,kh,ki,km,kn,kp,kr,kw,ky,kz,la,lb,lc,li,lk,lr,ls,lt,lu,lv,ly,ma,mc,md,me,mf,mg,mh,mk,ml,mm,mn,mo,mp,mq,mr,ms,mt,mu,mv,mw,mx,my,mz,na,nc,ne,nf,ng,ni,nl,no,np,nr,nu,nz,om,pa,pc,pe,pf,pg,ph,pk,pl,pm,pn,pr,ps,pt,pw,py,qa,re,ro,rs,ru,rw,sa,sb,sc,sd,se,sg,sh-ac,sh-hl,sh-ta,sh,si,sj,sk,sl,sm,sn,so,sr,ss,st,sv,sx,sy,sz,tc,td,tf,tg,th,tj,tk,tl,tm,tn,to,tr,tt,tv,tw,tz,ua,ug,um,un,us,uy,uz,va,vc,ve,vg,vi,vn,vu,wf,ws,xk,xx,ye,yt,za,zm,zw'.split(',');
function flagNorm(v) { const t = String(v || '').trim(); if (/^[a-z]{2}(-[a-z]+)?$/i.test(t)) return t.toLowerCase(); if (t === 'world' || /\u{1F30D}|\u{1F30E}|\u{1F30F}/u.test(t)) return 'world'; const c = [...t].map((x) => x.codePointAt(0)).filter((x) => x >= 0x1F1E6 && x <= 0x1F1FF); return c.length === 2 ? String.fromCharCode(...c.map((x) => x - 0x1F1E6 + 97)) : ''; }
function flagSrc(v) { const c = flagNorm(v); return !c ? '' : c === 'world' ? '/assets/flags/world.svg' : '/assets/flags/4x3/' + c + '.svg'; }
function flagName(c) { if (c === 'world') return 'Міжнародна (глобус)'; try { const n = new Intl.DisplayNames(['uk'], { type: 'region' }).of(c.toUpperCase()); if (n && n.toUpperCase() !== c.toUpperCase()) return n; } catch (_) { /* */ } return c.toUpperCase(); }
function flagOptions(v) { const cur = flagNorm(v); const list = ['world', ...FLAG_CODES].map((c) => [c, flagName(c)]).sort((a, b) => (a[0] === 'world' ? -1 : b[0] === 'world' ? 1 : a[1].localeCompare(b[1], 'uk'))); return '<option value="">— без прапора —</option>' + list.map(([c, n]) => '<option value="' + c + '"' + (c === cur ? ' selected' : '') + '>' + n + ' (' + c.toUpperCase() + ')</option>').join(''); }
document.addEventListener('change', (ev) => { if (ev.target && ev.target.id === 'f-flag') { const i = document.getElementById('f-flag-img'); if (i) i.src = flagSrc(ev.target.value); } });
/* Ступені CMS — додаткові вкладки: Головна, Банери, Редактор сторінок, Документи, Книги. */
(() => {
  const A = () => window.StupeniAdmin;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const e = (s) => A().escapeHtml(s);
  let dirty = false;
  const markDirty = (root) => root.addEventListener('input', () => { dirty = true; }, { once: false });
  const clean = () => { dirty = false; };
  window.StupeniAdminGuard = () => !dirty || (confirm('Є незбережені зміни. Вийти без збереження?') && (clean(), true));
  window.addEventListener('beforeunload', (ev) => { if (dirty) { ev.preventDefault(); ev.returnValue = ''; } });
  const view = (p) => `<a class="btn ghost small" href="${e(p)}" target="_blank" rel="noopener">Переглянути на сайті ↗</a>`;

  /* ——— завантаження з drag&drop ——— */
  async function upload(file, extra = {}) {
    const fd = new FormData(); fd.append('file', file); for (const [k, v] of Object.entries(extra)) fd.append(k, v);
    return A().api('/api/admin/media/upload', { method: 'POST', body: fd });
  }
  function dropzone(el, onFiles) {
    el.addEventListener('dragover', (ev) => { ev.preventDefault(); el.classList.add('drag'); });
    el.addEventListener('dragleave', () => el.classList.remove('drag'));
    el.addEventListener('drop', (ev) => { ev.preventDefault(); el.classList.remove('drag'); if (ev.dataTransfer.files.length) onFiles([...ev.dataTransfer.files]); });
  }

  /* ——— вибір файлу з медіатеки (пошук + завантаження) ——— */
  async function pickMedia({ accept = 'image' } = {}) {
    const { items } = await A().api('/api/admin/media');
    return new Promise((resolve) => {
      const ov = document.createElement('div'); ov.className = 'x-modal';
      ov.innerHTML = `<div class="x-modal-box"><div class="toolbar"><h3>Медіатека</h3><button class="btn secondary" data-x>Закрити</button></div>
        <div class="x-drop" id="x-drop">Перетягніть файл сюди або <label class="link">оберіть на комп’ютері<input type="file" hidden accept="${accept === 'pdf' ? 'application/pdf' : 'image/*'}"></label><br><small>Фото автоматично зменшуються до 2000 px і стискаються.</small></div>
        <input class="x-search" placeholder="Пошук за назвою…"><div class="x-media-grid"></div></div>`;
      document.body.appendChild(ov);
      const grid = $('.x-media-grid', ov);
      const ok = (m) => (accept === 'pdf' ? /\.pdf$/i.test(m.url) : A().isImageUrl(m.url));
      const draw = (q = '') => { grid.innerHTML = items.filter(ok).filter((m) => !q || `${m.title} ${m.caption}`.toLowerCase().includes(q)).slice(0, 200).map((m) => `<button type="button" class="x-media" data-url="${e(m.url)}">${accept === 'pdf' ? '<span class="x-pdf">PDF</span>' : `<img loading="lazy" src="${e(A().mediaUrl(m.url))}" alt="">`}<span>${e(m.title)}</span></button>`).join('') || '<p class="muted">Нічого не знайдено</p>'; };
      draw();
      $('.x-search', ov).oninput = (ev) => draw(ev.target.value.toLowerCase().trim());
      const done = (v) => { ov.remove(); resolve(v); };
      $('[data-x]', ov).onclick = () => done(null);
      grid.onclick = (ev) => { const b = ev.target.closest('.x-media'); if (b) done(b.dataset.url); };
      const up = async (files) => { try { const it = await upload(files[0]); A().toast('Завантажено'); done(it.url); } catch (err) { A().toast(err.message); } };
      $('input[type=file]', ov).onchange = (ev) => ev.target.files[0] && up([...ev.target.files]);
      dropzone($('#x-drop', ov), up);
    });
  }

  /* ——— точка фокусу ——— */
  function focusPicker(box, src, pos, onChange) {
    const [x, y] = String(pos || '50% 50%').split(' ').map((v) => parseFloat(v) || 50);
    box.innerHTML = `<div class="x-focus"><img src="${e(A().mediaUrl(src))}" alt=""><i style="left:${x}%;top:${y}%"></i></div><small class="muted">Клацніть на найважливішу частину фото — вона завжди буде в кадрі.</small>`;
    const wrap = $('.x-focus', box);
    wrap.onclick = (ev) => { const r = wrap.getBoundingClientRect(); const nx = Math.round(((ev.clientX - r.left) / r.width) * 100); const ny = Math.round(((ev.clientY - r.top) / r.height) * 100); $('i', wrap).style.left = nx + '%'; $('i', wrap).style.top = ny + '%'; dirty = true; onChange(`${nx}% ${ny}%`); };
  }

  /* ——— Головна (дашборд) ——— */
  async function dashboard(root) {
    const { counts: c } = await A().api('/api/admin/dashboard');
    const tile = (n, l, tab, extra = '') => `<button class="x-tile" data-go="${tab}"><b>${n}</b><span>${l}</span>${extra}</button>`;
    root.innerHTML = `<div class="toolbar"><h2>Вітаємо в адмінці «Ступенів»</h2>${view('/')}</div>
      <div class="x-tiles">
        ${tile(c.applications, 'Заявки на вступ', 'applications', c.applicationsNew ? `<em>${c.applicationsNew} нових</em>` : '')}
        ${tile(c.contact, 'Звернення', 'contact', c.contactNew ? `<em>${c.contactNew} нових</em>` : '')}
        ${tile(c.news, 'Новини', 'news')}${tile(c.events, 'Події календаря', 'events')}
        ${tile(c.media, 'Файли в медіатеці', 'media')}${tile(c.documents, 'Документи', 'documents')}
        ${tile(c.books, 'Книги', 'books')}${tile(c.staff, 'Педагоги', 'staff')}${tile(c.pages, 'Розділи', 'pages')}
      </div>
      <div class="panel"><h3>Швидкі дії</h3><div class="x-actions">
        <button class="btn" data-go="news">+ Додати новину</button><button class="btn secondary" data-go="banners">Змінити фото-банер сторінки</button>
        <button class="btn secondary" data-go="editor">Змінити текст чи фото на сторінці</button><button class="btn secondary" data-go="documents">Додати документ</button></div>
        <p class="muted">Детальна інструкція — у файлі docs/Інструкція-адмінка.md.</p></div>`;
    $$('[data-go]', root).forEach((b) => { b.onclick = () => A().go(b.dataset.go); });
  }

  /* ——— Банери сторінок ——— */
  async function banners(root) {
    const { items } = await A().api('/api/admin/content/banners');
    root.innerHTML = `<div class="toolbar"><h2>Банери (фото в шапці) сторінок</h2></div>
      <p class="muted">Оберіть сторінку, завантажте фото або візьміть з медіатеки, клацніть точку фокусу й збережіть. Головна сторінка — перша в списку.</p>
      <input class="x-search" id="bn-q" placeholder="Пошук сторінки…"><div class="x-split"><ul class="x-list" id="bn-list"></ul><div id="bn-ed" class="panel">← Оберіть сторінку</div></div>`;
    const list = $('#bn-list', root);
    const draw = (q = '') => { list.innerHTML = items.filter((p) => !q || (p.title + p.path).toLowerCase().includes(q)).map((p) => `<li><button data-p="${e(p.path)}"><img src="${e(A().mediaUrl((p.override && p.override.src) || p.original))}" alt=""><span>${e(p.title)}<small>${e(p.path)}${p.override ? ' · змінено' : ''}</small></span></button></li>`).join(''); };
    draw(); $('#bn-q', root).oninput = (ev) => draw(ev.target.value.toLowerCase());
    list.onclick = (ev) => { const b = ev.target.closest('[data-p]'); if (!b || !window.StupeniAdminGuard()) return; open(items.find((x) => x.path === b.dataset.p)); };
    function open(p) {
      const ed = $('#bn-ed', root); let src = (p.override && p.override.src) || p.original; let pos = (p.override && p.override.pos) || '50% 50%';
      ed.innerHTML = `<h3>${e(p.title)}</h3><p>${view(p.path)}</p>
        <div class="x-drop" id="bn-drop">Перетягніть нове фото сюди або <button class="btn small" id="bn-pick">Обрати з медіатеки / завантажити</button></div>
        <div id="bn-focus"></div><h4>Попередній перегляд</h4><div class="x-banner-prev" id="bn-prev"></div><small class="muted">Широкий екран і телефон кадрують фото по-різному — перевірте обидва.</small><div class="x-banner-prev mob" id="bn-prev-m"></div>
        <div class="x-actions"><button class="btn" id="bn-save">Зберегти</button>${p.override ? '<button class="btn danger" id="bn-reset">Повернути початкове фото</button>' : ''}</div>`;
      const upd = () => { focusPicker($('#bn-focus', ed), src, pos, (v) => { pos = v; prev(); }); prev(); };
      const prev = () => ['#bn-prev', '#bn-prev-m'].forEach((s) => { $(s, ed).style.backgroundImage = `url('${A().mediaUrl(src)}')`; $(s, ed).style.backgroundPosition = pos; });
      upd();
      $('#bn-pick', ed).onclick = async () => { const u = await pickMedia(); if (u) { src = u; pos = '50% 50%'; dirty = true; upd(); } };
      dropzone($('#bn-drop', ed), async (f) => { try { const it = await upload(f[0], { title: 'Банер ' + p.title }); src = it.url; dirty = true; upd(); } catch (err) { A().toast(err.message); } });
      $('#bn-save', ed).onclick = async () => { try { await A().api('/api/admin/content/banner', { method: 'PUT', body: { path: p.path, src, pos } }); clean(); A().toast('Банер збережено'); banners(root); } catch (err) { A().toast(err.message); } };
      const rs = $('#bn-reset', ed); if (rs) rs.onclick = async () => { if (!confirm('Повернути початкове фото банера?')) return; await A().api('/api/admin/content/banner?path=' + encodeURIComponent(p.path), { method: 'DELETE' }); clean(); A().toast('Повернуто'); banners(root); };
    }
  }

  /* ——— Редактор сторінок ——— */
  async function editor(root) {
    const { items } = await A().api('/api/admin/content/pages');
    root.innerHTML = `<div class="toolbar"><h2>Редактор сторінок</h2></div><p class="muted">Тексти й фото звичайних сторінок сайту. Зміни зберігаються окремо від файлів сайту — будь-яку можна скасувати кнопкою «Повернути як було».</p>
      <input class="x-search" id="pg-q" placeholder="Пошук сторінки…"><div class="x-split"><ul class="x-list" id="pg-list"></ul><div id="pg-ed" class="panel">← Оберіть сторінку</div></div>`;
    const list = $('#pg-list', root);
    const draw = (q = '') => { list.innerHTML = items.filter((p) => !q || (p.title + p.path).toLowerCase().includes(q)).map((p) => `<li><button data-p="${e(p.path)}"><span>${e(p.title)}<small>${e(p.path)}</small></span></button></li>`).join(''); };
    draw(); $('#pg-q', root).oninput = (ev) => draw(ev.target.value.toLowerCase());
    list.onclick = (ev) => { const b = ev.target.closest('[data-p]'); if (b && window.StupeniAdminGuard()) openPage(b.dataset.p); };
    async function openPage(path) {
      const ed = $('#pg-ed', root); const d = await A().api('/api/admin/content/page?path=' + encodeURIComponent(path));
      const tag = { h1: 'Заголовок', h2: 'Підзаголовок', h3: 'Підзаголовок', p: 'Абзац' };
      ed.innerHTML = `<div class="toolbar"><h3>${e(path)}</h3>${view(path)}</div>` + d.items.map((it) => {
        const ov = it.override || {}; const ch = it.override ? '<span class="badge pub">змінено</span>' : '';
        if (it.type === 'text') return `<div class="x-item" data-id="${it.id}"><label>${tag[it.tag] || it.tag} ${ch}</label><textarea rows="${it.tag === 'p' ? 4 : 2}">${e(ov.html ?? it.html)}</textarea><div class="x-actions"><button class="btn small" data-save>Зберегти</button>${it.override ? '<button class="btn danger small" data-reset>Повернути як було</button>' : ''}</div></div>`;
        const src = ov.src || it.src;
        return `<div class="x-item" data-id="${it.id}" data-src="${e(src)}" data-pos="${e(ov.pos || '50% 50%')}"><label>${it.type === 'bg' ? 'Фонове фото' : 'Фото'} ${ch}</label><div class="x-img-row"><div class="x-fp"></div><div><button class="btn secondary small" data-pick>Замінити фото</button>${it.type === 'img' ? `<label>Опис (alt)</label><input data-alt value="${e(ov.alt ?? it.alt)}">` : ''}<div class="x-actions"><button class="btn small" data-save>Зберегти</button>${it.override ? '<button class="btn danger small" data-reset>Повернути як було</button>' : ''}</div></div></div></div>`;
      }).join('');
      markDirty(ed);
      $$('.x-item[data-src]', ed).forEach((box) => { const fp = () => focusPicker($('.x-fp', box), box.dataset.src, box.dataset.pos, (v) => { box.dataset.pos = v; }); fp(); $('[data-pick]', box).onclick = async () => { const u = await pickMedia(); if (u) { box.dataset.src = u; dirty = true; fp(); } }; });
      ed.onclick = async (ev) => {
        const box = ev.target.closest('.x-item'); if (!box) return; const id = box.dataset.id;
        try {
          if (ev.target.matches('[data-save]')) { const body = { path, id }; const ta = $('textarea', box); if (ta) body.html = ta.value; else { body.src = box.dataset.src.replace(/^(\.\.\/|\.\/)+/, '/'); body.pos = box.dataset.pos; const a = $('[data-alt]', box); if (a) body.alt = a.value; } await A().api('/api/admin/content/page', { method: 'PUT', body }); clean(); A().toast('Збережено'); openPage(path); }
          if (ev.target.matches('[data-reset]')) { if (!confirm('Повернути початковий вміст цього елемента?')) return; await A().api(`/api/admin/content/page?path=${encodeURIComponent(path)}&id=${id}`, { method: 'DELETE' }); clean(); A().toast('Повернуто'); openPage(path); }
        } catch (err) { A().toast(err.message); }
      };
    }
  }

  /* ——— Колекції: Документи / Книги ——— */
  function collection(cfg) {
    return async function (root) {
      const { items } = await A().api(cfg.api);
      root.innerHTML = `<div class="toolbar"><h2>${cfg.title}</h2><div>${view(cfg.view)} <button class="btn" id="c-new">+ Додати</button></div></div><p class="muted">${cfg.hint} Порядок змінюйте перетягуванням рядків (☰).</p><div id="c-ed" class="panel hidden"></div><ul class="x-sort" id="c-list"></ul>`;
      const list = $('#c-list', root);
      list.innerHTML = items.map((it) => `<li draggable="true" data-id="${it.id}"><span class="x-handle">☰</span>${cfg.thumb(it)}<span class="x-grow"><b>${e(it.title)}</b><small>${cfg.sub(it)}</small></span>${it.visible === false ? '<span class="badge draft">приховано</span>' : ''}<button class="btn secondary small" data-edit>Редагувати</button><button class="btn danger small" data-del>×</button></li>`).join('') || '<p class="muted">Поки порожньо</p>';
      let drag;
      list.addEventListener('dragstart', (ev) => { drag = ev.target.closest('li'); });
      list.addEventListener('dragover', (ev) => { ev.preventDefault(); const li = ev.target.closest('li'); if (li && drag && li !== drag) { const r = li.getBoundingClientRect(); li.parentNode.insertBefore(drag, ev.clientY > r.top + r.height / 2 ? li.nextSibling : li); } });
      list.addEventListener('drop', async () => { await A().api(cfg.api + '/reorder', { method: 'PUT', body: { ids: $$('li', list).map((l) => l.dataset.id) } }); A().toast('Порядок збережено'); });
      list.onclick = async (ev) => {
        const li = ev.target.closest('li'); if (!li) return; const it = items.find((x) => x.id === li.dataset.id);
        if (ev.target.matches('[data-del]')) { if (!confirm(`Видалити «${it.title}»?`)) return; await A().api(`${cfg.api}/${it.id}`, { method: 'DELETE' }); A().toast('Видалено'); A().go(cfg.tab); }
        if (ev.target.matches('[data-edit]')) open(it);
      };
      $('#c-new', root).onclick = () => open(null);
      function open(it) {
        const ed = $('#c-ed', root); ed.classList.remove('hidden'); ed.scrollIntoView({ behavior: 'smooth' });
        ed.innerHTML = `<h3>${it ? 'Редагувати' : 'Додати'}</h3>${cfg.form(it || {}, items)}<label class="check"><input type="checkbox" id="f-visible" ${!it || it.visible !== false ? 'checked' : ''}> Показувати на сайті</label><div class="x-actions"><button class="btn" id="f-save">Зберегти</button><button class="btn secondary" id="f-cancel">Скасувати</button></div>`;
        markDirty(ed); cfg.bind && cfg.bind(ed, it || {});
        $('#f-cancel', ed).onclick = () => { if (window.StupeniAdminGuard()) ed.classList.add('hidden'); };
        $('#f-save', ed).onclick = async () => { try { const body = { ...cfg.read(ed), visible: $('#f-visible', ed).checked }; if (it) await A().api(`${cfg.api}/${it.id}`, { method: 'PUT', body }); else await A().api(cfg.api, { method: 'POST', body }); clean(); A().toast('Збережено'); A().go(cfg.tab); } catch (err) { A().toast(err.message); } };
      }
    };
  }
  const v = (ed, id) => $('#' + id, ed).value.trim();
  const documents = collection({
    tab: 'documents', api: '/api/admin/documents', title: 'Документи', view: '/about-us/dokumenty/',
    hint: 'Документи на сторінці «Документи»: PDF показуються у переглядачі та картках, фото — карткою. Розділ групує картки.',
    thumb: (it) => `<span class="x-pdf">${/\.pdf$/i.test(it.url) ? 'PDF' : 'IMG'}</span>`, sub: (it) => `${e(it.section || 'Документи')} · ${e(it.url)}`,
    form: (it, items) => { const secs = [...new Set(items.map((x) => x.section).filter(Boolean))]; return `<label>Назва</label><input id="f-title" value="${e(it.title)}"><div class="row"><div><label>Розділ</label><input id="f-section" list="f-secs" value="${e(it.section || secs[0] || '')}"><datalist id="f-secs">${secs.map((s) => `<option value="${e(s)}">`).join('')}</datalist></div><div><label>Примітка (дата, номер)</label><input id="f-note" value="${e(it.note)}"></div></div><label>Файл</label><div class="x-img-row"><input id="f-url" value="${e(it.url)}" placeholder="/data/uploads/…pdf"><button class="btn secondary small" id="f-pickpdf">PDF з медіатеки / завантажити</button><button class="btn secondary small" id="f-pickimg">Фото</button></div>`; },
    bind: (ed) => { $('#f-pickpdf', ed).onclick = async () => { const u = await pickMedia({ accept: 'pdf' }); if (u) { $('#f-url', ed).value = u; dirty = true; } }; $('#f-pickimg', ed).onclick = async () => { const u = await pickMedia(); if (u) { $('#f-url', ed).value = u; dirty = true; } }; },
    read: (ed) => ({ title: v(ed, 'f-title'), section: v(ed, 'f-section'), note: v(ed, 'f-note'), url: v(ed, 'f-url') }),
  });
  const books = collection({
    tab: 'books', api: '/api/admin/books', title: 'Книги (Методичні матеріали)', view: '/about-us/methodical-materials/',
    hint: 'Позначка «Є в наявності на прохідній школи» з’являється на сайті, коли ввімкнено відповідний прапорець.',
    thumb: (it) => it.cover ? `<img class="x-thumb" src="${e(A().mediaUrl(it.cover))}" alt="">` : '<span class="x-pdf">📖</span>', sub: (it) => `${e(it.author)} · ${e(it.language)}${it.available ? ' · <b>є на прохідній</b>' : ''}`,
    form: (it) => `<label>Назва</label><input id="f-title" value="${e(it.title)}"><div class="row"><div><label>Автор</label><input id="f-author" value="${e(it.author)}"></div><div><label>Мова / видання</label><input id="f-language" value="${e(it.language)}"></div></div>
      <label>Оригінальна назва</label><input id="f-original" value="${e(it.original)}"><label>Опис</label><textarea id="f-description" rows="4">${e(it.description)}</textarea>
      <label>Обкладинка</label><div class="x-img-row"><input id="f-cover" value="${e(it.cover)}"><button class="btn secondary small" id="f-pick">Обрати / завантажити</button></div>
      <label>Посилання (кнопки «Читати», «Замовити»)</label><div id="f-links">${(it.links || []).concat([{ label: '', url: '' }]).map((l) => `<div class="row x-link"><div><input placeholder="Підпис кнопки" value="${e(l.label)}"></div><div><input placeholder="https://…" value="${e(l.url)}"></div></div>`).join('')}</div><button class="btn ghost small" id="f-addlink">+ посилання</button>
      <div class="row"><div><label class="check"><input type="checkbox" id="f-available" ${it.available ? 'checked' : ''}> Є в наявності на прохідній школи</label></div><div><label>Ціна (необов’язково)</label><input id="f-price" value="${e(it.price)}" placeholder="напр. 350 грн"></div></div>`,
    bind: (ed) => { $('#f-pick', ed).onclick = async () => { const u = await pickMedia(); if (u) { $('#f-cover', ed).value = u; dirty = true; } }; $('#f-addlink', ed).onclick = () => $('#f-links', ed).insertAdjacentHTML('beforeend', '<div class="row x-link"><div><input placeholder="Підпис кнопки"></div><div><input placeholder="https://…"></div></div>'); },
    read: (ed) => ({ title: v(ed, 'f-title'), author: v(ed, 'f-author'), language: v(ed, 'f-language'), original: v(ed, 'f-original'), description: $('#f-description', ed).value.trim(), cover: v(ed, 'f-cover'), price: v(ed, 'f-price'), available: $('#f-available', ed).checked, links: $$('.x-link', ed).map((r) => { const [a, b] = $$('input', r); return { label: a.value.trim(), url: b.value.trim() }; }).filter((l) => l.url) }),
  });

  const SECS = [['org', 'Міжнародні організації'], ['school', 'Відомі школи світу'], ['ua', 'Україна'], ['alumni', 'Відомі випускники']];
  const schools = collection({
    tab: 'schools', api: '/api/admin/schools', title: 'Вальдорфські школи світу', view: '/about-us/shkoly-svitu/',
    hint: 'Картки сторінки «Вальдорфські школи світу». Додавайте лише перевірені факти й робочі посилання. Без фото показується заглушка з прапором та ініціалами.',
    thumb: (it) => it.image ? `<img class="x-thumb" src="${e(A().mediaUrl(it.image))}" alt="">` : `<span class="x-pdf">${it.flag ? `<img src="${flagSrc(it.flag)}" alt="" width="28" height="21">` : "★"}</span>`, sub: (it) => `${e((SECS.find((s) => s[0] === it.section) || ['', ''])[1])} · ${e(it.country)}`,
    form: (it) => `<label>Назва</label><input id="f-title" value="${e(it.title)}"><div class="row"><div><label>Розділ</label><select id="f-section">${SECS.map(([k, l]) => `<option value="${k}" ${(it.section || 'school') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div><div><label>Країна / місто</label><input id="f-country" value="${e(it.country)}"></div><div><label>Країна (прапор)</label><div class="x-flag-pick"><select id="f-flag">${flagOptions(it.flag)}</select><img id="f-flag-img" src="${flagSrc(it.flag)}" alt="" width="32" height="24"></div></div></div>
      <label>Опис (1–2 речення)</label><textarea id="f-description" rows="3">${e(it.description)}</textarea>
      <div class="row"><div><label>Посилання</label><input id="f-url" value="${e(it.url)}" placeholder="https://…"></div><div><label>Текст кнопки</label><input id="f-linkLabel" value="${e(it.linkLabel || 'Сайт')}"></div></div>
      <label>Фото / логотип (лише з дозволом на використання)</label><div class="x-img-row"><input id="f-image" value="${e(it.image)}"><button class="btn secondary small" id="f-pick">Обрати / завантажити</button></div>`,
    bind: (ed) => { $('#f-pick', ed).onclick = async () => { const u = await pickMedia(); if (u) { $('#f-image', ed).value = u; dirty = true; } }; },
    read: (ed) => ({ title: v(ed, 'f-title'), section: $('#f-section', ed).value, country: v(ed, 'f-country'), flag: $('#f-flag', ed).value, description: $('#f-description', ed).value.trim(), url: v(ed, 'f-url'), linkLabel: v(ed, 'f-linkLabel'), image: v(ed, 'f-image') }),
  });

  const clubs = collection({
    tab: 'clubs', api: '/api/admin/clubs', title: 'Гуртки та майстер-класи', view: '/about-us/hurtky/',
    hint: 'Порожні поля «Вік», «Розклад», «Керівник» на сайті показуються як «Інформація уточнюється». Без фото — оформлена заглушка. Абзаци — з нового рядка; підзаголовок — рядок, що починається з «## ».',
    thumb: (it) => it.image ? `<img class="x-thumb" src="${e(A().mediaUrl(it.image))}" alt="">` : '<span class="x-pdf">✦</span>', sub: (it) => `${e(it.kind || 'Гурток')} · ${e(it.leader || 'керівник уточнюється')}${it.hasPage ? ' · окрема сторінка' : ''}`,
    form: (it) => `<div class="row"><div><label>Назва</label><input id="f-title" value="${e(it.title)}"></div><div><label>Тип</label><select id="f-kind">${['Гурток', 'Майстер-клас', 'Студія', 'Секція'].map((k) => `<option ${(it.kind || 'Гурток') === k ? 'selected' : ''}>${k}</option>`).join('')}</select></div></div>
      <label>Коротко (одне речення)</label><input id="f-short" value="${e(it.short)}">
      <label>Опис для списку</label><textarea id="f-description" rows="5">${e(it.description)}</textarea>
      <div class="row"><div><label>Вік</label><input id="f-age" value="${e(it.age)}" placeholder="напр. 7–12 років"></div><div><label>Розклад</label><input id="f-schedule" value="${e(it.schedule)}" placeholder="напр. вт, чт 15:30"></div><div><label>Керівник</label><input id="f-leader" value="${e(it.leader)}"></div></div>
      <label>Фото</label><div class="x-img-row"><input id="f-image" value="${e(it.image)}"><button class="btn secondary small" id="f-pick">Обрати / завантажити</button></div><div id="f-fp"></div>
      <label>Фото для картки в списку (якщо інше, ніж головне)</label><div class="x-img-row"><input id="f-cardImage" value="${e(it.cardImage)}"><button class="btn secondary small" id="f-pickcard">Обрати</button></div>
      <label>Галерея (показується на окремій сторінці; порядок — стрілками)</label><div id="f-gallery" class="x-gal"></div><button class="btn secondary small" id="f-addgal">+ Додати фото до галереї</button>
      <label class="check"><input type="checkbox" id="f-hasPage" ${it.hasPage ? 'checked' : ''}> Окрема сторінка гуртка</label>
      <div class="row"><div><label>Адреса сторінки (латиницею)</label><input id="f-slug" value="${e(it.slug)}" placeholder="rizba-po-derevu"></div></div>
      <label>Текст окремої сторінки</label><textarea id="f-detail" rows="8">${e(it.detail)}</textarea>`,
    bind: (ed, it) => { let gal = (it.gallery || []).slice(); ed._gal = () => gal; const drawGal = () => { $('#f-gallery', ed).innerHTML = gal.map((g, i) => `<div class="x-gal-item"><img src="${e(A().mediaUrl(g.url))}" alt=""><div><button type="button" class="btn ghost small" data-g-up="${i}">←</button><button type="button" class="btn ghost small" data-g-down="${i}">→</button><button type="button" class="btn danger small" data-g-del="${i}">×</button></div></div>`).join('') || '<p class="muted">Галерея порожня</p>'; }; drawGal(); $('#f-gallery', ed).onclick = (ev) => { const b = ev.target; const mv = (i, d) => { const j = i + d; if (j < 0 || j >= gal.length) return; [gal[i], gal[j]] = [gal[j], gal[i]]; }; if (b.dataset.gUp) mv(+b.dataset.gUp, -1); else if (b.dataset.gDown) mv(+b.dataset.gDown, 1); else if (b.dataset.gDel) { if (!confirm('Прибрати фото з галереї? (з медіатеки воно не видаляється)')) return; gal.splice(+b.dataset.gDel, 1); } else return; dirty = true; drawGal(); }; $('#f-addgal', ed).onclick = async () => { const u = await pickMedia(); if (u) { gal.push({ label: v(ed, 'f-title'), url: u }); dirty = true; drawGal(); } }; $('#f-pickcard', ed).onclick = async () => { const u = await pickMedia(); if (u) { $('#f-cardImage', ed).value = u; dirty = true; } }; let pos = it.imagePos || '50% 50%'; ed._pos = () => pos; const fp = () => { const s = $('#f-image', ed).value.trim(); if (s) focusPicker($('#f-fp', ed), s, pos, (v) => { pos = v; }); else $('#f-fp', ed).innerHTML = ''; }; fp(); $('#f-pick', ed).onclick = async () => { const u = await pickMedia(); if (u) { $('#f-image', ed).value = u; pos = '50% 50%'; dirty = true; fp(); } }; },
    read: (ed) => { const t = v(ed, 'f-title'); const slug = (v(ed, 'f-slug') || t).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'hurtok-' + Date.now(); return { title: t, kind: $('#f-kind', ed).value, short: v(ed, 'f-short'), description: $('#f-description', ed).value.trim(), age: v(ed, 'f-age'), schedule: v(ed, 'f-schedule'), leader: v(ed, 'f-leader'), image: v(ed, 'f-image'), imagePos: ed._pos ? ed._pos() : '', hasPage: $('#f-hasPage', ed).checked, slug, detail: $('#f-detail', ed).value.trim(), cardImage: v(ed, 'f-cardImage'), gallery: ed._gal ? ed._gal() : [] }; },
  });

  /* ——— Пошук у вкладці «Медіа» ——— */
  new MutationObserver(() => {
    const st = A() && A().state; if (!st || st.tab !== 'media') return;
    const c = $('#content'); if (!c || $('#x-media-search', c) || !$('.toolbar', c)) return;
    $('.toolbar', c).insertAdjacentHTML('afterend', '<input class="x-search" id="x-media-search" placeholder="Пошук файлів за назвою…">');
    $('#x-media-search', c).oninput = (ev) => { const q = ev.target.value.toLowerCase(); $$('.card, tr', c).forEach((el) => { if (el.closest('thead')) return; el.style.display = !q || el.textContent.toLowerCase().includes(q) ? '' : 'none'; }); };
    const tb = $('.toolbar', c); tb.insertAdjacentHTML('afterend', '<div class="x-drop" id="x-media-drop">Перетягніть фото чи PDF сюди, щоб завантажити (можна кілька)</div>');
    dropzone($('#x-media-drop', c), async (files) => { for (const f of files) { try { await upload(f); } catch (err) { A().toast(err.message); } } A().toast('Завантажено: ' + files.length); A().go('media'); });
  }).observe(document.documentElement, { childList: true, subtree: true });

  window.StupeniAdminExtra = { dashboard, banners, editor, documents, books, schools, clubs };
})();
