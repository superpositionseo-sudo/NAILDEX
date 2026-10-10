import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

// Page HTML files are rendered by scripts/generate.mjs into the project
// root (index.html, blog/<slug>/index.html, topics/<hub>/index.html, ...).
// generate.mjs also writes generated-pages.json listing every page so this
// config can register them all as Rollup inputs.
const pagesFile = path.resolve(process.cwd(), 'generated-pages.json');
let inputs = { main: path.resolve(process.cwd(), 'index.html') };
if (fs.existsSync(pagesFile)) {
  const pages = JSON.parse(fs.readFileSync(pagesFile, 'utf8'));
  inputs = {};
  for (const p of pages) {
    const key = p.replace(/\.html$/, '').replace(/\//g, '_') || 'main';
    inputs[key] = path.resolve(process.cwd(), p);
  }
}

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: { input: inputs },
  },
});
