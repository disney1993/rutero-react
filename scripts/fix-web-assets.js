// Cloudflare Pages no publica carpetas llamadas node_modules: tras `expo export -p web`
// se mueve dist/assets/node_modules a dist/assets/vendor y se reescriben las rutas.
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const from = path.join(dist, 'assets', 'node_modules');
if (fs.existsSync(from)) fs.renameSync(from, path.join(dist, 'assets', 'vendor'));

let files = 0;
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
  const p = path.join(dir, e.name);
  if (e.isDirectory()) return walk(p);
  if (!/\.(js|css|html)$/.test(e.name)) return;
  const s = fs.readFileSync(p, 'utf8');
  const out = s.split('/assets/node_modules/').join('/assets/vendor/');
  if (out !== s) { fs.writeFileSync(p, out); files++; }
});
walk(dist);

if (fs.existsSync(from)) throw new Error('dist/assets/node_modules sigue existiendo');
console.log(`fix-web-assets: rutas reescritas en ${files} archivo(s)`);
