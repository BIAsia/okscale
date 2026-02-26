# OKScale

OKScale is a Preact + TypeScript app for generating perceptually uniform 11-step Oklch color scales from a brand color.

## Features (M1)

- Input color in `hex`, `rgb()`, `hsl()`, or `oklch()` format
- Generate an 11-step scale (`50-950`) using fixed hue and tuned lightness/chroma
- View swatches and hex values
- WCAG contrast ratio preview against white and black text
- Manage multiple palettes (rename, add, remove)
- Export CSS custom properties and copy to clipboard

## Tech stack

- Preact
- TypeScript
- Vite
- Vanilla CSS

## Run locally

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

- Color conversion and gamut mapping are implemented in `src/lib/color.ts`.
- M1 export supports CSS custom properties. Tailwind, Design Tokens, Figma variables, and SCSS are planned for later milestones.
