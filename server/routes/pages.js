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

function cleanDocs(list) {
  return (Array.isArray(list) ? list : [])
    .map((d) => ({ title: String(d?.title || '').trim() || 'Документ', url: String(d?.url || '').trim() }))
    .filter((d) => /^\/data\/uploads\/[\w.-]+\.pdf$/i.test(d.url) || /^https?:\/\//i.test(d.url));
}

function findNavItem(items, id) {
  for (const it of items || []) {
    if (it.id === id) return it;
    const f = findNavItem(it.children, id);
    if (f) return f;
  }
  return null;
}

function removeNavItem(items, id) {
  return (items || []).filter((n) => n.id !== id).map((n) => (n.children ? { ...n, children: removeNavItem(n.children, id) } : n));
}

function publicBySlug(slug) {
  return load().items.find((p) => p.slug === slug && p.cmsManaged);
}

function createAdminRouter() {
  const router = express.Router();

  router.get('/', (_req, res) => {
    res.json({ items: load().items });
  });

  // Розділи верхнього рівня меню — куди можна додати вкладку
  router.get('/_sections', (_req, res) => {
    const nav = loadNav();
    const items = [];
    for (const side of ['left', 'right']) {
      for (const n of nav[side] || []) items.push({ id: n.id, label: n.label, side });
    }
    res.json({ items });
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
      documents: cleanDocs(req.body.documents),
      parent: req.body.parent ? String(req.body.parent) : '',
      cmsManaged: true,
      addToNav: !!req.body.addToNav,
      navSide: req.body.navSide === 'right' ? 'right' : 'left',
      updatedAt: new Date().toISOString(),
    };
    data.items.push(item);
    save(data);

    if (item.addToNav) {
      const nav = loadNav();
      const entry = {
        id: `nav-${item.slug}`,
        label: item.title,
        href: `/p/${item.slug}`,
        visible: true,
        cms: true,
      };
      const parentItem = item.parent ? findNavItem([...(nav.left || []), ...(nav.right || [])], item.parent) : null;
      if (parentItem) {
        parentItem.children = parentItem.children || [];
        parentItem.children.push(entry);
      } else {
        const side = item.navSide;
        nav[side] = nav[side] || [];
        nav[side].push(entry);
      }
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
      documents: req.body.documents !== undefined ? cleanDocs(req.body.documents) : prev.documents || [],
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
      nav[side] = removeNavItem(nav[side], `nav-${item.slug}`);
    }
    saveNav(nav);
    res.json({ ok: true });
  });

  return router;
}

module.exports = { createAdminRouter, publicBySlug, load };
