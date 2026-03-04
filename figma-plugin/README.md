# OKScale Figma Plugin (in-repo)

This plugin is a Generator-aligned Figma plugin implementation that **reuses OKScale core generation logic** from the web app.

## Goal

- Keep one source of truth for palette generation.
- Reuse shared contracts and core logic.
- Provide Figma-native variable writing flow.

## Files

- `figma-plugin/manifest.json`
- `figma-plugin/code.ts` (Figma runtime)
- `figma-plugin/ui.html`
- `figma-plugin/ui.ts`

## Build

```bash
npm run build:figma-plugin
```

Build outputs:

- `figma-plugin/dist/code.js`
- `figma-plugin/dist/ui.js`

## Load in Figma

1. Open Figma Desktop → Plugins → Development → Import plugin from manifest.
2. Select `figma-plugin/manifest.json`.
3. Run plugin: "OKScale Generator".

## Reuse boundary

Plugin runtime directly uses:

- `generatePaletteResponse()` from `src/core/service.ts`

That guarantees plugin output stays aligned with web Generator behavior.

## Current variable write behavior

- Creates or reuses collection: `OKScale`
- Variable naming: `role/step` (e.g. `primary/500`)
- Roles: `primary`, `secondary`, `accent`, `neutral`
- Writes all 11 steps per role to collection default mode

## Compatibility note

Plugin bundle target is `es2015` to stay safe in Figma sandbox environments.
