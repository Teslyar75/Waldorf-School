const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readJson, writeJson } = require('../store');

const FILE = 'nav.json';

function load() {
  return readJson(FILE, { left: [], right: [] });
}

function save(data) {
  writeJson(FILE, data);
}

function publicNav() {
  const data = load();
  const filterTree = (items) =>
    (items || [])
      .filter((i) => i.visible !== false)
      .map((i) => ({
        ...i,
        children: i.children ? filterTree(i.children) : undefined,
      }));
  return {
    left: filterTree(data.left),
    right: filterTree(data.right),
  };
}

function createAdminRouter() {
  const router = express.Router();

  router.get('/', (_req, res) => {
    res.json(load());
  });

  router.put('/', (req, res) => {
    const left = Array.isArray(req.body.left) ? req.body.left : [];
    const right = Array.isArray(req.body.right) ? req.body.right : [];
    const data = { left, right };
    save(data);
    res.json(data);
  });

  router.post('/item', (req, res) => {
    const data = load();
    const side = req.body.side === 'right' ? 'right' : 'left';
    const item = {
      id: req.body.id || uuidv4(),
      label: String(req.body.label || '').trim() || 'Новий пункт',
      href: req.body.href || '#',
      visible: req.body.visible !== false,
      children: [],
    };
    data[side] = data[side] || [];
    data[side].push(item);
    save(data);
    res.status(201).json(item);
  });

  return router;
}

module.exports = { createAdminRouter, publicNav, load };
