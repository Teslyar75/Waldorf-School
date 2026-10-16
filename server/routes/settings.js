const express = require('express');
const { readJson, writeJson } = require('../store');

const FILE = 'settings.json';

function load() {
  return readJson(FILE, {
    phone: '+380 48 799-70-24',
    address: "Україна 65104, м. Одеса, вул. Сім'ї Глодан, 31-А (колишня вул. Ільфа та Петрова)",
    siteTitle: 'Ступені — Вальдорфський ліцей і дитячий садок',
  });
}

function save(data) {
  writeJson(FILE, data);
}

function createAdminRouter() {
  const router = express.Router();

  router.get('/', (_req, res) => {
    res.json(load());
  });

  router.put('/', (req, res) => {
    const prev = load();
    const next = {
      phone: req.body.phone ?? prev.phone,
      address: req.body.address ?? prev.address,
      siteTitle: req.body.siteTitle ?? prev.siteTitle,
    };
    save(next);
    res.json(next);
  });

  return router;
}

module.exports = { createAdminRouter, load };
