# OKScale Doc Hub

Central documentation for OKScale usage, strategy, export workflows, and integration.

## Quick Start

1. Open `/app` and input your source color (`#hex`, `rgb()`, `hsl()`, or `oklch()`).
2. Choose shade mode and harmony type.
3. Pick one export route:
   - Connect Agent
   - Export Code
   - Import to Figma

## Why OKLCH

OKLCH keeps color ramps perceptually smoother than legacy model workflows.

- **L (Lightness)** tracks perceived brightness more predictably.
- **C (Chroma)** controls colorfulness without breaking the whole scale.
- **H (Hue)** controls direction while preserving value/chroma intent.

For design systems, this means cleaner step transitions, easier contrast tuning, and fewer manual fixes.

## Shade Strategy

Shade strategy should be chosen by intended behavior:

- `none`: minimal hue drift, useful when strict brand hue lock is required.
- `natural`: balanced drift for general product UI.
- `warm` / `cool`: intentional temperature shift across scale.

Anchor behavior:

- `preserve-input`: exact input color is pinned at the anchor step.
- `auto-gamut`: allows remapping to avoid gamut clipping.

Neutral mode:

- `keep-hue`: neutral ramp keeps source hue influence.
- `absolute-gray`: neutral ramp removes hue and trends true gray.

## Generator Guide

Left panel:

- Color input + native picker
- L/C/H sliders
- Shade/harmony/anchor/neutral controls
- Color history and image extraction

Center panel:

- Palette view
- UI preview
- Contrast checks for practical usage

Right panel:

- Route-first export actions

## Export Guide

### Route 1: Connect Agent

Use when you want machine-native execution.

- Copy command directly from Generator
- Copy prompt template for your agent

### Route 2: Export Code

Use when developers need direct artifacts.

- Formats: `css`, `tailwind`, `tokens`, `scss`
- Naming presets: `numeric`, `semantic`
- Output supports copy and download

### Route 3: Import to Figma

Use when design workflow is Figma-first.

- Download Variables JSON
- Import in Figma Variables panel
- Verify role groups and key steps

## Agent Integration

### CLI

```bash
npm run cli -- generate
npm run cli -- export
npm run cli -- schema generate-request
```

### HTTP API

- `POST /api/generate`
- `POST /api/export`
- `GET /api/schema`

Example:

```bash
curl -sS -X POST "https://<your-domain>/api/generate" \
  -H "content-type: application/json" \
  -d '{
    "colorInput": "#3b82f6",
    "shadeMode": "natural",
    "harmonyType": "complementary",
    "anchorBehavior": "preserve-input"
  }'
```

### MCP tools

- `generate_palette`
- `export_tokens`
- `decode_share_url`
- `validate_color`

See `docs/agent-api.md` and `docs/agent-integration.md` for full machine-facing details.

## Figma Integration

1. In Generator, choose **Import to Figma** route.
2. Download variables JSON.
3. In Figma Variables panel, import JSON.
4. Check role groups: `primary`, `secondary`, `accent`, `neutral`.

## FAQ & Troubleshooting

### Why is my source color not exactly on the palette step?

If `auto-gamut` is enabled, anchor remapping may occur for gamut safety.

### Why does contrast look weak for some combinations?

Use Contrast tab recommendations and switch to stronger steps for text/background pairing.

### What is `stream_read_error`?

This usually indicates tooling output stream interruption (not business logic failure). Retry the command.

## About OKScale

OKScale is a practical Oklch system generator for design and engineering teams.

Project repo: <https://github.com/BIAsia/okscale>

## Updates

Recent major updates:

- Agent-ready contracts and tooling (`CLI`, `HTTP API`, `MCP`)
- Route-first export UX in Generator
- Expanded Doc Hub with anchor-based navigation
