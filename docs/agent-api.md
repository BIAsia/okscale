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

## HTTP API (Vercel Functions)

Endpoints:

- `POST /api/generate`
- `POST /api/export`
- `GET /api/schema`
- `GET /api/schema?name=generate-request`

## MCP Server (stdio)

Run MCP server:

```bash
npm run mcp
```

Provided tools:

- `generate_palette`
- `export_tokens`
- `decode_share_url`
- `validate_color`

Tool behavior:

- Tool success returns both `content` (JSON string) and `structuredContent` (JSON object).
- Tool failures return `isError: true` with the same machine error envelope used by CLI/API.

### Generate over HTTP

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

### Export over HTTP

```bash
curl -sS -X POST "https://<your-domain>/api/export" \
  -H "content-type: application/json" \
  -d '{
    "colorInput": "#3b82f6",
    "shadeMode": "natural",
    "harmonyType": "complementary",
    "format": "tokens",
    "namingPreset": "numeric"
  }'
```

## Stable Error Shape

HTTP status mapping:

- `400`: request/body JSON malformed (`INVALID_REQUEST`)
- `405`: wrong HTTP method (`METHOD_NOT_ALLOWED`)
- `422`: valid JSON but unsupported or invalid domain input
- `500`: internal failures (`INTERNAL_ERROR`)

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
- For OpenClaw/mcporter/Claude Desktop setup, see `docs/agent-integration.md`.
