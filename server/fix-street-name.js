const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BAD =
  "вул. Сім'ї Глодан, 31-А (колишня вул. Сім'ї Глодан (колишня вул. Ільфа та Петрова))";
const GOOD = "вул. Сім'ї Глодан, 31-А (колишня вул. Ільфа та Петрова)";
const BAD2 =
  "вул. Сім'ї Глодан (колишня вул. Сім'ї Глодан (колишня вул. Ільфа та Петрова))";
const GOOD2 = "вул. Сім'ї Глодан (колишня вул. Ільфа та Петрова)";

const skip = new Set(['node_modules', '.git', 'wp-includes', 'r', 'screenshots']);
const exts = new Set(['.html', '.js', '.json', '.md', '.txt']);

let files = 0;

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (skip.has(name)) continue;
    const full = path.join(dir, name);
    let st;
    try {
      st = fs.statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walk(full);
      continue;
    }
    if (!exts.has(path.extname(name).toLowerCase())) continue;
    // do not rewrite this fixer itself incorrectly
    if (name === 'fix-street-name.js' || name === 'update-street-name.js') continue;
    let text = fs.readFileSync(full, 'utf8');
    if (!text.includes(BAD) && !text.includes(BAD2)) continue;
    text = text.split(BAD).join(GOOD).split(BAD2).join(GOOD2);
    fs.writeFileSync(full, text, 'utf8');
    files += 1;
    console.log(path.relative(ROOT, full));
  }
}

walk(ROOT);

// restore helper scripts cleanly
fs.writeFileSync(
  path.join(__dirname, 'update-street-name.js'),
  `const fs = require('fs');\nconst path = require('path');\n\n// One-shot helper (already applied). Correct form:\n// ${GOOD}\nconsole.log('Street rename already applied.');\n`
);

console.log(JSON.stringify({ fixedFiles: files, address: GOOD }, null, 2));
