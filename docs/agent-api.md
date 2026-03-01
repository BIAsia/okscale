# OKScale Agent API (Machine-Facing)

OKScale now exposes a JSON-in / JSON-out contract for AI agents, MCP tools, and automation scripts.

## Contracts

Schema files:

- `schemas/generate-request.schema.json`
- `schemas/generate-response.schema.json`
- `schemas/export-request.schema.json`
- `schemas/export-response.schema.json`

Current contract version: `1.0`

## CLI

Run via npm:

```bash
npm run cli -- help
```

### Generate palette

```bash
echo '{
  "colorInput": "#3b82f6",
  "shadeMode": "natural",
  "harmonyType": "complementary",
  "anchorBehavior": "preserve-input"
}' | npm run cli -- generate
```

### Export tokens

```bash
echo '{
  "colorInput": "#3b82f6",
  "shadeMode": "natural",
  "harmonyType": "complementary",
  "anchorBehavior": "preserve-input",
  "format": "tokens",
  "namingPreset": "numeric"
}' | npm run cli -- export
```

### Output a JSON schema

```bash
npm run cli -- schema generate-request
```

## Stable Error Shape

When input is invalid, CLI writes this to stderr and exits with code `1`:

```json
{
  "error": {
    "code": "INVALID_COLOR_INPUT",
    "message": "Could not parse color input: not-a-color",
    "hint": "Use #RRGGBB, rgb(), hsl(), or oklch()."
  }
}
```

## Notes for MCP / Agents

- Prefer `anchorBehavior: "preserve-input"` when exact brand color anchoring is required.
- Read `request.normalizedHex` from response for canonical color identity.
- Use `warnings` to detect normalization or gamut mapping side effects.
