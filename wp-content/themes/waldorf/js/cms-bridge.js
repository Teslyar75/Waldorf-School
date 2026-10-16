/**
 * Підтягує контент з CMS (/api/public/*) і оновлює блоки на сторінці.
 */
(function () {
  function apiBase() {
    return '';
  }

  function formatDate(iso) {
    if (!iso) return '';
    const [y, m, d] = String(iso).slice(0, 10).split('-');
    if (!y) return iso;
    return `${d}.${m}.${y}`;
  }

  function absUrl(url) {
    if (!url) return url;
    if (url.startsWith('http') || url.startsWith('/')) return url;
    if (url.startsWith('./')) return '/' + url.slice(2);
    return url;
  }

  async function getJson(path) {
    const res = await fetch(apiBase() + path, { credentials: 'same-origin' });
    if (!res.ok) throw new Error(path);
    return res.json();
  }

  function destroyFlickity(el) {
    if (!el || !window.Flickity) return;
    const flkty = Flickity.data(el);
    if (flkty) flkty.destroy();
  }

  function initFlickity(el, options) {
    if (!el || !window.Flickity) return;
    // eslint-disable-next-line no-new
    new Flickity(el, options);
  }

  async function renderNews() {
    const box = document.querySelector('[data-cms="news"]');
    if (!box) return;
    const { items } = await getJson('/api/public/news');
    const heading = box.querySelector('h2');
    const allNews = box.querySelector('.all-news');
    const cards = (items || [])
      .slice(0, 5)
      .map((n) => {
        // Старі новини з дзеркала мають папку /slug/; нові з CMS — /p/slug
        const link = String(n.id || '').startsWith('news-')
          ? `/${n.slug}/`
          : `/p/${encodeURIComponent(n.slug)}`;
        return `<a href="${link}" class="new flex">
          <img src="${absUrl(n.cover)}" alt="">
          <div class="title">${n.title || ''}</div>
          <div class="date">${formatDate(n.date)}</div>
          <div class="info">${n.excerpt || ''}</div>
          <div class="btn">Читати далі</div>
        </a>`;
      })
      .join('');
    box.innerHTML = '';
    if (heading) box.appendChild(heading);
    else {
      const h = document.createElement('h2');
      h.textContent = 'Новини';
      box.appendChild(h);
    }
    box.insertAdjacentHTML('beforeend', cards);
    if (allNews) box.appendChild(allNews);
    else {
      box.insertAdjacentHTML(
        'beforeend',
        '<div class="all-news"><a href="/news/" class="btn orange">Всі новини</a></div>'
      );
    }
  }

  async function renderEvents() {
    const wrap = document.querySelector('[data-cms="events"]');
    if (!wrap) return;
    const carousel = wrap.querySelector('.carousel') || wrap;
    const { items } = await getJson('/api/public/events');
    const rhythm = (items || []).filter((e) => e.showInRhythm !== false && e.type !== 'vacation' && e.type !== 'epoch');
    const list = rhythm.length ? rhythm : items || [];
    destroyFlickity(carousel);
    carousel.innerHTML = list
      .map(
        (e) => `<div class="carousel-cell flex">
        <img src="${absUrl(e.image)}" alt="">
        <h3>${e.title || ''}</h3>
      </div>`
      )
      .join('');
    initFlickity(carousel, {
      wrapAround: true,
      autoPlay: 3000,
      pauseAutoPlayOnHover: false,
      cellAlign: 'left',
    });
  }

  async function renderGallery() {
    const wrap = document.querySelector('[data-cms="gallery"]');
    if (!wrap) return;
    const carousel = wrap.querySelector('.carousel');
    if (!carousel) return;
    const { items } = await getJson('/api/public/gallery');
    if (!items || !items.length) return;
    destroyFlickity(carousel);
    carousel.innerHTML = items
      .map((m) => {
        const frame = m.frame || 'gallery';
        return `<div class="carousel-cell cms-frame cms-frame--${frame}">
        <img class="carousel-cell-image" src="${absUrl(m.url)}" data-flickity-lazyload="${absUrl(m.url)}" alt="${(m.title || '').replace(/"/g, '&quot;')}">
      </div>`;
      })
      .join('');
    initFlickity(carousel, { fullscreen: true, lazyLoad: 1, wrapAround: true });
  }

  async function applySettings() {
    try {
      const s = await getJson('/api/public/settings');
      const phone = document.querySelector('[data-cms="phone"]');
      if (phone && s.phone) {
        phone.textContent = s.phone;
        if (phone.tagName === 'A') {
          phone.href = 'tel:' + String(s.phone).replace(/\s/g, '');
        }
      }
    } catch (_) {
      /* ignore */
    }
  }

  async function run() {
    try {
      await Promise.all([renderNews(), renderEvents(), renderGallery(), applySettings()]);
    } catch (e) {
      console.warn('[cms-bridge]', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
