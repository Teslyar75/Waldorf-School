const express = require('express');
const {
  ROLES,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  requireRole,
} = require('../auth');

function createAdminRouter() {
  const router = express.Router();

  // Лише супер-адмін
  router.use(requireRole('superadmin'));

  router.get('/roles', (_req, res) => {
    const roles = Object.entries(ROLES)
      .filter(([key]) => key !== 'superadmin')
      .map(([key, val]) => ({
        id: key,
        label: val.label,
        permissions: val.permissions,
      }));
    res.json({
      roles,
      superadmin: { id: 'superadmin', label: ROLES.superadmin.label },
    });
  });

  router.get('/', (_req, res) => {
    res.json({ items: listUsers() });
  });

  router.post('/', (req, res) => {
    const result = createUser(req.body || {});
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.status(201).json(result.user);
  });

  router.put('/:id', (req, res) => {
    const result = updateUser(req.params.id, req.body || {}, req.user);
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json(result.user);
  });

  router.delete('/:id', (req, res) => {
    if (req.params.id === req.user.sub) {
      return res.status(400).json({ error: 'Не можна видалити себе' });
    }
    const result = deleteUser(req.params.id);
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json({ ok: true });
  });

  return router;
}

module.exports = { createAdminRouter };
