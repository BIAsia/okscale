# OKScale

OKScale is a Preact + TypeScript app for generating perceptually uniform color systems from a single brand color.

## Current Product Structure

- `/` Landing: value proposition, Oklch education, and product flow
- `/app` Workspace: generator + sticky export panel for fast production handoff

## Core Features

- Parse color input in `hex`, `rgb()`, `hsl()`, and `oklch()`
- Generate 11-step scales (`50-950`) with gamut-safe Oklch mapping
- Build full palette roles: `primary`, `secondary`, `accent`, `neutral`
- Contrast usage matrix with practical text/background pair recommendations
- Export to CSS custom properties, Tailwind config, SCSS, Design Tokens JSON, and Figma Variables JSON
- Live token binding: workspace interactions recolor site accents in real time

## Quick Start

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Notes

- Core color conversion and gamut mapping live in `src/lib/color.ts`.
- Scale generation is in `src/lib/scale.ts`.
- Contrast recommendation helpers are in `src/lib/contrast.ts`.
