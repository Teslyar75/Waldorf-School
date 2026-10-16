const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readJson, writeJson } = require('../store');

const FILE = 'events.json';

function load() {
  return readJson(FILE, { items: [] });
}

function save(data) {
  writeJson(FILE, data);
}

function publicList() {
  return load()
    .items.filter((e) => e.published !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function createAdminRouter() {
  const router = express.Router();

  router.get('/', (_req, res) => {
    const items = load().items.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    res.json({ items });
  });

  router.post('/', (req, res) => {
    const data = load();
    const title = String(req.body.title || '').trim();
    if (!title) return res.status(400).json({ error: 'Потрібна назва' });
    const item = {
      id: uuidv4(),
      title,
      date: req.body.date || '',
      dateEnd: req.body.dateEnd || req.body.date || '',
      season: req.body.season || '',
      type: req.body.type || 'holiday',
      description: req.body.description || '',
      grades: req.body.grades || '',
      responsible: req.body.responsible || '',
      image: req.body.image || './wp-content/themes/waldorf/images/no-image.png',
      order: Number.isFinite(Number(req.body.order)) ? Number(req.body.order) : data.items.length,
      published: req.body.published !== false,
      showInRhythm: req.body.showInRhythm !== false,
      updatedAt: new Date().toISOString(),
    };
    data.items.push(item);
    save(data);
    res.status(201).json(item);
  });

  router.put('/:id', (req, res) => {
    const data = load();
    const idx = data.items.findIndex((e) => e.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Не знайдено' });
    const prev = data.items[idx];
    data.items[idx] = {
      ...prev,
      title: req.body.title ?? prev.title,
      date: req.body.date ?? prev.date,
      dateEnd: req.body.dateEnd ?? prev.dateEnd,
      season: req.body.season ?? prev.season,
      type: req.body.type ?? prev.type,
      description: req.body.description ?? prev.description,
      grades: req.body.grades ?? prev.grades,
      responsible: req.body.responsible ?? prev.responsible,
      image: req.body.image ?? prev.image,
      order: req.body.order !== undefined ? Number(req.body.order) : prev.order,
      published: req.body.published !== undefined ? !!req.body.published : prev.published,
      showInRhythm: req.body.showInRhythm !== undefined ? !!req.body.showInRhythm : prev.showInRhythm,
      updatedAt: new Date().toISOString(),
    };
    save(data);
    res.json(data.items[idx]);
  });

  router.delete('/:id', (req, res) => {
    const data = load();
    const next = data.items.filter((e) => e.id !== req.params.id);
    if (next.length === data.items.length) return res.status(404).json({ error: 'Не знайдено' });
    save({ items: next });
    res.json({ ok: true });
  });

  router.post('/reorder', (req, res) => {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    const data = load();
    const map = new Map(data.items.map((e) => [e.id, e]));
    const ordered = [];
    ids.forEach((id, i) => {
      const item = map.get(id);
      if (item) {
        item.order = i;
        ordered.push(item);
        map.delete(id);
      }
    });
    for (const rest of map.values()) {
      rest.order = ordered.length;
      ordered.push(rest);
    }
    save({ items: ordered });
    res.json({ items: ordered });
  });

  return router;
}

module.exports = { createAdminRouter, publicList, load };
