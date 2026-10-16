const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { readJson, writeJson } = require('../store');
const { sendMail } = require('../mail/mailer');
const { siteUrl } = require('../alumni/pipeline');

const FILE = 'parents.json';

function load() {
  return readJson(FILE, { items: [] });
}

function save(data) {
  writeJson(FILE, data);
}

function token() {
  return crypto.randomBytes(24).toString('hex');
}

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function publicParent(p) {
  return {
    id: p.id,
    email: p.email,
    name: p.name,
    childClass: p.childClass,
    status: p.status,
    consentNewsletter: p.consentNewsletter,
    consentEvents: p.consentEvents,
    createdAt: p.createdAt,
    verifiedAt: p.verifiedAt || null,
  };
}

function createPublicRouter() {
  const router = express.Router();

  router.post('/register', async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const name = String(req.body.name || '').trim();
    const childClass = String(req.body.childClass || '').trim();
    const consentPersonalData = Boolean(req.body.consentPersonalData);
    const consentNewsletter = req.body.consentNewsletter !== false;
    const consentEvents = req.body.consentEvents !== false;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Вкажіть коректний email' });
    }
    if (!consentPersonalData) {
      return res.status(400).json({ error: 'Потрібна згода на обробку персональних даних' });
    }

    const data = load();
    const existing = data.items.find((p) => p.email === email);
    if (existing && existing.status !== 'unsubscribed') {
      return res.status(409).json({
        error: 'Цей email уже зареєстрований',
        status: existing.status,
      });
    }

    const verifyToken = token();
    const unsubscribeToken = token();
    const item = {
      id: uuidv4(),
      email,
      name,
      childClass,
      consentPersonalData: true,
      consentNewsletter,
      consentEvents,
      status: 'pending',
      verifyToken,
      unsubscribeToken,
      createdAt: new Date().toISOString(),
      verifiedAt: null,
    };

    if (existing) {
      const idx = data.items.findIndex((p) => p.id === existing.id);
      data.items[idx] = { ...existing, ...item, id: existing.id };
    } else {
      data.items.push(item);
    }
    save(data);

    const verifyUrl = `${siteUrl()}/api/public/parents/verify?token=${encodeURIComponent(
      verifyToken
    )}`;
    await sendMail({
      to: email,
      subject: 'Підтвердіть реєстрацію — школа «Ступені»',
      kind: 'parent-verify',
      text: `Вітаємо!\n\nПідтвердіть email: ${verifyUrl}\n\nЯкщо ви не реєструвалися — ігноруйте цей лист.`,
      html: `<p>Вітаємо!</p><p><a href="${verifyUrl}">Підтвердити email</a></p><p>Якщо ви не реєструвалися — ігноруйте цей лист.</p>`,
    });

    res.status(201).json({
      ok: true,
      message:
        'Реєстрацію прийнято. Перевірте пошту (локально — див. data/mail-log.json) і підтвердіть email.',
      parent: publicParent(item),
    });
  });

  router.get('/verify', (req, res) => {
    const t = String(req.query.token || '');
    const data = load();
    const idx = data.items.findIndex((p) => p.verifyToken === t);
    if (idx < 0) {
      return res.status(400).type('html').send(simplePage('Посилання недійсне або застаріле.'));
    }
    data.items[idx].status = 'active';
    data.items[idx].verifiedAt = new Date().toISOString();
    data.items[idx].verifyToken = null;
    save(data);
    return res
      .type('html')
      .send(
        simplePage(
          'Email підтверджено. Ви отримуватимете листи про випускників тижня та події школи.',
          '/vypusknyky/'
        )
      );
  });

  router.get('/unsubscribe', (req, res) => {
    const t = String(req.query.token || '');
    const data = load();
    const idx = data.items.findIndex((p) => p.unsubscribeToken === t);
    if (idx < 0) {
      return res.status(400).type('html').send(simplePage('Посилання недійсне.'));
    }
    data.items[idx].status = 'unsubscribed';
    data.items[idx].consentNewsletter = false;
    data.items[idx].consentEvents = false;
    save(data);
    return res.type('html').send(simplePage('Ви відписалися від розсилки.'));
  });

  return router;
}

function createAdminRouter() {
  const router = express.Router();

  router.get('/', (_req, res) => {
    const items = load()
      .items.slice()
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .map(publicParent);
    res.json({ items });
  });

  return router;
}

function simplePage(message, linkHref) {
  const link = linkHref
    ? `<p><a href="${linkHref}">Продовжити</a></p>`
    : `<p><a href="/">На головну</a></p>`;
  return `<!DOCTYPE html><html lang="uk"><head><meta charset="UTF-8"><title>Ступені</title>
<link rel="stylesheet" href="/wp-content/themes/waldorf/style.css"></head>
<body style="max-width:560px;margin:3rem auto;padding:1rem;font-family:Georgia,serif">
<p>${message}</p>${link}</body></html>`;
}

module.exports = {
  createPublicRouter,
  createAdminRouter,
  load,
  publicParent,
};
