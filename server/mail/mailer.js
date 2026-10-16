const { readJson, writeJson } = require('../store');

const LOG_FILE = 'mail-log.json';

function loadLog() {
  return readJson(LOG_FILE, { items: [] });
}

function appendLog(entry) {
  const data = loadLog();
  data.items.unshift(entry);
  data.items = data.items.slice(0, 500);
  writeJson(LOG_FILE, data);
}

/**
 * Відправка листа. Без MAIL_PROVIDER / ключів — лише stub у mail-log.json.
 * @param {{ to: string, subject: string, html?: string, text?: string, kind?: string }} opts
 */
async function sendMail(opts) {
  const to = String(opts.to || '').trim();
  const subject = String(opts.subject || '').trim();
  if (!to || !subject) {
    return { ok: false, error: 'Потрібні to і subject' };
  }

  const provider = (process.env.MAIL_PROVIDER || 'stub').toLowerCase();
  const from = process.env.MAIL_FROM || 'Ступені <noreply@localhost>';
  const entry = {
    id: `mail-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    provider,
    kind: opts.kind || 'generic',
    from,
    to,
    subject,
    text: opts.text || '',
    html: opts.html || '',
    status: 'queued',
    error: null,
  };

  if (provider === 'resend' && process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html: opts.html || undefined,
          text: opts.text || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        entry.status = 'error';
        entry.error = body.slice(0, 500);
        appendLog(entry);
        return { ok: false, error: entry.error, entry };
      }
      entry.status = 'sent';
      appendLog(entry);
      return { ok: true, entry };
    } catch (err) {
      entry.status = 'error';
      entry.error = String(err.message || err);
      appendLog(entry);
      return { ok: false, error: entry.error, entry };
    }
  }

  // stub — для локальної розробки
  entry.status = 'stub';
  appendLog(entry);
  return { ok: true, stub: true, entry };
}

async function sendBulk(recipients, buildMessage) {
  const results = [];
  for (const recipient of recipients) {
    const msg = typeof buildMessage === 'function' ? buildMessage(recipient) : buildMessage;
    // eslint-disable-next-line no-await-in-loop
    results.push(await sendMail({ ...msg, to: recipient.email || recipient }));
  }
  return results;
}

module.exports = { sendMail, sendBulk, loadLog };
