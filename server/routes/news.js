const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readJson, writeJson, slugify } = require('../store');

const FILE = 'news.json';

function load() {
  return readJson(FILE, { items: [] });
}

function save(data) {
  writeJson(FILE, data);
}

function publicList() {
  return load()
    .items.filter((n) => n.status === 'published')
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function createAdminRouter() {
  const router = express.Router();

  router.get('/', (_req, res) => {
    const items = load().items.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
    res.json({ items });
  });

  router.get('/:id', (req, res) => {
    const item = load().items.find((n) => n.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Не знайдено' });
    res.json(item);
  });

  router.post('/', (req, res) => {
    const data = load();
    const title = String(req.body.title || '').trim();
    if (!title) return res.status(400).json({ error: 'Потрібен заголовок' });
    const slug = slugify(req.body.slug || title);
    if (data.items.some((n) => n.slug === slug)) {
      return res.status(400).json({ error: 'Slug уже існує' });
    }
    const item = {
      id: uuidv4(),
      title,
      slug,
      date: req.body.date || new Date().toISOString().slice(0, 10),
      cover: req.body.cover || './wp-content/themes/waldorf/images/no-image.png',
      excerpt: req.body.excerpt || '',
      body: req.body.body || '',
      status: req.body.status === 'draft' ? 'draft' : 'published',
      order: data.items.length,
      updatedAt: new Date().toISOString(),
    };
    data.items.unshift(item);
    save(data);
    res.status(201).json(item);
  });

  router.put('/:id', (req, res) => {
    const data = load();
    const idx = data.items.findIndex((n) => n.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Не знайдено' });
    const prev = data.items[idx];
    const slug = slugify(req.body.slug || prev.slug);
    if (data.items.some((n) => n.slug === slug && n.id !== prev.id)) {
      return res.status(400).json({ error: 'Slug уже існує' });
    }
    data.items[idx] = {
      ...prev,
      title: req.body.title ?? prev.title,
      slug,
      date: req.body.date ?? prev.date,
      cover: req.body.cover ?? prev.cover,
      excerpt: req.body.excerpt ?? prev.excerpt,
      body: req.body.body ?? prev.body,
      status: req.body.status === 'draft' ? 'draft' : req.body.status === 'published' ? 'published' : prev.status,
      updatedAt: new Date().toISOString(),
    };
    save(data);
    res.json(data.items[idx]);
  });

  router.delete('/:id', (req, res) => {
    const data = load();
    const next = data.items.filter((n) => n.id !== req.params.id);
    if (next.length === data.items.length) return res.status(404).json({ error: 'Не знайдено' });
    save({ items: next });
    res.json({ ok: true });
  });

  return router;
}

module.exports = { createAdminRouter, publicList, load };
