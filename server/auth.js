const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { readJson, writeJson } = require('./store');

const JWT_SECRET = process.env.CMS_JWT_SECRET || 'stupeni-local-cms-dev-secret';
if (!process.env.CMS_JWT_SECRET) {
  console.warn('[auth] УВАГА: CMS_JWT_SECRET не задано — використовується локальний dev-секрет. Перед публікацією задайте змінну середовища CMS_JWT_SECRET.');
}
const USERS_FILE = 'users.json';

/** Ролі (від найвищої до найнижчої) */
const ROLES = {
  superadmin: {
    label: 'Супер-адмін',
    permissions: ['*'],
  },
  admin: {
    label: 'Адмін',
    permissions: [
      'news',
      'events',
      'media',
      'pages',
      'nav',
      'settings',
      'password:self',
    ],
  },
  editor: {
    label: 'Редактор',
    permissions: ['news', 'events', 'media', 'pages', 'password:self'],
  },
  author: {
    label: 'Автор',
    permissions: ['news', 'media', 'password:self'],
  },
};

const ROLE_RANK = { author: 1, editor: 2, admin: 3, superadmin: 4 };

function defaultUsers() {
  const hash = bcrypt.hashSync('admin', 10);
  return {
    users: [
      {
        id: 'superadmin',
        username: 'admin',
        passwordHash: hash,
        role: 'superadmin',
        displayName: 'Супер-адмін',
        active: true,
      },
    ],
  };
}

function loadUsers() {
  const data = readJson(USERS_FILE, defaultUsers());
  // Міграція старих записів без superadmin
  if (data.users?.length) {
    let changed = false;
    for (const u of data.users) {
      if (!u.role || u.role === 'admin' && u.username === 'admin' && !data.users.some((x) => x.role === 'superadmin')) {
        if (u.username === 'admin') {
          u.role = 'superadmin';
          u.id = u.id || 'superadmin';
          changed = true;
        }
      }
      if (u.active === undefined) {
        u.active = true;
        changed = true;
      }
    }
    if (changed) saveUsers(data);
  }
  return data;
}

function saveUsers(data) {
  writeJson(USERS_FILE, data);
}

function ensureDefaultAdmin() {
  const data = loadUsers();
  if (!data.users || !data.users.length) {
    saveUsers(defaultUsers());
  } else if (!data.users.some((u) => u.role === 'superadmin')) {
    // Гарантуємо одного супер-адміна
    const first = data.users[0];
    first.role = 'superadmin';
    saveUsers(data);
  }
}

function findUser(username) {
  const data = loadUsers();
  return data.users.find((u) => u.username === username);
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    displayName: user.displayName || user.username,
    active: user.active !== false,
    permissions: getPermissions(user.role),
  };
}

function getPermissions(role) {
  const def = ROLES[role];
  if (!def) return [];
  if (def.permissions.includes('*')) {
    return ['*'];
  }
  return [...def.permissions];
}

function hasPermission(role, permission) {
  const perms = getPermissions(role);
  if (perms.includes('*')) return true;
  return perms.includes(permission);
}

function login(username, password) {
  const user = findUser(username);
  if (!user || user.active === false || !bcrypt.compareSync(password, user.passwordHash)) {
    return null;
  }
  const token = jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  return { token, user: publicUser(user) };
}

function changePassword(username, currentPassword, newPassword) {
  const data = loadUsers();
  const user = data.users.find((u) => u.username === username);
  if (!user || !bcrypt.compareSync(currentPassword, user.passwordHash)) {
    return { ok: false, error: 'Невірний поточний пароль' };
  }
  if (!newPassword || newPassword.length < 4) {
    return { ok: false, error: 'Новий пароль має бути щонайменше 4 символи' };
  }
  user.passwordHash = bcrypt.hashSync(newPassword, 10);
  saveUsers(data);
  return { ok: true };
}

function listUsers() {
  return loadUsers().users.map(publicUser);
}

function createUser({ username, password, role, displayName }) {
  const data = loadUsers();
  const uname = String(username || '').trim().toLowerCase();
  if (!uname || uname.length < 2) return { ok: false, error: 'Логін занадто короткий' };
  if (data.users.some((u) => u.username === uname)) {
    return { ok: false, error: 'Такий логін уже існує' };
  }
  if (!ROLES[role] || role === 'superadmin') {
    return { ok: false, error: 'Недопустима роль (супер-адмін лише один)' };
  }
  if (!password || password.length < 4) {
    return { ok: false, error: 'Пароль має бути щонайменше 4 символи' };
  }
  const user = {
    id: uuidv4(),
    username: uname,
    passwordHash: bcrypt.hashSync(password, 10),
    role,
    displayName: displayName || uname,
    active: true,
  };
  data.users.push(user);
  saveUsers(data);
  return { ok: true, user: publicUser(user) };
}

function updateUser(id, patch, actor) {
  const data = loadUsers();
  const idx = data.users.findIndex((u) => u.id === id);
  if (idx < 0) return { ok: false, error: 'Користувача не знайдено' };
  const user = data.users[idx];

  // Не можна змінити роль супер-адміна або створити другого
  if (user.role === 'superadmin') {
    if (patch.role && patch.role !== 'superadmin') {
      return { ok: false, error: 'Не можна змінити роль супер-адміна' };
    }
    if (patch.active === false) {
      return { ok: false, error: 'Не можна деактивувати супер-адміна' };
    }
  }
  if (patch.role === 'superadmin' && user.role !== 'superadmin') {
    return { ok: false, error: 'Супер-адмін уже є; другий не створюється' };
  }
  if (patch.role && !ROLES[patch.role]) {
    return { ok: false, error: 'Невідома роль' };
  }
  if (patch.displayName !== undefined) user.displayName = String(patch.displayName);
  if (patch.role !== undefined && user.role !== 'superadmin') user.role = patch.role;
  if (patch.active !== undefined && user.role !== 'superadmin') user.active = !!patch.active;
  if (patch.password) {
    if (String(patch.password).length < 4) {
      return { ok: false, error: 'Пароль має бути щонайменше 4 символи' };
    }
    user.passwordHash = bcrypt.hashSync(patch.password, 10);
  }
  // Не можна редагувати себе гіршою роллю ніж актор — вже перевіряється middleware
  void actor;
  saveUsers(data);
  return { ok: true, user: publicUser(user) };
}

function deleteUser(id) {
  const data = loadUsers();
  const user = data.users.find((u) => u.id === id);
  if (!user) return { ok: false, error: 'Користувача не знайдено' };
  if (user.role === 'superadmin') {
    return { ok: false, error: 'Супер-адміна видалити не можна' };
  }
  data.users = data.users.filter((u) => u.id !== id);
  saveUsers(data);
  return { ok: true };
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Потрібна авторизація' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Сесія закінчилась, увійдіть знову' });
  }
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Потрібна авторизація' });
    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({ error: 'Недостатньо прав для цієї дії' });
    }
    next();
  };
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Потрібна авторизація' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Недостатньо прав' });
    }
    next();
  };
}

module.exports = {
  ROLES,
  ROLE_RANK,
  ensureDefaultAdmin,
  login,
  changePassword,
  authMiddleware,
  requirePermission,
  requireRole,
  hasPermission,
  getPermissions,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  publicUser,
  loadUsers,
};
