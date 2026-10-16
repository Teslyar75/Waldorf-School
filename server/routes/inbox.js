const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readJson, writeJson } = require('../store');

// Звернення з форми «Напишіть нам» і заявки на вступ. Зберігаються в data/ (назовні не віддається).
const FILES = { contact: 'contact-messages.json', applications: 'applications.json' };
const FIELDS = {
  contact: ['your-name', 'your-tel', 'your-email', 'your-message'],
  applications: ['childName', 'childBirthDate', 'grade', 'parentName', 'phone', 'email', 'message', 'consent'],
};
const REQUIRED = {
  contact: [['your-name'], ['your-tel', 'your-email']],
  applications: [['childName'], ['parentName'], ['phone'], ['consent']],
};
const hits = new Map();

function load(kind) { return readJson(FILES[kind], { items: [] }); }

function createPublicHandler(kind) {
  return async (req, res) => {
    const ip = req.ip || 'x';
    const now = Date.now();
    const list = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
    if (list.length >= 10) return res.status(429).json({ error: 'Забагато запитів. Спробуйте пізніше.' });
    list.push(now); hits.set(ip, list);
    const body = req.body || {};
    if (body.website) return res.json({ ok: true, message: 'Дякуємо!' }); // honeypot
    const item = { id: uuidv4(), createdAt: new Date().toISOString(), status: 'new' };
    for (const f of FIELDS[kind]) item[f] = String(body[f] ?? '').trim().slice(0, f.includes('message') ? 2000 : 300);
    for (const group of REQUIRED[kind]) {
      if (!group.some((f) => item[f])) return res.status(400).json({ error: 'Заповніть обов’язкові поля.' });
    }
    const data = load(kind);
    data.items.unshift(item);
    writeJson(FILES[kind], data);
    // Пошта — лише якщо поштовий сервіс уже налаштовано (RESEND_API_KEY + адреса школи)
    try {
      if (process.env.RESEND_API_KEY && process.env.SCHOOL_NOTIFY_EMAIL) {
        const { sendMail } = require('../mail/mailer');
        await sendMail({ to: process.env.SCHOOL_NOTIFY_EMAIL, subject: kind === 'contact' ? 'Нове звернення з сайту' : 'Нова заявка на вступ', text: JSON.stringify(item, null, 2) });
      }
    } catch (e) { console.warn('[inbox] mail failed:', e.message); }
    res.status(201).json({ ok: true, message: kind === 'contact' ? 'Дякуємо! Ми зв’яжемося з вами.' : 'Заявку отримано. Ми зв’яжемося з вами найближчим часом.' });
  };
}

function createAdminRouter(kind) {
  const router = express.Router();
  router.get('/', (_req, res) => res.json(load(kind)));
  router.put('/:id', (req, res) => {
    const data = load(kind);
    const it = data.items.find((x) => x.id === req.params.id);
    if (!it) return res.status(404).json({ error: 'Не знайдено' });
    it.status = String(req.body.status || it.status);
    writeJson(FILES[kind], data);
    res.json(it);
  });
  router.delete('/:id', (req, res) => {
    const data = load(kind);
    writeJson(FILES[kind], { items: data.items.filter((x) => x.id !== req.params.id) });
    res.json({ ok: true });
  });
  return router;
}

module.exports = { createPublicHandler, createAdminRouter };
