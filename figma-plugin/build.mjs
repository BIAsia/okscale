import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');

mkdirSync(resolve(__dirname, 'dist'), { recursive: true });

// ── Build plugin code (runs in Figma sandbox, no DOM) ──
const codeBuild = {
  entryPoints: [resolve(__dirname, 'src/code.ts')],
  bundle: true,
  outfile: resolve(__dirname, 'dist/code.js'),
  format: 'iife',
  target: 'es2020',
  platform: 'browser',
  sourcemap: false,
};

// ── Build UI (inline everything into a single HTML) ──
const uiBuild = {
  entryPoints: [resolve(__dirname, 'src/ui.tsx')],
  bundle: true,
  outfile: resolve(__dirname, 'dist/ui.js'),
  format: 'iife',
  target: 'es2020',
  platform: 'browser',
  jsx: 'transform',
  jsxFactory: 'h',
  jsxFragment: 'Fragment',
  sourcemap: false,
  define: {
    'process.env.NODE_ENV': '"production"',
  },
};

function buildHtml() {
  const js = readFileSync(resolve(__dirname, 'dist/ui.js'), 'utf8');
  const dssCss = readFileSync(resolve(__dirname, 'node_modules/figma-plugin-ds/dist/figma-plugin-ds.css'), 'utf8');
  const css = readFileSync(resolve(__dirname, 'src/ui.css'), 'utf8');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>${dssCss}${css}</style>
</head>
<body>
<div id="app"></div>
<script>${js}</script>
</body>
</html>`;

  writeFileSync(resolve(__dirname, 'dist/ui.html'), html);
  console.log('[build] dist/ui.html written');
}

async function build() {
  await esbuild.build(codeBuild);
  console.log('[build] dist/code.js written');

  await esbuild.build(uiBuild);
  console.log('[build] dist/ui.js written');

  buildHtml();
}

if (isWatch) {
  const codeCtx = await esbuild.context(codeBuild);
  const uiCtx = await esbuild.context({
    ...uiBuild,
    plugins: [{
      name: 'rebuild-html',
      setup(build) {
        build.onEnd(() => {
          try { buildHtml(); } catch (e) { console.error(e); }
        });
      },
    }],
  });
  await codeCtx.watch();
  await uiCtx.watch();
  console.log('[watch] watching for changes...');
} else {
  await build();
}
