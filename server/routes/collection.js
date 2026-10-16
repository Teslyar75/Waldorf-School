// Універсальна колекція (книги, документи): JSON у data/, CRUD для адмінки, публічний список.
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readJson, writeJson } = require('../store');

function createCollection({ file, fields, required = ['title'] }) {
  const load = () => readJson(file, { items: [] });
  const save = (d) => writeJson(file, d);
  const pick = (b, prev = {}) => {
    const out = {};
    for (const [k, type] of Object.entries(fields)) {
      const v = b[k] !== undefined ? b[k] : prev[k];
      if (type === 'bool') out[k] = v === undefined ? (k === 'visible') : !!v;
      else if (type === 'number') out[k] = Number(v) || 0;
      else if (type === 'links') out[k] = (Array.isArray(v) ? v : []).map((l) => ({ label: String(l.label || '').trim(), url: String(l.url || '').trim() })).filter((l) => /^https?:\/\//.test(l.url) || l.url.startsWith('/'));
      else out[k] = String(v ?? '').trim();
    }
    return out;
  };
  const sorted = (items) => [...items].sort((a, b) => (a.order || 0) - (b.order || 0));
  const publicList = () => sorted(load().items.filter((x) => x.visible !== false));
  function createAdminRouter() {
    const r = express.Router();
    r.get('/', (_q, res) => res.json({ items: sorted(load().items) }));
    r.post('/', (q, res) => {
      const it = { id: uuidv4(), ...pick(q.body || {}) };
      for (const f of required) if (!it[f]) return res.status(400).json({ error: 'Заповніть поле «' + f + '»' });
      const d = load(); if (!q.body.order) it.order = (d.items.length + 1) * 10; d.items.push(it); save(d); res.status(201).json(it);
    });
    r.put('/reorder', (q, res) => {
      const ids = Array.isArray(q.body.ids) ? q.body.ids : [];
      const d = load(); d.items.forEach((x) => { const i = ids.indexOf(x.id); if (i >= 0) x.order = (i + 1) * 10; }); save(d); res.json({ ok: true });
    });
    r.put('/:id', (q, res) => {
      const d = load(); const i = d.items.findIndex((x) => x.id === q.params.id);
      if (i < 0) return res.status(404).json({ error: 'Не знайдено' });
      d.items[i] = { id: d.items[i].id, ...pick(q.body || {}, d.items[i]) }; save(d); res.json(d.items[i]);
    });
    r.delete('/:id', (q, res) => { const d = load(); save({ items: d.items.filter((x) => x.id !== q.params.id) }); res.json({ ok: true }); });
    return r;
  }
  return { load, publicList, createAdminRouter };
}

module.exports = { createCollection };
