# OKScale Figma Plugin (in-repo)

This plugin ports Generator capabilities into a Figma-native workflow while reusing shared OKScale logic.

## Goal

- Keep one source of truth for generation logic.
- Reuse existing OKScale color pipeline (not reimplement it in plugin-only code).
- Preserve Generator interaction model with plugin-suitable layout.

## Architecture

### Shared logic

- `figma-plugin/shared.ts`
  - wraps shared libs and computes:
    - palette
    - harmony
    - gradients
    - contrast usage rows
    - warnings

### Figma runtime

- `figma-plugin/code.ts`
  - receives UI messages
  - generates data through `generatePluginData()`
  - applies variables to local collection

### Plugin UI

- `figma-plugin/ui.tsx`
- `figma-plugin/styles.css`
- `figma-plugin/ui.html`

UI uses **3 main tabs** instead of web 3-column layout:

- Controls
- Preview
- Export

## Build

```bash
npm run build:figma-plugin
```

Build outputs (self-contained):

- `figma-plugin/dist/code.js` — plugin main thread logic
- `figma-plugin/dist/ui.html` — inlined UI (CSS + JS bundled)
- `figma-plugin/dist/manifest.json` — generated manifest

## Load in Figma

1. Run `npm run build:figma-plugin` to generate dist artifacts.
2. Open Figma Desktop → Plugins → Development → Import plugin from manifest.
3. Select `figma-plugin/dist/manifest.json` (not the root manifest).
4. Run plugin: `OKScale Generator`.

**Important:** Always import from `dist/manifest.json` after building. The UI is self-contained (no external script dependencies).

## Variable write behavior

- Collection: create/reuse `OKScale`
- Variable naming: `role/stepName`
  - numeric preset: `primary/500`
  - semantic preset: `primary/base`, etc.
- Roles: `primary`, `secondary`, `accent`, `neutral`
- Writes full 11-step scales to collection default mode

## Compatibility

Plugin bundles target `es2015` for Figma sandbox safety.
