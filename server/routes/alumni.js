const express = require('express');
const {
  loadAlumni,
  addAlumni,
  runWeeklyCycle,
  publicPublished,
  publicBySlug,
} = require('../alumni/pipeline');
const { seedSampleAlumni } = require('../alumni/seed-sample');

function createPublicRouter() {
  const router = express.Router();

  router.get('/', (_req, res) => {
    res.json({ items: publicPublished() });
  });

  router.get('/:slug', (req, res) => {
    const item = publicBySlug(req.params.slug);
    if (!item) return res.status(404).json({ error: 'Не знайдено' });
    res.json(item);
  });

  return router;
}

function createAdminRouter() {
  const router = express.Router();

  router.get('/', (_req, res) => {
    const data = loadAlumni();
    res.json({
      meta: data.meta,
      items: data.items,
      queued: data.items.filter((a) => a.status === 'queued').length,
      published: data.items.filter((a) => a.status === 'published').length,
    });
  });

  router.post('/', (req, res) => {
    const result = addAlumni(req.body || {});
    if (!result.ok) return res.status(400).json(result);
    res.status(201).json(result.item);
  });

  router.post('/import-sample', (_req, res) => {
    const result = seedSampleAlumni();
    res.json(result);
  });

  router.post('/run-weekly', async (req, res) => {
    try {
      const result = await runWeeklyCycle({ dryRun: Boolean(req.body?.dryRun) });
      if (!result.ok) return res.status(400).json(result);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  return router;
}

module.exports = { createPublicRouter, createAdminRouter };
