(() => {
  const TOKEN_KEY = 'stupeni_cms_token';
  const USER_KEY = 'stupeni_cms_user';

  const TABS = [
    { id: 'dashboard', label: 'Головна', permission: 'pages' },
    { id: 'banners', label: 'Банери сторінок', permission: 'pages' },
    { id: 'editor', label: 'Редактор сторінок', permission: 'pages' },
    { id: 'documents', label: 'Документи', permission: 'pages' },
    { id: 'books', label: 'Книги', permission: 'pages' },
    { id: 'schools', label: 'Школи світу', permission: 'pages' },
    { id: 'clubs', label: 'Гуртки', permission: 'pages' },
    { id: 'news', label: 'Новини', permission: 'news' },
    { id: 'events', label: 'Календар / Ритм року', permission: 'events' },
    { id: 'media', label: 'Медіа', permission: 'media' },
    { id: 'pages', label: 'Розділи', permission: 'pages' },
    { id: 'staff', label: 'Педагоги', permission: 'pages' },
    { id: 'applications', label: 'Заявки на вступ', permission: 'settings' },
    { id: 'contact', label: 'Звернення', permission: 'settings' },
    { id: 'nav', label: 'Навігація', permission: 'nav' },
    { id: 'settings', label: 'Налаштування', permission: 'settings' },
    { id: 'account', label: 'Мій пароль', permission: 'password:self' },
    { id: 'users', label: 'Користувачі', permission: 'users', superOnly: true },
  ];

  let state = {
    token: localStorage.getItem(TOKEN_KEY) || '',
    user: JSON.parse(localStorage.getItem(USER_KEY) || 'null'),
    tab: 'news',
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function can(permission) {
    if (!state.user) return false;
    if (state.user.role === 'superadmin') return true;
    const perms = state.user.permissions || [];
    return perms.includes('*') || perms.includes(permission);
  }

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.add('hidden'), 2800);
  }

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** URL для прев’ю з адмінки (/admin → корінь сайту) */
  function mediaUrl(url) {
    if (!url) return '';
    const u = String(url).trim();
    if (/^https?:\/\//i.test(u) || u.startsWith('data:')) return u;
    if (u.startsWith('./')) return '/' + u.slice(2);
    if (u.startsWith('../')) return '/' + u.replace(/^(\.\.\/)+/, '');
    if (u.startsWith('/')) return u;
    return '/' + u;
  }

  function isImageUrl(url) {
    return /\.(jpe?g|png|gif|webp|avif|svg)(\?|$)/i.test(String(url || ''));
  }

  async function api(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
    const res = await fetch(path, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401) logout(false);
      throw new Error(data.error || `Помилка ${res.status}`);
    }
    return data;
  }

  function setSession(token, user) {
    state.token = token;
    state.user = user;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function logout(showLogin = true) {
    state.token = '';
    state.user = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    if (showLogin) showLoginView();
  }

  function showLoginView() {
    $('#login-view').classList.remove('hidden');
    $('#app-view').classList.add('hidden');
  }

  function showApp() {
    $('#login-view').classList.add('hidden');
    $('#app-view').classList.remove('hidden');
    $('#who').textContent = `${state.user.displayName || state.user.username} · ${roleLabel(state.user.role)}`;
    renderTabs();
    const first = TABS.find((t) => tabVisible(t));
    state.tab = first?.id || 'account';
    render();
  }

  function roleLabel(role) {
    return (
      {
        superadmin: 'Супер-адмін',
        admin: 'Адмін',
        editor: 'Редактор',
        author: 'Автор',
      }[role] || role
    );
  }

  function tabVisible(tab) {
    if (tab.superOnly) return state.user.role === 'superadmin';
    return can(tab.permission);
  }

  function renderTabs() {
    const nav = $('#nav-tabs');
    nav.innerHTML = TABS.filter(tabVisible)
      .map(
        (t) =>
          `<button type="button" class="nav-btn ${state.tab === t.id ? 'active' : ''}" data-tab="${t.id}">${escapeHtml(t.label)}</button>`
      )
      .join('');
    $$('.nav-btn', nav).forEach((btn) => {
      btn.onclick = () => {
        if (window.StupeniAdminGuard && !window.StupeniAdminGuard()) return;
        state.tab = btn.dataset.tab;
        renderTabs();
        render();
      };
    });
  }

  window.StupeniAdmin = { api, toast, escapeHtml, mediaUrl, isImageUrl, can, state, go: (t) => { if (window.StupeniAdminGuard && !window.StupeniAdminGuard()) return; state.tab = t; renderTabs(); render(); } };
  async function render() {
    const root = $('#content');
    root.innerHTML = '<p class="muted">Завантаження…</p>';
    try {
      if (state.tab === 'news') await renderNews(root);
      else if (state.tab === 'events') await renderEvents(root);
      else if (state.tab === 'media') await renderMedia(root);
      else if (state.tab === 'pages') await renderPages(root);
      else if (state.tab === 'nav') await renderNav(root);
      else if (state.tab === 'staff') await renderStaff(root);
      else if (state.tab === 'applications') await renderInbox(root, 'applications');
      else if (state.tab === 'contact') await renderInbox(root, 'contact');
      else if (state.tab === 'settings') await renderSettings(root);
      else if (state.tab === 'account') renderAccount(root);
      else if (state.tab === 'users') await renderUsers(root);
      else if (window.StupeniAdminExtra && window.StupeniAdminExtra[state.tab]) await window.StupeniAdminExtra[state.tab](root);
    } catch (e) {
      root.innerHTML = `<p class="error">${escapeHtml(e.message)}</p>`;
    }
  }

  /* ——— Новини ——— */
  async function renderNews(root) {
    const { items } = await api('/api/admin/news');
    root.innerHTML = `
      <div class="toolbar">
        <h2>Новини</h2>
        <button class="btn" id="news-new">+ Нова новина</button>
      </div>
      <div id="news-editor" class="editor panel hidden"></div>
      <div class="grid" id="news-list"></div>`;

    const list = $('#news-list', root);
    list.innerHTML = items
      .map(
        (n) => `
      <article class="card">
        <img loading="lazy" src="${escapeHtml(mediaUrl(n.cover))}" alt="">
        <h3>${escapeHtml(n.title)}</h3>
        <div class="meta">${escapeHtml(n.date)} · <span class="badge ${n.status === 'published' ? 'pub' : 'draft'}">${n.status === 'published' ? 'опубліковано' : 'чернетка'}</span></div>
        <div class="actions">
          <button class="btn secondary" data-edit="${n.id}">Редагувати</button>
          <button class="btn danger" data-del="${n.id}">Видалити</button>
        </div>
      </article>`
      )
      .join('') || '<p class="muted">Поки немає новин</p>';

    $('#news-new', root).onclick = () => openNewsEditor(null);
    $$('[data-edit]', root).forEach((b) => {
      b.onclick = () => openNewsEditor(items.find((x) => x.id === b.dataset.edit));
    });
    $$('[data-del]', root).forEach((b) => {
      b.onclick = async () => {
        if (!confirm('Видалити новину?')) return;
        await api(`/api/admin/news/${b.dataset.del}`, { method: 'DELETE' });
        toast('Видалено');
        render();
      };
    });

    function openNewsEditor(item) {
      const ed = $('#news-editor', root);
      ed.classList.remove('hidden');
      ed.innerHTML = `
        <h3>${item ? 'Редагувати новину' : 'Нова новина'}</h3>
        <div class="row">
          <div><label>Заголовок</label><input id="n-title" value="${escapeHtml(item?.title || '')}"></div>
          <div><label>Slug</label><input id="n-slug" value="${escapeHtml(item?.slug || '')}"></div>
        </div>
        <div class="row">
          <div><label>Дата</label><input id="n-date" type="date" value="${escapeHtml(item?.date || new Date().toISOString().slice(0, 10))}"></div>
          <div><label>Статус</label>
            <select id="n-status">
              <option value="published" ${item?.status !== 'draft' ? 'selected' : ''}>Опубліковано</option>
              <option value="draft" ${item?.status === 'draft' ? 'selected' : ''}>Чернетка</option>
            </select>
          </div>
        </div>
        <label>Обкладинка (URL)</label><input id="n-cover" value="${escapeHtml(item?.cover || '')}">
        <label>Короткий опис</label><textarea id="n-excerpt">${escapeHtml(item?.excerpt || '')}</textarea>
        <label>Текст (HTML)</label><textarea id="n-body" style="min-height:180px">${escapeHtml(item?.body || '')}</textarea>
        <div class="actions" style="display:flex;gap:.5rem">
          <button class="btn" id="n-save">Зберегти</button>
          <button class="btn secondary" id="n-cancel">Скасувати</button>
        </div>`;
      $('#n-cancel', ed).onclick = () => ed.classList.add('hidden');
      $('#n-save', ed).onclick = async () => {
        const body = {
          title: $('#n-title', ed).value.trim(),
          slug: $('#n-slug', ed).value.trim(),
          date: $('#n-date', ed).value,
          status: $('#n-status', ed).value,
          cover: $('#n-cover', ed).value.trim(),
          excerpt: $('#n-excerpt', ed).value.trim(),
          body: $('#n-body', ed).value,
        };
        if (item) await api(`/api/admin/news/${item.id}`, { method: 'PUT', body });
        else await api('/api/admin/news', { method: 'POST', body });
        toast('Збережено');
        render();
      };
    }
  }

  /* ——— Календар ——— */
  async function renderEvents(root) {
    const { items } = await api('/api/admin/events');
    root.innerHTML = `
      <div class="toolbar">
        <h2>Календар / Ритм року</h2>
        <button class="btn" id="ev-new">+ Подія</button>
      </div>
      <div id="ev-editor" class="editor panel hidden"></div>
      <table class="table"><thead><tr>
        <th>Порядок</th><th>Назва</th><th>Сезон / дата</th><th>Фото</th><th></th>
      </tr></thead><tbody id="ev-body"></tbody></table>`;

    $('#ev-body', root).innerHTML = items
      .map(
        (e) => `<tr>
        <td>${e.order ?? 0}</td>
        <td>${escapeHtml(e.title)} ${e.published === false ? '<span class="badge draft">приховано</span>' : ''}</td>
        <td>${escapeHtml(e.season || e.date || '—')}</td>
        <td><img loading="lazy" src="${escapeHtml(mediaUrl(e.image))}" alt="" style="width:64px;height:48px;object-fit:cover;border-radius:6px"></td>
        <td>
          <button class="btn secondary" data-edit="${e.id}">Редаг.</button>
          <button class="btn danger" data-del="${e.id}">×</button>
        </td>
      </tr>`
      )
      .join('');

    $('#ev-new', root).onclick = () => openEv(null);
    $$('[data-edit]', root).forEach((b) => {
      b.onclick = () => openEv(items.find((x) => x.id === b.dataset.edit));
    });
    $$('[data-del]', root).forEach((b) => {
      b.onclick = async () => {
        if (!confirm('Видалити подію?')) return;
        await api(`/api/admin/events/${b.dataset.del}`, { method: 'DELETE' });
        toast('Видалено');
        render();
      };
    });

    function openEv(item) {
      const ed = $('#ev-editor', root);
      ed.classList.remove('hidden');
      ed.innerHTML = `
        <h3>${item ? 'Редагувати подію' : 'Нова подія'}</h3>
        <div class="row">
          <div><label>Назва</label><input id="e-title" value="${escapeHtml(item?.title || '')}"></div>
          <div><label>Порядок</label><input id="e-order" type="number" value="${item?.order ?? items.length}"></div>
        </div>
        <div class="row">
          <div><label>Сезон</label><input id="e-season" value="${escapeHtml(item?.season || '')}" placeholder="осінь / зима…"></div>
          <div><label>Дата</label><input id="e-date" type="date" value="${escapeHtml(item?.date || '')}"></div>
          <div><label>Дата завершення</label><input id="e-dateEnd" type="date" value="${escapeHtml(item?.dateEnd || '')}"></div>
        </div>
        <div class="row">
          <div><label>Тип</label><select id="e-type">${[['holiday','Свято'],['vacation','Канікули'],['school','Шкільна подія'],['meeting','Збори / зустріч'],['other','Інше']].map(([v,l])=>`<option value="${v}" ${(item?.type||'holiday')===v?'selected':''}>${l}</option>`).join('')}</select></div>
          <div><label>Класи</label><input id="e-grades" value="${escapeHtml(item?.grades || '')}" placeholder="1–4, усі…"></div>
          <div><label>Відповідальні</label><input id="e-resp" value="${escapeHtml(item?.responsible || '')}"></div>
        </div>
        <label>Зображення (URL)</label><input id="e-image" value="${escapeHtml(item?.image || '')}">
        <label>Опис</label><textarea id="e-desc">${escapeHtml(item?.description || '')}</textarea>
        <label class="check"><input type="checkbox" id="e-pub" ${item?.published !== false ? 'checked' : ''}> Показувати на сайті</label>
        <div style="display:flex;gap:.5rem;margin-top:.75rem">
          <button class="btn" id="e-save">Зберегти</button>
          <button class="btn secondary" id="e-cancel">Скасувати</button>
        </div>`;
      $('#e-cancel', ed).onclick = () => ed.classList.add('hidden');
      $('#e-save', ed).onclick = async () => {
        const body = {
          title: $('#e-title', ed).value.trim(),
          order: Number($('#e-order', ed).value),
          season: $('#e-season', ed).value.trim(),
          date: $('#e-date', ed).value,
          dateEnd: $('#e-dateEnd', ed).value || $('#e-date', ed).value,
          type: $('#e-type', ed).value,
          grades: $('#e-grades', ed).value.trim(),
          responsible: $('#e-resp', ed).value.trim(),
          image: $('#e-image', ed).value.trim(),
          description: $('#e-desc', ed).value,
          published: $('#e-pub', ed).checked,
        };
        if (item) await api(`/api/admin/events/${item.id}`, { method: 'PUT', body });
        else await api('/api/admin/events', { method: 'POST', body });
        toast('Збережено');
        render();
      };
    }
  }

  const PHOTO_FRAMES = [
    {
      id: 'gallery',
      label: 'Галерея (рвані краї)',
      hint: 'Маска рваного фото + рамка рівнів',
    },
    {
      id: 'torn',
      label: 'Тільки рвані краї',
      hint: 'Лише маска без рамки',
    },
    {
      id: 'levels',
      label: 'Рамка рівнів',
      hint: 'border-levels-home',
    },
    {
      id: 'levels-alt',
      label: 'Рамка рівнів (alt)',
      hint: 'border-levels',
    },
    {
      id: 'rhythm',
      label: 'Ритм року',
      hint: 'як у каруселі свят',
    },
    {
      id: 'teacher',
      label: 'Вчителі',
      hint: 'як у блоці педагогів',
    },
    {
      id: 'none',
      label: 'Без рамки',
      hint: 'Прямі краї',
    },
  ];

  /* ——— Медіа ——— */
  async function renderMedia(root) {
    const { items } = await api('/api/admin/media');
    let filter = 'photos';
    let query = '';

    const photos = items.filter((m) => !m.document && isImageUrl(m.url));
    const docs = items.filter((m) => m.document || /\.pdf$/i.test(m.url || ''));

    root.innerHTML = `
      <div class="toolbar">
        <h2>Медіа <span class="muted" id="media-count"></span></h2>
        <form id="up-form" style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:end">
          <div><label>Файл</label><input type="file" id="up-file" accept="image/*" required></div>
          <div><label>Назва</label><input id="up-title" placeholder="Підпис"></div>
          <label class="check"><input type="checkbox" id="up-kids"> Діти на фото</label>
          <label class="check"><input type="checkbox" id="up-gal" checked> У галерею</label>
          <button class="btn" type="submit">Завантажити</button>
        </form>
      </div>
      <div class="media-filters">
        <button type="button" class="btn secondary" data-filter="photos">Усі фото</button>
        <button type="button" class="btn secondary" data-filter="gallery">Галерея</button>
        <button type="button" class="btn secondary" data-filter="teachers">Вчителі</button>
        <button type="button" class="btn secondary" data-filter="docs">Документи PDF</button>
        <input type="search" id="media-q" placeholder="Пошук за назвою…" style="min-width:180px;flex:1">
      </div>
      <p class="muted">Натисніть «Приміряти рамку», щоб обрати рвані краї / рамку перед публікацією.</p>
      <div class="grid media-grid" id="media-grid"></div>
      <div id="frame-studio" class="frame-studio hidden" aria-hidden="true"></div>`;

    function openFrameStudio(item) {
      const studio = $('#frame-studio', root);
      let frame = item.frame || (item.teacher ? 'teacher' : item.gallery ? 'gallery' : 'gallery');
      const src = mediaUrl(item.url);
      studio.classList.remove('hidden');
      studio.setAttribute('aria-hidden', 'false');
      studio.innerHTML = `
        <div class="frame-studio__backdrop" data-close></div>
        <div class="frame-studio__panel" role="dialog" aria-modal="true" aria-label="Студія рамок">
          <div class="frame-studio__head">
            <h3>Студія рамок</h3>
            <button type="button" class="btn ghost" data-close>✕</button>
          </div>
          <p class="muted">${escapeHtml(item.title || '')}</p>
          <div class="frame-studio__stage">
            <div class="frame-preview frame--${escapeHtml(frame)}" id="frame-preview">
              <img src="${escapeHtml(src)}" alt="">
            </div>
          </div>
          <div class="frame-studio__frames" id="frame-list">
            ${PHOTO_FRAMES.map(
              (f) => `<button type="button" class="frame-chip ${f.id === frame ? 'is-active' : ''}" data-frame="${f.id}">
                <span class="frame-chip__swatch frame--${f.id}"><i></i></span>
                <span class="frame-chip__label">${escapeHtml(f.label)}</span>
                <span class="frame-chip__hint">${escapeHtml(f.hint)}</span>
              </button>`
            ).join('')}
          </div>
          <div class="frame-studio__actions">
            <button type="button" class="btn" id="frame-save">Зберегти рамку</button>
            <label class="check"><input type="checkbox" id="frame-gal" ${item.gallery ? 'checked' : ''}> Показати в галереї сайту</label>
            <button type="button" class="btn secondary" data-close>Скасувати</button>
          </div>
        </div>`;

      function applyPreview(id) {
        frame = id;
        const prev = $('#frame-preview', studio);
        prev.className = `frame-preview frame--${id}`;
        $$('.frame-chip', studio).forEach((c) => {
          c.classList.toggle('is-active', c.dataset.frame === id);
        });
      }

      $$('[data-frame]', studio).forEach((b) => {
        b.onclick = () => applyPreview(b.dataset.frame);
      });
      $$('[data-close]', studio).forEach((b) => {
        b.onclick = () => {
          studio.classList.add('hidden');
          studio.setAttribute('aria-hidden', 'true');
          studio.innerHTML = '';
        };
      });
      $('#frame-save', studio).onclick = async () => {
        const gallery = $('#frame-gal', studio).checked;
        await api(`/api/admin/media/${item.id}`, {
          method: 'PUT',
          body: { frame, gallery },
        });
        item.frame = frame;
        item.gallery = gallery;
        toast('Рамку збережено');
        studio.classList.add('hidden');
        studio.innerHTML = '';
        paint();
      };
    }

    function filtered() {
      let list =
        filter === 'docs'
          ? docs
          : filter === 'gallery'
            ? photos.filter((m) => m.gallery)
            : filter === 'teachers'
              ? photos.filter((m) => m.teacher)
              : photos;
      const q = query.trim().toLowerCase();
      if (q) {
        list = list.filter(
          (m) =>
            String(m.title || '').toLowerCase().includes(q) ||
            String(m.url || '').toLowerCase().includes(q) ||
            String(m.caption || '').toLowerCase().includes(q)
        );
      }
      return list;
    }

    function paint() {
      const list = filtered();
      $('#media-count', root).textContent = `(${list.length})`;
      $$('[data-filter]', root).forEach((b) => {
        b.classList.toggle('active-filter', b.dataset.filter === filter);
      });
      const grid = $('#media-grid', root);
      if (!list.length) {
        grid.innerHTML = '<p class="muted">Нічого не знайдено</p>';
        return;
      }
      grid.innerHTML = list
        .map((m) => {
          const src = mediaUrl(m.url);
          const isDoc = filter === 'docs' || m.document;
          return `<article class="card media-card" data-id="${escapeHtml(m.id)}">
            ${
              isDoc
                ? `<div class="media-thumb media-thumb--doc">PDF</div>`
                : `<a class="media-thumb" href="${escapeHtml(src)}" target="_blank" rel="noopener">
                    <img loading="lazy" decoding="async" src="${escapeHtml(src)}" alt="${escapeHtml(m.title || '')}"
                      onerror="this.closest('.media-thumb').classList.add('is-broken')">
                  </a>`
            }
            <h3 title="${escapeHtml(m.title || '')}">${escapeHtml(m.title || 'Без назви')}</h3>
            <div class="meta">
              ${m.childrenOnPhoto ? '<span class="badge warn">діти</span> ' : ''}
              ${m.gallery ? '<span class="badge pub">галерея</span> ' : ''}
              ${m.teacher ? '<span class="badge">вчитель</span> ' : ''}
              ${m.document ? '<span class="badge">PDF</span> ' : ''}
              ${!isDoc && m.frame ? `<span class="badge">${escapeHtml(m.frame)}</span> ` : ''}
            </div>
            <div class="actions">
              ${
                !isDoc
                  ? `<button class="btn" data-frame-studio="${escapeHtml(m.id)}">Приміряти рамку</button>
                     <button class="btn secondary" data-toggle-gal="${escapeHtml(m.id)}">${m.gallery ? 'Прибрати з галереї' : 'В галерею'}</button>`
                  : `<a class="btn secondary" href="${escapeHtml(src)}" target="_blank" rel="noopener">Відкрити</a>`
              }
              <button class="btn danger" data-del="${escapeHtml(m.id)}">Видалити</button>
            </div>
          </article>`;
        })
        .join('');

      $$('[data-frame-studio]', grid).forEach((b) => {
        b.onclick = () => {
          const item = items.find((x) => x.id === b.dataset.frameStudio);
          if (item) openFrameStudio(item);
        };
      });
      $$('[data-toggle-gal]', grid).forEach((b) => {
        b.onclick = async () => {
          const item = items.find((x) => x.id === b.dataset.toggleGal);
          await api(`/api/admin/media/${item.id}`, {
            method: 'PUT',
            body: { gallery: !item.gallery },
          });
          item.gallery = !item.gallery;
          toast('Оновлено');
          paint();
        };
      });
      $$('[data-del]', grid).forEach((b) => {
        b.onclick = async () => {
          if (!confirm('Видалити з каталогу?')) return;
          await api(`/api/admin/media/${b.dataset.del}`, { method: 'DELETE' });
          const idx = items.findIndex((x) => x.id === b.dataset.del);
          if (idx >= 0) items.splice(idx, 1);
          toast('Видалено');
          paint();
        };
      });
    }

    $$('[data-filter]', root).forEach((b) => {
      b.onclick = () => {
        filter = b.dataset.filter;
        paint();
      };
    });
    $('#media-q', root).oninput = (e) => {
      query = e.target.value || '';
      paint();
    };

    $('#up-form', root).onsubmit = async (ev) => {
      ev.preventDefault();
      const fd = new FormData();
      const file = $('#up-file', root).files[0];
      if (!file) return;
      fd.append('file', file);
      fd.append('title', $('#up-title', root).value || file.name);
      fd.append('childrenOnPhoto', $('#up-kids', root).checked ? 'true' : 'false');
      fd.append('gallery', $('#up-gal', root).checked ? 'true' : 'false');
      await api('/api/admin/media/upload', { method: 'POST', body: fd });
      toast('Завантажено');
      render();
    };

    paint();
  }

  /* ——— Розділи ——— */
  async function renderPages(root) {
    const { items } = await api('/api/admin/pages');
    root.innerHTML = `
      <div class="toolbar">
        <h2>Розділи</h2>
        <button class="btn" id="pg-new">+ Новий розділ</button>
      </div>
      <div id="pg-editor" class="editor panel hidden"></div>
      <table class="table"><thead><tr>
        <th>Назва</th><th>Slug / шлях</th><th>CMS</th><th></th>
      </tr></thead><tbody id="pg-body"></tbody></table>`;

    $('#pg-body', root).innerHTML = items
      .map(
        (p) => `<tr>
        <td>${escapeHtml(p.title)}</td>
        <td><code>${escapeHtml(p.slug)}</code><br><span class="muted">${escapeHtml(p.path || '')}</span></td>
        <td>${p.cmsManaged ? '<span class="badge pub">так</span>' : '<span class="badge">дзеркало</span>'}</td>
        <td>
          <button class="btn secondary" data-edit="${p.id}">Редаг.</button>
          ${p.cmsManaged ? `<button class="btn danger" data-del="${p.id}">×</button>` : ''}
          ${p.cmsManaged ? `<a class="btn ghost" href="/p/${encodeURIComponent(p.slug)}" target="_blank">Відкрити</a>` : ''}
        </td>
      </tr>`
      )
      .join('');

    $('#pg-new', root).onclick = () => openPg(null);
    $$('[data-edit]', root).forEach((b) => {
      b.onclick = () => openPg(items.find((x) => x.id === b.dataset.edit));
    });
    $$('[data-del]', root).forEach((b) => {
      b.onclick = async () => {
        if (!confirm('Видалити розділ?')) return;
        await api(`/api/admin/pages/${b.dataset.del}`, { method: 'DELETE' });
        toast('Видалено');
        render();
      };
    });

    let sections = [];
    try { sections = (await api('/api/admin/pages/_sections')).items || []; } catch { sections = []; }
    let pdfMedia = [];
    try { pdfMedia = ((await api('/api/admin/media')).items || []).filter((m) => m.document || /\.pdf$/i.test(m.url || '')); } catch { pdfMedia = []; }

    function openPg(item) {
      let docs = (item?.documents || []).map((d) => ({ ...d }));
      const ed = $('#pg-editor', root);
      ed.classList.remove('hidden');
      const isNew = !item;
      ed.innerHTML = `
        <h3>${isNew ? 'Новий розділ' : 'Редагувати розділ'}</h3>
        <div class="row">
          <div><label>Назва</label><input id="p-title" value="${escapeHtml(item?.title || '')}"></div>
          <div><label>Slug</label><input id="p-slug" value="${escapeHtml(item?.slug || '')}" ${isNew ? '' : 'disabled'}></div>
        </div>
        <label>Банер (URL)</label><input id="p-banner" value="${escapeHtml(item?.banner || '')}">
        <label>Текст (HTML)</label><textarea id="p-body" style="min-height:200px">${escapeHtml(item?.body || '')}</textarea>
        <div class="panel" style="margin-top:.75rem">
          <h4 style="margin-top:0">Документи PDF на вкладці</h4>
          <p class="muted">PDF показуються на сторінці карточками — відвідувач відкриває або завантажує файл.</p>
          <div id="p-docs"></div>
          <div class="row" style="margin-top:.5rem">
            <div><label>Додати з медіатеки</label>
              <select id="p-doc-pick"><option value="">— оберіть PDF —</option>${pdfMedia
                .map((m) => `<option value="${escapeHtml(m.url)}">${escapeHtml(m.title || m.url)}</option>`)
                .join('')}</select></div>
            <div><label>…або завантажити новий PDF</label><input type="file" id="p-doc-file" accept="application/pdf,.pdf"></div>
          </div>
        </div>
        ${
          isNew
            ? `<label>Розділ сайту (куди додати вкладку)</label>
               <select id="p-parent"><option value="">— окремий пункт меню —</option>${sections
                 .map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.label)}</option>`)
                 .join('')}</select>
               <label class="check"><input type="checkbox" id="p-nav" checked> Додати в меню</label>
               <label>Сторона меню</label>
               <select id="p-side"><option value="left">Ліве</option><option value="right">Праве</option></select>`
            : `<label class="check"><input type="checkbox" id="p-cms" ${item?.cmsManaged || item?.body ? 'checked' : ''}> Керувати через CMS (підміна контенту)</label>`
        }
        <div style="display:flex;gap:.5rem;margin-top:.75rem">
          <button class="btn" id="p-save">Зберегти</button>
          <button class="btn secondary" id="p-cancel">Скасувати</button>
        </div>`;
      function paintDocs() {
        const box = $('#p-docs', ed);
        box.innerHTML = docs.length
          ? docs
              .map(
                (d, i) => `<div style="display:flex;gap:.5rem;align-items:center;margin:.25rem 0">
              <span class="badge">PDF</span>
              <input data-doc-title="${i}" value="${escapeHtml(d.title)}" style="flex:1">
              <a class="btn ghost" href="${escapeHtml(mediaUrl(d.url))}" target="_blank">Відкрити</a>
              <button type="button" class="btn danger" data-doc-del="${i}">×</button></div>`
              )
              .join('')
          : '<p class="muted">Документів ще немає.</p>';
        $('[data-doc-title]', box).forEach((inp) => {
          inp.oninput = () => { docs[+inp.dataset.docTitle].title = inp.value; };
        });
        $('[data-doc-del]', box).forEach((b) => {
          b.onclick = () => { docs.splice(+b.dataset.docDel, 1); paintDocs(); };
        });
      }
      paintDocs();
      $('#p-doc-pick', ed).onchange = (e) => {
        const url = e.target.value;
        if (!url) return;
        const m = pdfMedia.find((x) => x.url === url);
        docs.push({ title: (m?.title || 'Документ').replace(/\.pdf$/i, ''), url });
        e.target.value = '';
        paintDocs();
      };
      $('#p-doc-file', ed).onchange = async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const fd = new FormData();
        fd.append('file', f);
        fd.append('title', f.name.replace(/\.pdf$/i, ''));
        try {
          const up = await api('/api/admin/media/upload', { method: 'POST', body: fd });
          docs.push({ title: up.title, url: up.url });
          pdfMedia.unshift(up);
          toast('PDF завантажено');
          paintDocs();
        } catch (err) {
          toast(err.message || 'Помилка завантаження');
        }
        e.target.value = '';
      };
      $('#p-cancel', ed).onclick = () => ed.classList.add('hidden');
      $('#p-save', ed).onclick = async () => {
        if (isNew) {
          await api('/api/admin/pages', {
            method: 'POST',
            body: {
              title: $('#p-title', ed).value.trim(),
              slug: $('#p-slug', ed).value.trim(),
              banner: $('#p-banner', ed).value.trim(),
              body: $('#p-body', ed).value,
              addToNav: $('#p-nav', ed).checked,
              parent: $('#p-parent', ed).value,
              documents: docs,
              navSide: $('#p-side', ed).value,
            },
          });
        } else {
          await api(`/api/admin/pages/${item.id}`, {
            method: 'PUT',
            body: {
              title: $('#p-title', ed).value.trim(),
              banner: $('#p-banner', ed).value.trim(),
              body: $('#p-body', ed).value,
              cmsManaged: $('#p-cms', ed)?.checked ?? true,
              documents: docs,
            },
          });
        }
        toast('Збережено');
        render();
      };
    }
  }

  /* ——— Педагоги ——— */
  async function renderStaff(root) {
    const { items } = await api('/api/admin/staff');
    root.innerHTML = `
      <div class="toolbar"><h2>Педагоги</h2><button class="btn" id="st-new">+ Додати педагога</button></div>
      <p class="muted">Показуються на сторінці <a href="/p/pedahohy" target="_blank">/p/pedahohy</a>. Фото — URL з медіатеки.</p>
      <div id="st-editor" class="editor panel hidden"></div>
      <table class="table"><thead><tr><th>Фото</th><th>Ім’я</th><th>Посада</th><th>Кваліфікація</th><th>Порядок</th><th></th></tr></thead>
      <tbody>${items.map((s) => `<tr>
        <td>${s.photo ? `<img src="${escapeHtml(mediaUrl(s.photo))}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:6px">` : ''}</td>
        <td>${escapeHtml(s.name)}${s.visible === false ? ' <span class="badge">приховано</span>' : ''}</td><td>${escapeHtml(s.role)}</td><td>${escapeHtml(s.qualification)}</td><td>${s.order || 0}</td>
        <td><button class="btn secondary" data-edit="${s.id}">Редаг.</button> <button class="btn danger" data-del="${s.id}">×</button></td></tr>`).join('')}</tbody></table>`;
    const open = (s) => {
      const ed = $('#st-editor', root); ed.classList.remove('hidden');
      ed.innerHTML = `<h3>${s ? 'Редагувати' : 'Новий педагог'}</h3>
        <div class="row"><div><label>Ім’я та прізвище</label><input id="s-name" value="${escapeHtml(s?.name || '')}"></div>
        <div><label>Посада / роль</label><input id="s-role" value="${escapeHtml(s?.role || '')}"></div></div>
        <label>Кваліфікація</label><input id="s-qual" value="${escapeHtml(s?.qualification || '')}">
        <div class="row"><div><label>Фото (URL)</label><input id="s-photo" value="${escapeHtml(s?.photo || '')}"></div>
        <div><label>…або завантажити фото</label><input type="file" id="s-file" accept="image/*"></div></div>
        <div class="row"><div><label>Порядок</label><input id="s-order" type="number" value="${s?.order || 0}"></div>
        <div><label class="check"><input type="checkbox" id="s-vis" ${s?.visible === false ? '' : 'checked'}> Показувати на сайті</label></div></div>
        <div style="display:flex;gap:.5rem;margin-top:.75rem"><button class="btn" id="s-save">Зберегти</button><button class="btn secondary" id="s-cancel">Скасувати</button></div>`;
      $('#s-cancel', ed).onclick = () => ed.classList.add('hidden');
      $('#s-file', ed).onchange = async (e) => {
        const f = e.target.files[0]; if (!f) return;
        const fd = new FormData(); fd.append('file', f); fd.append('title', f.name);
        try { const up = await api('/api/admin/media/upload', { method: 'POST', body: fd }); $('#s-photo', ed).value = up.url; toast('Фото завантажено'); }
        catch (err) { toast(err.message || 'Помилка'); }
      };
      $('#s-save', ed).onclick = async () => {
        const body = { name: $('#s-name', ed).value.trim(), role: $('#s-role', ed).value.trim(), qualification: $('#s-qual', ed).value.trim(),
          photo: $('#s-photo', ed).value.trim(), order: Number($('#s-order', ed).value) || 0, visible: $('#s-vis', ed).checked };
        await api(s ? `/api/admin/staff/${s.id}` : '/api/admin/staff', { method: s ? 'PUT' : 'POST', body });
        toast('Збережено'); render();
      };
    };
    $('#st-new', root).onclick = () => open(null);
    $$('[data-edit]', root).forEach((b) => { b.onclick = () => open(items.find((x) => x.id === b.dataset.edit)); });
    $$('[data-del]', root).forEach((b) => { b.onclick = async () => { if (!confirm('Видалити?')) return; await api(`/api/admin/staff/${b.dataset.del}`, { method: 'DELETE' }); render(); }; });
  }

  /* ——— Заявки та звернення ——— */
  async function renderInbox(root, kind) {
    const { items } = await api(`/api/admin/${kind}`);
    const title = kind === 'contact' ? 'Звернення з форми «Напишіть нам»' : 'Заявки на вступ';
    const cols = kind === 'contact'
      ? [['your-name', 'Ім’я'], ['your-tel', 'Телефон'], ['your-email', 'E-mail'], ['your-message', 'Повідомлення']]
      : [['childName', 'Дитина'], ['childBirthDate', 'Дата народж.'], ['grade', 'Клас'], ['parentName', 'Батьки'], ['phone', 'Телефон'], ['email', 'E-mail'], ['message', 'Коментар']];
    root.innerHTML = `<div class="toolbar"><h2>${title}</h2></div>
      <p class="muted">Всього: ${items.length}. Дані зберігаються на сервері й не доступні публічно.</p>
      <table class="table"><thead><tr><th>Дата</th>${cols.map((c) => `<th>${c[1]}</th>`).join('')}<th>Статус</th><th></th></tr></thead>
      <tbody>${items.map((m) => `<tr>
        <td>${escapeHtml(new Date(m.createdAt).toLocaleString('uk-UA'))}</td>
        ${cols.map((c) => `<td>${escapeHtml(m[c[0]] || '')}</td>`).join('')}
        <td><select data-status="${m.id}">${['new', 'in-progress', 'done'].map((s) => `<option value="${s}" ${m.status === s ? 'selected' : ''}>${{ new: 'Нова', 'in-progress': 'В роботі', done: 'Оброблено' }[s]}</option>`).join('')}</select></td>
        <td><button class="btn danger" data-del="${m.id}">×</button></td></tr>`).join('') || `<tr><td colspan="${cols.length + 3}" class="muted">Поки порожньо</td></tr>`}</tbody></table>`;
    $$('[data-status]', root).forEach((s) => { s.onchange = async () => { await api(`/api/admin/${kind}/${s.dataset.status}`, { method: 'PUT', body: { status: s.value } }); toast('Збережено'); }; });
    $$('[data-del]', root).forEach((b) => { b.onclick = async () => { if (!confirm('Видалити запис?')) return; await api(`/api/admin/${kind}/${b.dataset.del}`, { method: 'DELETE' }); render(); }; });
  }

  /* ——— Навігація ——— */
  async function renderNav(root) {
    const data = await api('/api/admin/nav');
    root.innerHTML = `
      <div class="toolbar"><h2>Навігація</h2>
        <button class="btn" id="nav-save">Зберегти меню</button>
      </div>
      <p class="muted">JSON меню (left / right). Змініть visible, label, href або порядок.</p>
      <textarea id="nav-json" style="min-height:420px;font-family:ui-monospace,monospace">${escapeHtml(JSON.stringify(data, null, 2))}</textarea>`;
    $('#nav-save', root).onclick = async () => {
      try {
        const parsed = JSON.parse($('#nav-json', root).value);
        await api('/api/admin/nav', { method: 'PUT', body: parsed });
        toast('Меню збережено');
      } catch (e) {
        alert('Невірний JSON: ' + e.message);
      }
    };
  }

  /* ——— Налаштування ——— */
  async function renderSettings(root) {
    const s = await api('/api/admin/settings');
    root.innerHTML = `
      <h2>Налаштування сайту</h2>
      <div class="panel editor">
        <label>Назва сайту</label><input id="s-title" value="${escapeHtml(s.siteTitle || '')}">
        <label>Телефон</label><input id="s-phone" value="${escapeHtml(s.phone || '')}">
        <label>Адреса</label><input id="s-address" value="${escapeHtml(s.address || '')}">
        <button class="btn" id="s-save">Зберегти</button>
      </div>`;
    $('#s-save', root).onclick = async () => {
      await api('/api/admin/settings', {
        method: 'PUT',
        body: {
          siteTitle: $('#s-title', root).value,
          phone: $('#s-phone', root).value,
          address: $('#s-address', root).value,
        },
      });
      toast('Збережено');
    };
  }

  /* ——— Пароль ——— */
  function renderAccount(root) {
    root.innerHTML = `
      <h2>Зміна пароля</h2>
      <div class="panel editor" style="max-width:420px">
        <label>Поточний пароль</label><input type="password" id="pw-cur">
        <label>Новий пароль</label><input type="password" id="pw-new">
        <button class="btn" id="pw-save">Оновити пароль</button>
      </div>`;
    $('#pw-save', root).onclick = async () => {
      await api('/api/admin/me/password', {
        method: 'POST',
        body: {
          currentPassword: $('#pw-cur', root).value,
          newPassword: $('#pw-new', root).value,
        },
      });
      toast('Пароль змінено');
      $('#pw-cur', root).value = '';
      $('#pw-new', root).value = '';
    };
  }

  /* ——— Користувачі (супер-адмін) ——— */
  async function renderUsers(root) {
    const { items } = await api('/api/admin/users');
    const roles = await api('/api/admin/users/roles');
    root.innerHTML = `
      <div class="toolbar">
        <h2>Користувачі</h2>
        <span class="muted">Лише супер-адмін керує доступами</span>
      </div>
      <div class="panel editor">
        <h3>Новий користувач</h3>
        <div class="row">
          <div><label>Логін</label><input id="u-name"></div>
          <div><label>Імʼя</label><input id="u-display"></div>
        </div>
        <div class="row">
          <div><label>Пароль</label><input id="u-pass" type="password"></div>
          <div><label>Роль</label>
            <select id="u-role">
              ${roles.roles.map((r) => `<option value="${r.id}">${escapeHtml(r.label)}</option>`).join('')}
            </select>
          </div>
        </div>
        <button class="btn" id="u-create">Створити</button>
      </div>
      <table class="table"><thead><tr>
        <th>Логін</th><th>Роль</th><th>Статус</th><th></th>
      </tr></thead><tbody id="u-body"></tbody></table>
      <div class="panel editor" style="margin-top:1rem">
        <h3>Рівні доступу</h3>
        <ul class="muted">
          <li><strong>Супер-адмін</strong> — повний доступ + користувачі (один)</li>
          <li><strong>Адмін</strong> — контент, меню, налаштування сайту</li>
          <li><strong>Редактор</strong> — новини, календар, медіа, розділи</li>
          <li><strong>Автор</strong> — новини та медіа</li>
        </ul>
      </div>`;

    $('#u-body', root).innerHTML = items
      .map(
        (u) => `<tr>
        <td>${escapeHtml(u.displayName || u.username)}<br><span class="muted">${escapeHtml(u.username)}</span></td>
        <td>${escapeHtml(roleLabel(u.role))}</td>
        <td>${u.active === false ? '<span class="badge draft">вимкнено</span>' : '<span class="badge pub">активний</span>'}</td>
        <td>
          ${
            u.role === 'superadmin'
              ? '—'
              : `<button class="btn secondary" data-role="${u.id}">Роль</button>
                 <button class="btn danger" data-del="${u.id}">Видалити</button>`
          }
        </td>
      </tr>`
      )
      .join('');

    $('#u-create', root).onclick = async () => {
      await api('/api/admin/users', {
        method: 'POST',
        body: {
          username: $('#u-name', root).value,
          displayName: $('#u-display', root).value,
          password: $('#u-pass', root).value,
          role: $('#u-role', root).value,
        },
      });
      toast('Користувача створено');
      render();
    };

    $$('[data-role]', root).forEach((b) => {
      b.onclick = async () => {
        const role = prompt('Нова роль: admin | editor | author');
        if (!role) return;
        await api(`/api/admin/users/${b.dataset.role}`, { method: 'PUT', body: { role } });
        toast('Роль оновлено');
        render();
      };
    });
    $$('[data-del]', root).forEach((b) => {
      b.onclick = async () => {
        if (!confirm('Видалити користувача?')) return;
        await api(`/api/admin/users/${b.dataset.del}`, { method: 'DELETE' });
        toast('Видалено');
        render();
      };
    });
  }

  /* ——— Boot ——— */
  $('#login-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const err = $('#login-error');
    err.hidden = true;
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: {
          username: $('#username').value.trim(),
          password: $('#password').value,
        },
      });
      setSession(data.token, data.user);
      showApp();
    } catch (e) {
      err.textContent = e.message;
      err.hidden = false;
    }
  };

  $('#logout-btn').onclick = () => logout(true);

  async function boot() {
    if (!state.token) {
      showLoginView();
      return;
    }
    try {
      const me = await api('/api/auth/me');
      setSession(state.token, me.user);
      showApp();
    } catch {
      logout(true);
    }
  }

  boot();
})();
