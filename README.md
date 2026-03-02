# OKScale

OKScale is a Preact + TypeScript app for generating perceptually uniform color systems from a single brand color.

## Current Product Structure

- `/` Landing: value proposition, Oklch education, and product flow
- `/app` Workspace: generator + sticky export panel for fast production handoff
- `/docs` Docs: searchable integration snippets for CSS, Tailwind, Design Tokens, and Figma Variables

## Core Features

- Parse color input in `hex`, `rgb()`, `hsl()`, and `oklch()`
- Generate 11-step scales (`50-950`) with gamut-safe Oklch mapping
- Build full palette roles: `primary`, `secondary`, `accent`, `neutral`
- Contrast usage matrix with practical text/background pair recommendations
- Export to CSS custom properties, Tailwind config, SCSS, Design Tokens JSON, and Figma Variables JSON
- Token naming presets: `numeric` (`50-950`) and `semantic` (`bg/base/strong/text-*`)
- Shareable workspace links (`/app?color=...&shade=...&harmony=...&anchor=...`)
- Input anchor behavior setting: `preserve-input` or `auto-gamut`
- Local workspace state persistence (restores last used setup)
- Starter presets for sub-90s first export flow
- Recent color history chips for fast switching
- Image upload color theme extraction with one-click apply
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

## Machine-Facing Usage (AI / MCP / Agents)

- JSON schema contracts live in `schemas/*.schema.json`.
- Headless CLI is available via `npm run cli -- <command>`.
- HTTP endpoints are exposed on Vercel via `/api/generate`, `/api/export`, `/api/schema`.
- MCP stdio server is available via `npm run mcp`.
- Contract and API examples are documented in `docs/agent-api.md`.
- Client integration quickstart is in `docs/agent-integration.md`.

Quick examples:

```bash
# Generate palette JSON
cat request.json | npm run cli -- generate

# Export tokens/css/tailwind/figma/scss
cat request.json | npm run cli -- export
```

Run core tests:

```bash
npm run test:core
```

## Notes

- Core color conversion and gamut mapping live in `src/lib/color.ts`.
- Scale generation is in `src/lib/scale.ts`.
- Contrast recommendation helpers are in `src/lib/contrast.ts`.
