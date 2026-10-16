#!/usr/bin/env node
/**
 * Каркас імпорту з theWaldorfs (Famous Alumni By Names).
 * За замовчуванням — dry-run: лише показує, скільки рядків / приклад полів.
 * Повний імпорт увімкнути пізніше з --write після узгодження attribution.
 *
 *   node server/alumni/import-thewaldorfs.js
 *   node server/alumni/import-thewaldorfs.js --write --limit=20
 */
const { addAlumni } = require('./pipeline');

const SOURCE =
  'https://www.thewaldorfs.waldorf.net/publicreports/php/FamousAlumniByNames.php';

async function fetchHtml() {
  const res = await fetch(SOURCE, {
    headers: { 'User-Agent': 'StupeniAlumniImporter/0.1 (+school site scaffold)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/**
 * Дуже простий парсер таблиці — уточнити після зразка HTML у проді.
 * Очікує рядки з посиланням WWW.
 */
function parseRows(html) {
  const rows = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = trRe.exec(html))) {
    const cells = [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) =>
      c[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    );
    const link = (m[1].match(/href=["']([^"']+)["'][^>]*>\s*WWW\s*</i) || [])[1];
    if (cells.length < 5 || !link) continue;
    // Heuristic: First Name, Last Name, … Profession, Profile — уточнити за headers
    rows.push({
      firstName: cells[0] || '',
      lastName: cells[1] || '',
      aka: cells[2] || '',
      country: cells[5] || cells[4] || '',
      profession: cells[cells.length - 3] || '',
      occupationalGroup: cells[cells.length - 4] || '',
      sourceUrl: link,
      profileShort: '',
      source: 'thewaldorfs',
    });
  }
  return rows;
}

async function main() {
  const write = process.argv.includes('--write');
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : 10;

  console.log('Fetching', SOURCE);
  const html = await fetchHtml();
  const rows = parseRows(html);
  console.log(`Parsed rows with WWW: ${rows.length}`);
  console.log('Sample:', JSON.stringify(rows.slice(0, 3), null, 2));

  if (!write) {
    console.log('\nDry-run only. Додайте --write щоб записати в alumni.json (limit=', limit, ')');
    return;
  }

  let added = 0;
  for (const row of rows.slice(0, limit)) {
    const r = addAlumni({
      ...row,
      profileShort: `${row.firstName} ${row.lastName}`.trim()
        ? `${row.firstName} ${row.lastName} — згадка з каталогу theWaldorfs${
            row.profession ? ` (${row.profession})` : ''
          }.`
        : '',
      status: 'queued',
    });
    if (r.ok) added += 1;
  }
  console.log(`Added ${added} (limit ${limit})`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
