/**
 * Шаблони статті та листа про випускника.
 * Текст — коротке власне формулювання + attribution, без копіпасту чужих біографій.
 */

function displayName(alumni) {
  const aka = alumni.aka ? ` («${alumni.aka}»)` : '';
  return `${alumni.firstName || ''} ${alumni.lastName || ''}`.trim() + aka;
}

function buildArticle({ alumni, siteUrl }) {
  const name = displayName(alumni);
  const profession = alumni.profession || alumni.occupationalGroup || 'діяч культури та суспільства';
  const country = alumni.country || '';
  const sourceUrl = alumni.sourceUrl || 'https://www.thewaldorfs.waldorf.net/';
  const blurb =
    alumni.profileShort ||
    `${name} — випускник(ця) вальдорфської (Steiner) школи. Сфера: ${profession}${
      country ? `, країна: ${country}` : ''
    }.`;

  const title = `Випускник тижня: ${name}`;
  const excerpt = blurb.slice(0, 180);
  const bodyHtml = `
<p class="alumni-lead">${escapeHtml(blurb)}</p>
${
  profession
    ? `<p><strong>Професія / роль:</strong> ${escapeHtml(profession)}</p>`
    : ''
}
${country ? `<p><strong>Країна:</strong> ${escapeHtml(country)}</p>` : ''}
${
  alumni.occupationalGroup
    ? `<p><strong>Галузь:</strong> ${escapeHtml(alumni.occupationalGroup)}</p>`
    : ''
}
<p>Ця коротка згадка — частина нашої рубрики «Випускники вальдорфських шкіл»: раз на тиждень ми знайомимо батьків і спільноту «Ступенів» з людьми, які навчалися за вальдорфською педагогікою і згодом реалізували себе в різних сферах життя.</p>
<p><a href="${escapeAttr(sourceUrl)}" target="_blank" rel="noopener noreferrer">Джерело / більше інформації</a></p>
<p class="alumni-attr"><small>Джерело каталогу: <a href="https://www.thewaldorfs.waldorf.net/" target="_blank" rel="noopener noreferrer">theWaldorfs — International List of Famous Waldorf Alumni</a>. Текст на сайті школи — стислий оригінальний переказ українською; деталі біографії дивіться за посиланням вище. Матеріали Wikipedia, якщо вони використані в джерелі, можуть поширюватися за ліцензією CC-BY-SA.</small></p>
`.trim();

  const htmlPage = renderAlumniPage({
    title,
    date: new Date().toISOString().slice(0, 10),
    bodyHtml,
    siteUrl: siteUrl || 'http://127.0.0.1:5180',
  });

  return { title, excerpt, bodyHtml, htmlPage, name };
}

function buildEmail({ alumni, articleUrl, unsubscribeUrl }) {
  const name = displayName(alumni);
  const subject = `Випускник тижня: ${name}`;
  const text = [
    `Вітаємо!`,
    ``,
    `Цього тижня в рубриці «Випускники вальдорфських шкіл» — ${name}.`,
    alumni.profession ? `Сфера: ${alumni.profession}.` : '',
    ``,
    `Читати на сайті: ${articleUrl}`,
    ``,
    `Відписатися: ${unsubscribeUrl}`,
    ``,
    `— Школа «Ступені»`,
  ]
    .filter(Boolean)
    .join('\n');

  const html = `
<div style="font-family: Georgia, serif; line-height: 1.5; color: #333; max-width: 560px;">
  <p>Вітаємо!</p>
  <p>Цього тижня в рубриці «Випускники вальдорфських шкіл» — <strong>${escapeHtml(
    name
  )}</strong>.</p>
  ${
    alumni.profession
      ? `<p>Сфера: ${escapeHtml(alumni.profession)}.</p>`
      : ''
  }
  <p><a href="${escapeAttr(articleUrl)}">Читати коротку згадку на сайті</a></p>
  <p style="font-size: 12px; color: #777; margin-top: 2rem;">
    <a href="${escapeAttr(unsubscribeUrl)}">Відписатися від розсилки</a>
  </p>
</div>
`.trim();

  return { subject, text, html };
}

function renderAlumniPage({ title, date, bodyHtml, siteUrl, slug }) {
  const { wrapInShell } = require('../site-shell');
  const html = wrapInShell({
    title,
    urlPath: slug ? `/vypusknyky/${slug}/` : '/vypusknyky/',
    crumbs: [['Випускники тижня', '/vypusknyky/']],
    bodyHtml: `<p class="muted">${escapeHtml(date)}</p>${bodyHtml}
<div class="st-actions"><a class="btn orange" href="/vypusknyky/">Усі випускники тижня</a><a class="btn" href="/batky/">Для батьків</a></div>`,
  });
  if (html) return html;
  return `<!DOCTYPE html><html lang="uk"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title><link rel="stylesheet" href="/wp-content/themes/waldorf/style.css"><link rel="stylesheet" href="/assets/site-extra.css"></head><body><main class="page"><div class="content"><h1>${escapeHtml(title)}</h1>${bodyHtml}</div></main></body></html>`;
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

module.exports = {
  displayName,
  buildArticle,
  buildEmail,
  renderAlumniPage,
};
