import { build } from 'esbuild';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';

var DIST_DIR = 'figma-plugin/dist';
var TEMPLATE_FILE = 'figma-plugin/ui.template.html';

function inlineSafeScript(js) {
  return js.replace(/<\/script/gi, '<\\/script');
}

async function buildPlugin() {
  await mkdir(DIST_DIR, { recursive: true });

  await build({
    entryPoints: ['figma-plugin/code.ts'],
    bundle: true,
    format: 'iife',
    target: 'es2015',
    outfile: DIST_DIR + '/code.js',
  });

  var uiBuild = await build({
    entryPoints: ['figma-plugin/ui.tsx'],
    bundle: true,
    format: 'iife',
    target: 'es2015',
    jsx: 'automatic',
    jsxImportSource: 'preact',
    write: false,
  });

  var template = await readFile(TEMPLATE_FILE, 'utf8');
  var css = await readFile('figma-plugin/styles.css', 'utf8');
  var js = uiBuild.outputFiles[0].text;

  var html = template
    .replace('__INLINE_STYLES__', css)
    .replace('__INLINE_SCRIPT__', inlineSafeScript(js));

  await writeFile(DIST_DIR + '/ui.html', html, 'utf8');

  await writeFile(
    DIST_DIR + '/manifest.json',
    JSON.stringify(
      {
        name: 'OKScale Generator',
        id: 'okscale-generator-plugin',
        api: '1.0.0',
        editorType: ['figma'],
        main: 'code.js',
        ui: 'ui.html',
        relaunchButtons: [{ command: 'open', name: 'Open OKScale Generator' }],
      },
      null,
      2,
    ),
    'utf8',
  );

  try {
    await unlink(DIST_DIR + '/ui.js');
  } catch (_err) {
    // ignore when old output does not exist
  }
}

buildPlugin().catch(function (err) {
  console.error(err);
  process.exit(1);
});
