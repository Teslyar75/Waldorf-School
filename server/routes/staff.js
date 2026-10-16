const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readJson, writeJson } = require('../store');

const FILE = 'staff.json';
const load = () => readJson(FILE, { items: [] });
const pick = (b, prev = {}) => ({
  name: String(b.name ?? prev.name ?? '').trim(),
  role: String(b.role ?? prev.role ?? '').trim(),
  qualification: String(b.qualification ?? prev.qualification ?? '').trim(),
  photo: String(b.photo ?? prev.photo ?? '').trim(),
  order: Number(b.order ?? prev.order ?? 0) || 0,
  visible: b.visible !== undefined ? !!b.visible : prev.visible !== false,
});

function publicList() {
  return load().items.filter((s) => s.visible !== false).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'uk'));
}

function createAdminRouter() {
  const router = express.Router();
  router.get('/', (_req, res) => res.json(load()));
  router.post('/', (req, res) => {
    const it = { id: uuidv4(), ...pick(req.body || {}) };
    if (!it.name) return res.status(400).json({ error: 'Потрібне ім’я' });
    const d = load(); d.items.push(it); writeJson(FILE, d); res.status(201).json(it);
  });
  router.put('/:id', (req, res) => {
    const d = load(); const i = d.items.findIndex((x) => x.id === req.params.id);
    if (i < 0) return res.status(404).json({ error: 'Не знайдено' });
    d.items[i] = { id: d.items[i].id, ...pick(req.body || {}, d.items[i]) }; writeJson(FILE, d); res.json(d.items[i]);
  });
  router.delete('/:id', (req, res) => {
    const d = load(); writeJson(FILE, { items: d.items.filter((x) => x.id !== req.params.id) }); res.json({ ok: true });
  });
  return router;
}

module.exports = { createAdminRouter, publicList };
