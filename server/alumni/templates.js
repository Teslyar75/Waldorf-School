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

function renderAlumniPage({ title, date, bodyHtml, siteUrl }) {
  return `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} — Ступені</title>
  <link rel="stylesheet" href="/wp-content/themes/waldorf/style.css">
  <style>
    .alumni-page { max-width: 720px; margin: 2rem auto; padding: 1rem 1.5rem 3rem; }
    .alumni-page h1 { margin-bottom: 0.35rem; font-size: 1.75rem; }
    .alumni-date { color: #666; margin-bottom: 1.25rem; }
    .alumni-lead { font-size: 1.1rem; }
    .alumni-attr { margin-top: 2rem; color: #666; }
    .alumni-nav { margin: 1rem 1.5rem; display: flex; gap: 1rem; flex-wrap: wrap; }
  </style>
</head>
<body>
  <nav class="alumni-nav">
    <a class="btn orange" href="/">← На головну</a>
    <a class="btn" href="/vypusknyky/">Усі випускники тижня</a>
    <a class="btn" href="/batky/">Для батьків</a>
  </nav>
  <article class="alumni-page">
    <h1>${escapeHtml(title)}</h1>
    <p class="alumni-date">${escapeHtml(date)}</p>
    <div class="alumni-body">${bodyHtml}</div>
  </article>
</body>
</html>`;
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
