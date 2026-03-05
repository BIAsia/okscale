# OKScale Figma Plugin (in-repo)

This plugin ports Generator capabilities into a Figma-native workflow while reusing shared OKScale logic.

Built with [create-figma-plugin](https://github.com/yuanqing/create-figma-plugin) for stable UI initialization and development experience.

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

- `figma-plugin/main.ts`
  - receives UI events via `on()`
  - generates data through `generatePluginData()`
  - applies variables to local collection
  - emits results back to UI via `emit()`

### Plugin UI

- `figma-plugin/ui.tsx`
- `figma-plugin/styles.css`

UI uses **3 main tabs** instead of web 3-column layout:

- Controls
- Preview
- Export

## Build

```bash
npm run build:figma-plugin
```

Build outputs:

- `build/main.js` — plugin main thread
- `build/ui.js` — plugin UI bundle
- `manifest.json` — auto-generated manifest (root directory)

## Development

Watch mode for live rebuild:

```bash
npm run watch:figma-plugin
```

## Load in Figma

1. Run `npm run build:figma-plugin` to generate build artifacts.
2. Open Figma Desktop → Plugins → Development → Import plugin from manifest.
3. Select `manifest.json` (root directory).
4. Run plugin: `OKScale Generator`.

## Variable write behavior

- Collection: create/reuse `OKScale`
- Variable naming: `role/stepName`
  - numeric preset: `primary/500`
  - semantic preset: `primary/base`, etc.
- Roles: `primary`, `secondary`, `accent`, `neutral`
- Writes full 11-step scales to collection default mode

## Compatibility

Plugin uses `create-figma-plugin` build system with automatic compatibility handling.
