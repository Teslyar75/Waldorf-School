#!/usr/bin/env node
/**
 * Щотижневий цикл: стаття про випускника + розсилка батькам.
 * Cron / Task Scheduler / GitHub Actions:
 *   node server/jobs/weekly-alumni.js
 *   node server/jobs/weekly-alumni.js --dry-run
 */
const { ensureDirs } = require('../store');
const { seedSampleAlumni } = require('../alumni/seed-sample');
const { runWeeklyCycle, loadAlumni } = require('../alumni/pipeline');

async function main() {
  ensureDirs();
  const dryRun = process.argv.includes('--dry-run');

  const queued = loadAlumni().items.filter((a) => a.status === 'queued').length;
  if (queued === 0) {
    console.log('Черга порожня — додаємо демо-seed…');
    console.log(JSON.stringify(seedSampleAlumni({ force: true }), null, 2));
  }

  const result = await runWeeklyCycle({ dryRun });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
