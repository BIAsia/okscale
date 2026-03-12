# OKScale Doc Hub

This is the main long-form documentation entry for OKScale.

## Quick Start

1. Open Generator (`/app`).
2. Input source color (hex, rgb, hsl, or oklch).
3. Choose shade strategy and harmony type.
4. Validate practical readability in Contrast tab.
5. Deliver via one route:
   - Connect Agent
   - Export Code
   - Import to Figma

## Why OKLCH

Color system quality depends on perceptual consistency, not only numeric interpolation.

In many non-perceptual spaces, equal steps do not look equally spaced. This often causes token ramps to feel uneven and hard to tune. OKLCH separates Lightness (L), Chroma (C), and Hue (H) in a perceptual model, so adjustments stay predictable.

Practical gains:

- Cleaner ramps with fewer manual correction rounds.
- Better confidence when mapping steps to UI states.
- Easier contrast planning across role scales.

## Shade Strategy

### Shade modes

- `none`: minimal hue drift; useful for strict brand hue lock.
- `natural`: balanced drift; default for general product UI.
- `warm`: warmer progression across steps.
- `cool`: cooler progression across steps.

### Anchor behavior

- `preserve-input`: keep exact source color at nearest lightness step.
- `auto-gamut`: allow remap if exact anchor would clip in display gamut.

### Neutral mode

- `keep-hue`: keeps source hue influence in neutral ramp.
- `absolute-gray`: removes hue trend for true grayscale neutrals.

## Generator Guide

### Left panel

- Source color + native picker
- L/C/H sliders
- Anchor and neutral controls
- History and image extraction

### Center panel

- Palette tab for full scales and gradients
- UI Preview for practical component view
- Contrast tab for use-case and raw ratio checks

### Right panel (route-first export)

- Connect Agent for machine workflows
- Export Code for engineering handoff
- Import to Figma for design-side variable import

## Export Guide

### Connect Agent

Use when palette generation/export should be executed by automation.

Typical output path:

1. Copy command or prompt template.
2. Run in MCP/CLI/API workflow.
3. Persist output in your target pipeline.

### Export Code

Use when developers need direct code artifacts.

Formats:

- CSS custom properties
- Tailwind theme extension
- Design Tokens JSON
- SCSS maps

Naming presets:

- numeric
- semantic

### Import to Figma

Use when design tokens are imported directly into Figma variables.

1. Download Variables JSON.
2. Import from Figma Variables panel.
3. Verify role groups and key step mapping.

## Agent Integration

Machine-facing docs:

- `docs/agent-api.md`
- `docs/agent-integration.md`

Interfaces:

- CLI: `npm run cli -- generate|export|schema`
- HTTP: `POST /api/generate`, `POST /api/export`, `GET /api/schema`
- MCP tools: `generate_palette`, `export_tokens`, `decode_share_url`, `validate_color`

## Figma Integration

Expected import outcome:

- Role groups exist: primary/secondary/accent/neutral
- Step scale is consistent and complete
- Variables are ready for component binding

## About the Project

OKScale is built for practical design-engineering collaboration:

- perceptual ramp quality
- route-first export workflows
- machine-friendly integration surfaces

Repository:

- https://github.com/BIAsia/okscale

## Updates

Track active updates and merged milestones in the repository history and PRs.
