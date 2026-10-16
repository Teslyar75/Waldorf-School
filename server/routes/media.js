const express = require('express');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { readJson, writeJson, UPLOADS_DIR, ensureDirs } = require('../store');

const FILE = 'media.json';

function load() {
  return readJson(FILE, { items: [] });
}

function save(data) {
  writeJson(FILE, data);
}

function publicGallery() {
  return load().items.filter((m) => m.gallery);
}

function createUpload() {
  ensureDirs();
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${Date.now()}-${uuidv4().slice(0, 8)}${ext}`);
    },
  });
  return multer({
    storage,
    limits: { fileSize: 12 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Тільки зображення'));
      }
      cb(null, true);
    },
  });
}

function createAdminRouter() {
  const router = express.Router();
  const upload = createUpload();

  router.get('/', (_req, res) => {
    res.json({ items: load().items });
  });

  router.post('/upload', (req, res) => {
    upload.single('file')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'Помилка завантаження' });
      if (!req.file) return res.status(400).json({ error: 'Файл не передано' });
      const data = load();
      const item = {
        id: uuidv4(),
        title: req.body.title || req.file.originalname,
        url: `/data/uploads/${req.file.filename}`,
        caption: req.body.caption || '',
        childrenOnPhoto: req.body.childrenOnPhoto === 'true' || req.body.childrenOnPhoto === true,
        gallery: req.body.gallery === 'true' || req.body.gallery === true,
        frame: req.body.frame || 'gallery',
        source: 'upload',
        createdAt: new Date().toISOString(),
      };
      data.items.unshift(item);
      save(data);
      res.status(201).json(item);
    });
  });

  router.put('/:id', (req, res) => {
    const data = load();
    const idx = data.items.findIndex((m) => m.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Не знайдено' });
    const prev = data.items[idx];
    data.items[idx] = {
      ...prev,
      title: req.body.title ?? prev.title,
      caption: req.body.caption ?? prev.caption,
      url: req.body.url ?? prev.url,
      childrenOnPhoto:
        req.body.childrenOnPhoto !== undefined ? !!req.body.childrenOnPhoto : prev.childrenOnPhoto,
      gallery: req.body.gallery !== undefined ? !!req.body.gallery : prev.gallery,
      frame: req.body.frame !== undefined ? String(req.body.frame || 'gallery') : prev.frame || 'gallery',
    };
    save(data);
    res.json(data.items[idx]);
  });

  router.delete('/:id', (req, res) => {
    const data = load();
    const next = data.items.filter((m) => m.id !== req.params.id);
    if (next.length === data.items.length) return res.status(404).json({ error: 'Не знайдено' });
    save({ items: next });
    res.json({ ok: true });
  });

  return router;
}

module.exports = { createAdminRouter, publicGallery, load };
