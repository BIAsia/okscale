# OKScale Figma Plugin

A Figma plugin version of the OKScale color system generator. Generate perceptually uniform color palettes from a single brand color using the Oklch color space — directly inside Figma.

## Features

- **Color input**: Hex, RGB, HSL, and Oklch formats
- **LCH sliders**: Fine-tune Lightness, Chroma, and Hue
- **4-role palette**: Primary, Secondary, Accent, Neutral (11 steps each)
- **5 harmony types**: Complementary, Analogous, Triadic, Split-Complementary, Tetradic
- **4 shade modes**: None, Warm, Cool, Natural
- **Anchor behavior**: Preserve input color or auto-gamut
- **Neutral mode**: Tinted (keep-hue) or pure gray
- **UI Preview**: Light, Dark, and Brand surface previews
- **WCAG contrast checker**: Accessibility recommendations
- **Export**: CSS, Tailwind, SCSS, Design Tokens, Figma JSON
- **Apply to Figma**: Create Color Styles or Variables directly in your file

## Setup

```bash
cd figma-plugin
npm install
npm run build
```

## Development

```bash
npm run dev   # watch mode with auto-rebuild
```

## Load in Figma

1. Open Figma Desktop
2. Go to **Plugins → Development → Import plugin from manifest...**
3. Select `figma-plugin/manifest.json`
4. Run the plugin from the Plugins menu

## Architecture

```
figma-plugin/
├── manifest.json          # Figma plugin manifest
├── build.mjs              # esbuild build script
├── src/
│   ├── code.ts            # Plugin sandbox code (Figma API)
│   ├── ui.tsx             # Plugin UI (rendered in iframe)
│   ├── ui.css             # UI styles
│   └── messages.ts        # Shared message types
└── dist/                  # Built output (gitignored)
    ├── code.js
    └── ui.html
```

The plugin reuses all color generation logic from the parent `src/lib/` directory (color, scale, harmony, shades, palette, contrast, gradient, export). The UI is a standalone implementation using a minimal virtual DOM renderer, styled to match the web app's design language.
