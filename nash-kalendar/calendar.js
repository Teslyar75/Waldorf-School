(() => {
  const MONTHS = [
    'січень', 'лютий', 'березень', 'квітень', 'травень', 'червень',
    'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень',
  ];
  const TYPE_LABEL = {
    holiday: 'Свято',
    vacation: 'Канікули',
    epoch: 'Епоха',
    'open-day': 'Відкриті двері',
    market: 'Ярмарок',
  };

  let events = [];
  let viewYear = 2026;
  let viewMonth = 8; // вересень 2026 (0-based)
  let selectedKey = null;

  const grid = document.getElementById('cal-grid');
  const title = document.getElementById('cal-month-title');
  const selectedTitle = document.getElementById('cal-selected-title');
  const selectedList = document.getElementById('cal-selected-list');
  const fullList = document.getElementById('cal-full-list');

  function parseDay(iso) {
    if (!iso) return null;
    const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function keyOf(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatRange(start, end) {
    const a = String(start || '').slice(0, 10);
    const b = String(end || start || '').slice(0, 10);
    if (!a) return '—';
    const fmt = (s) => {
      const [y, m, d] = s.split('-');
      return `${d}.${m}.${y}`;
    };
    return a === b ? fmt(a) : `${fmt(a)} – ${fmt(b)}`;
  }

  function eventsOnDay(dayDate) {
    const t = dayDate.setHours(0, 0, 0, 0);
    return events.filter((ev) => {
      const start = parseDay(ev.date);
      if (!start) return false;
      const end = parseDay(ev.dateEnd || ev.date) || start;
      const s = start.setHours(0, 0, 0, 0);
      const e = end.setHours(0, 0, 0, 0);
      return t >= s && t <= e;
    });
  }

  function typesOnDay(dayDate) {
    const set = new Set(eventsOnDay(dayDate).map((e) => e.type || 'holiday'));
    return [...set];
  }

  function eventCard(ev) {
    const type = ev.type || 'holiday';
    return `<article class="event-card">
      <span class="etype ${type}">${TYPE_LABEL[type] || type}</span>
      <h4>${escapeHtml(ev.title)}</h4>
      <p><strong>Дата:</strong> ${formatRange(ev.date, ev.dateEnd)}</p>
      ${ev.grades ? `<p><strong>Класи:</strong> ${escapeHtml(ev.grades)}</p>` : ''}
      ${ev.description ? `<p>${escapeHtml(ev.description)}</p>` : ''}
      ${ev.responsible ? `<p><strong>Відповідальні:</strong> ${escapeHtml(ev.responsible)}</p>` : ''}
    </article>`;
  }

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderMonth() {
    title.textContent = `${MONTHS[viewMonth]} ${viewYear}`;
    const first = new Date(viewYear, viewMonth, 1);
    const startPad = (first.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const todayKey = keyOf(new Date());

    const cells = [];
    for (let i = 0; i < startPad; i += 1) {
      const d = new Date(viewYear, viewMonth, -startPad + i + 1);
      cells.push(dayCell(d, true, todayKey));
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const d = new Date(viewYear, viewMonth, day);
      cells.push(dayCell(d, false, todayKey));
    }
    while (cells.length % 7 !== 0) {
      const extra = cells.length - startPad - daysInMonth + 1;
      const d = new Date(viewYear, viewMonth + 1, extra);
      cells.push(dayCell(d, true, todayKey));
    }
    grid.innerHTML = cells.join('');

    grid.querySelectorAll('.cal-day.has-event').forEach((el) => {
      el.addEventListener('click', () => {
        selectedKey = el.dataset.key;
        renderMonth();
        showSelected(selectedKey);
      });
    });
  }

  function dayCell(date, other, todayKey) {
    const key = keyOf(date);
    const types = typesOnDay(new Date(date));
    const has = types.length > 0;
    const cls = [
      'cal-day',
      other ? 'other' : '',
      has ? 'has-event' : '',
      key === todayKey ? 'today' : '',
      key === selectedKey ? 'selected' : '',
    ]
      .filter(Boolean)
      .join(' ');
    const marks = types.map((t) => `<i class="dot ${t}" title="${TYPE_LABEL[t] || t}"></i>`).join('');
    return `<div class="${cls}" data-key="${key}" role="gridcell" ${has ? 'tabindex="0"' : ''}>
      <span class="num">${date.getDate()}</span>
      ${has ? `<div class="cal-marks">${marks}</div>` : ''}
    </div>`;
  }

  function showSelected(key) {
    if (!key) return;
    const [y, m, d] = key.split('-').map(Number);
    const dayDate = new Date(y, m - 1, d);
    const list = eventsOnDay(dayDate);
    selectedTitle.textContent = `${d}.${String(m).padStart(2, '0')}.${y}`;
    selectedList.innerHTML = list.length
      ? list.map(eventCard).join('')
      : '<p class="muted">Цього дня подій немає.</p>';
  }

  function renderFullList() {
    const sorted = events
      .slice()
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    fullList.innerHTML = sorted.map(eventCard).join('');
  }

  document.getElementById('cal-prev').onclick = () => {
    viewMonth -= 1;
    if (viewMonth < 0) {
      viewMonth = 11;
      viewYear -= 1;
    }
    renderMonth();
  };
  document.getElementById('cal-next').onclick = () => {
    viewMonth += 1;
    if (viewMonth > 11) {
      viewMonth = 0;
      viewYear += 1;
    }
    renderMonth();
  };

  async function boot() {
    try {
      const res = await fetch('/api/public/events');
      const data = await res.json();
      events = (data.items || []).filter((e) => e.date);
    } catch (e) {
      console.warn(e);
      events = [];
    }
    renderMonth();
    renderFullList();
    // Показати першу подію вересня за замовчуванням
    selectedKey = '2026-09-01';
    renderMonth();
    showSelected(selectedKey);
  }

  boot();
})();
