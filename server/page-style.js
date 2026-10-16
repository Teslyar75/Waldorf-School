'use strict';
/* Єдиний стиль /p/-сторінок як у «Структурі школи»: персикова підкладка .levels з рваними краями,
   шахматні блоки «текст + ілюстрація» (лише реальні фото школи з сайту), текстові сторінки —
   читабельна колонка на кремовій рваній підкладці. */
const U = '/wp-content/uploads/2023/12/';
const ILLUS = {
  vstup: [U + 'elementary-school.jpg', U + 'kindergarten-stupeni.jpg', U + 'school2.jpg'],
  'materialno-tekhnichna-baza': [U + 'school1.jpg'],
  rozklad: [U + 'school-day-rotated.jpg'],
  inkliuziia: [U + 'correctional-treatment-block.jpg'],
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function split(body) {
  const parts = String(body || '').split(/(?=<h2[\s>])/i);
  let intro = '';
  const secs = [];
  for (const p of parts) {
    const m = p.match(/^<h2[^>]*>([\s\S]*?)<\/h2>([\s\S]*)$/i);
    if (m) secs.push({ h: m[1].trim(), html: m[2].trim() });
    else intro += p;
  }
  return { intro: intro.trim(), secs };
}

function styleable(body) {
  return !/class="(levels|news-list)|st-world-grid|st-club/.test(body || '');
}

function renderStyled({ slug, title, body, docsHtml, extraHtml }) {
  const illus = ILLUS[slug] || [];
  const { intro, secs } = split(body);
  const out = [`<div class="levels rel flex st-page st-page--${illus.length ? 'chess' : 'text'}" id="st-page">`, `<h2>${esc(title)}</h2>`];
  const forms = [];
  const textSecs = [];
  // Секції з формою — окремим блоком внизу
  const plain = secs.filter((s) => { if (/<form[\s>]/i.test(s.html)) { forms.push(s); return false; } return true; });
  if (illus.length) {
    if (intro && plain.length) out.push(`<div class="st-lead">${intro}</div>`);
    const blocks = plain.length ? plain : [{ h: '', html: intro }];
    blocks.forEach((s, i) => {
      const img = illus[i % illus.length];
      const useImg = i < illus.length;
      if (!useImg) { textSecs.push(s); return; }
      out.push(`<div class="level flex st-sec"><div class="level-photo"><img src="${img}" alt="${esc(s.h ? s.h.replace(/<[^>]+>/g, '') : title)}" loading="lazy"></div><div class="info">${s.h ? `<h3>${s.h}</h3>` : ''}<div class="desc">${s.html}</div></div></div>`);
    });
  } else {
    if (intro) textSecs.unshift({ h: '', html: intro });
    plain.forEach((s) => textSecs.push(s));
  }
  if (textSecs.length) {
    out.push(`<div class="st-textcard">${textSecs.map((s) => `<section class="st-tsec">${s.h ? `<h3>${s.h}</h3>` : ''}${s.html}</section>`).join('')}</div>`);
  }
  forms.forEach((s) => out.push(`<div class="st-formcard">${s.h ? `<h3>${s.h}</h3>` : ''}${s.html}</div>`));
  if (extraHtml) out.push(`<div class="st-wide">${extraHtml}</div>`);
  if (docsHtml) out.push(`<div class="st-textcard st-docs">${docsHtml}</div>`);
  out.push('</div>');
  return out.join('\n');
}

module.exports = { renderStyled, styleable };
