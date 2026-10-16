const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readJson, writeJson, slugify } = require('../store');

const FILE = 'pages.json';
const NAV_FILE = 'nav.json';

function load() {
  return readJson(FILE, { items: [] });
}

function save(data) {
  writeJson(FILE, data);
}

function loadNav() {
  return readJson(NAV_FILE, { left: [], right: [] });
}

function saveNav(data) {
  writeJson(NAV_FILE, data);
}

function publicBySlug(slug) {
  return load().items.find((p) => p.slug === slug && p.cmsManaged);
}

function createAdminRouter() {
  const router = express.Router();

  router.get('/', (_req, res) => {
    res.json({ items: load().items });
  });

  router.get('/:id', (req, res) => {
    const item = load().items.find((p) => p.id === req.params.id || p.slug === req.params.id);
    if (!item) return res.status(404).json({ error: 'Не знайдено' });
    res.json(item);
  });

  router.post('/', (req, res) => {
    const data = load();
    const title = String(req.body.title || '').trim();
    if (!title) return res.status(400).json({ error: 'Потрібен заголовок' });
    const slug = slugify(req.body.slug || title);
    if (data.items.some((p) => p.slug === slug)) {
      return res.status(400).json({ error: 'Slug уже існує' });
    }
    const item = {
      id: uuidv4(),
      title,
      slug,
      path: `/p/${slug}`,
      body: req.body.body || '',
      banner: req.body.banner || '',
      cmsManaged: true,
      addToNav: !!req.body.addToNav,
      navSide: req.body.navSide === 'right' ? 'right' : 'left',
      updatedAt: new Date().toISOString(),
    };
    data.items.push(item);
    save(data);

    if (item.addToNav) {
      const nav = loadNav();
      const side = item.navSide;
      nav[side] = nav[side] || [];
      nav[side].push({
        id: `nav-${item.slug}`,
        label: item.title,
        href: `/p/${item.slug}`,
        visible: true,
        cms: true,
      });
      saveNav(nav);
    }

    res.status(201).json(item);
  });

  router.put('/:id', (req, res) => {
    const data = load();
    const idx = data.items.findIndex((p) => p.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Не знайдено' });
    const prev = data.items[idx];
    data.items[idx] = {
      ...prev,
      title: req.body.title ?? prev.title,
      body: req.body.body ?? prev.body,
      banner: req.body.banner ?? prev.banner,
      cmsManaged: req.body.cmsManaged !== undefined ? !!req.body.cmsManaged : prev.cmsManaged || !!req.body.body,
      updatedAt: new Date().toISOString(),
    };
    save(data);
    res.json(data.items[idx]);
  });

  router.delete('/:id', (req, res) => {
    const data = load();
    const item = data.items.find((p) => p.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Не знайдено' });
    if (!item.cmsManaged) {
      return res.status(400).json({ error: 'Статичні сторінки з дзеркала не видаляються — лише CMS-розділи' });
    }
    save({ items: data.items.filter((p) => p.id !== req.params.id) });
    const nav = loadNav();
    for (const side of ['left', 'right']) {
      nav[side] = (nav[side] || []).filter((n) => n.id !== `nav-${item.slug}`);
    }
    saveNav(nav);
    res.json({ ok: true });
  });

  return router;
}

module.exports = { createAdminRouter, publicBySlug, load };
