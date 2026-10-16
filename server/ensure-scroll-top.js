const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const skip = new Set(['node_modules', '.git', 'wp-includes', 'wp-json', 'admin', 'data', 'docs', 'r', 'screenshots']);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (skip.has(name)) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name === 'index.html') out.push(p);
  }
  return out;
}

const SCRIPT_MARK = 'data-scroll-top="1"';
const SCRIPT_TAG = `<script ${SCRIPT_MARK} src="__SRC__" defer></script>`;

function depthPrefix(file) {
  const rel = path.relative(root, path.dirname(file));
  const depth = rel ? rel.split(path.sep).filter(Boolean).length : 0;
  return depth === 0 ? './' : '../'.repeat(depth);
}

let addedBtn = 0;
let addedScript = 0;
let fixed = 0;

for (const file of walk(root)) {
  let html = fs.readFileSync(file, 'utf8');
  let changed = false;
  const prefix = depthPrefix(file);
  const src = `${prefix}wp-content/themes/waldorf/js/scroll-top.js`;

  if (!html.includes('id="btn-top"')) {
    if (html.includes('<body')) {
      html = html.replace(/<body([^>]*)>/i, `<body$1>\n\t   <a id="btn-top" href="#top" aria-label="Наверх"></a>`);
      addedBtn += 1;
      changed = true;
    } else if (html.includes('<header')) {
      html = html.replace(/<header/i, `<a id="btn-top" href="#top" aria-label="Наверх"></a>\n\t   <header`);
      addedBtn += 1;
      changed = true;
    }
  }

  if (!html.includes(SCRIPT_MARK)) {
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${SCRIPT_TAG.replace('__SRC__', src)}\n</body>`);
      addedScript += 1;
      changed = true;
    }
  } else {
    // refresh path if needed
    const re = new RegExp(`<script ${SCRIPT_MARK} src="[^"]*"><\\/script>`);
    const next = SCRIPT_TAG.replace('__SRC__', src);
    if (re.test(html) && !html.includes(next)) {
      html = html.replace(re, next);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(file, html, 'utf8');
    fixed += 1;
  }
}

console.log({ fixed, addedBtn, addedScript, files: walk(root).length });
