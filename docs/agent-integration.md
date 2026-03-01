# OKScale Agent Integration Quickstart

This guide shows how to integrate OKScale MCP tools with common execution clients.

## 1) Local MCP Server Command

From the project root:

```bash
npm run mcp
```

This starts the stdio MCP server at:

- entry: `src/mcp/okscale-mcp.ts`
- transport: stdio

## 2) Test as Caller via mcporter (verified)

Ad-hoc call without persisting config:

```bash
mcporter call \
  --stdio "node ./node_modules/tsx/dist/cli.mjs src/mcp/okscale-mcp.ts" \
  --cwd /absolute/path/to/okscale \
  validate_color colorInput=#3b82f6 --output json
```

Example tested calls:

```bash
# generate palette
mcporter call --stdio "node ./node_modules/tsx/dist/cli.mjs src/mcp/okscale-mcp.ts" \
  --cwd /absolute/path/to/okscale \
  generate_palette colorInput=#3b82f6 shadeMode=natural harmonyType=complementary anchorBehavior=preserve-input --output json

# export tokens
mcporter call --stdio "node ./node_modules/tsx/dist/cli.mjs src/mcp/okscale-mcp.ts" \
  --cwd /absolute/path/to/okscale \
  export_tokens colorInput=#3b82f6 shadeMode=natural harmonyType=complementary namingPreset=semantic --output json

# decode share url
mcporter call --stdio "node ./node_modules/tsx/dist/cli.mjs src/mcp/okscale-mcp.ts" \
  --cwd /absolute/path/to/okscale \
  decode_share_url url='/app?color=%233b82f6&shade=natural&harmony=complementary&anchor=preserve-input' --output json
```

## 3) Persist mcporter Config (optional)

```bash
mcporter config add okscale \
  --command node \
  --arg ./node_modules/tsx/dist/cli.mjs \
  --arg src/mcp/okscale-mcp.ts \
  --scope project
```

Then call by selector:

```bash
mcporter call okscale.validate_color colorInput=#3b82f6 --output json
```

## 4) Claude Desktop MCP Config Example

Add to Claude Desktop MCP config (path differs by OS):

```json
{
  "mcpServers": {
    "okscale": {
      "command": "node",
      "args": [
        "/absolute/path/to/okscale/node_modules/tsx/dist/cli.mjs",
        "/absolute/path/to/okscale/src/mcp/okscale-mcp.ts"
      ]
    }
  }
}
```

## 5) OpenClaw / mcporter Integration Note

If OpenClaw is configured to use mcporter servers, reuse the same stdio command/args above for an `okscale` server entry.

## 6) Tool Catalog

- `generate_palette`: machine JSON for full palette + harmony
- `export_tokens`: machine JSON including design-tokens output
- `decode_share_url`: parse and validate workspace share query
- `validate_color`: normalize/validate input color and infer anchor step

## 7) Automated Caller Smoke Test

Run this to verify an external MCP client can call all tools:

```bash
npm run test:core
```

`src/mcp/client-smoke.test.ts` starts the MCP server as a child process and calls tools via MCP client SDK.
