import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResultSchema, ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';

type ToolCallResult = {
  structuredContent?: Record<string, unknown>;
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
};

async function withMcpClient<T>(run: (client: Client) => Promise<T>): Promise<T> {
  var require = createRequire(import.meta.url);
  var tsxPkg = require.resolve('tsx/package.json');
  var tsxCli = path.join(path.dirname(tsxPkg), 'dist', 'cli.mjs');

  var transport = new StdioClientTransport({
    command: process.execPath,
    args: [tsxCli, 'src/mcp/okscale-mcp.ts'],
    cwd: process.cwd(),
    stderr: 'pipe'
  });

  if (transport.stderr) {
    transport.stderr.on('data', function () {
      // keep stderr drained to avoid pipe backpressure
    });
  }

  var client = new Client({
    name: 'okscale-mcp-smoke-client',
    version: '1.0.0'
  });

  await client.connect(transport);
  try {
    return await run(client);
  } finally {
    await transport.close();
  }
}

function asObject(value: unknown): Record<string, unknown> {
  assert.ok(value && typeof value === 'object');
  return value as Record<string, unknown>;
}

test('mcp tools are callable by external execution client', async function () {
  await withMcpClient(async function (client) {
    var listed = await client.request(
      {
        method: 'tools/list',
        params: {}
      },
      ListToolsResultSchema
    );

    var names = listed.tools.map(function (tool) {
      return tool.name;
    });

    assert.ok(names.indexOf('generate_palette') >= 0);
    assert.ok(names.indexOf('export_tokens') >= 0);
    assert.ok(names.indexOf('decode_share_url') >= 0);
    assert.ok(names.indexOf('validate_color') >= 0);

    var validate = (await client.request(
      {
        method: 'tools/call',
        params: {
          name: 'validate_color',
          arguments: {
            colorInput: '#3b82f6'
          }
        }
      },
      CallToolResultSchema
    )) as ToolCallResult;

    var validatePayload = asObject(validate.structuredContent);
    assert.equal(validatePayload.valid, true);
    assert.equal(validatePayload.normalizedHex, '#3b82f6');

    var generate = (await client.request(
      {
        method: 'tools/call',
        params: {
          name: 'generate_palette',
          arguments: {
            colorInput: '#3b82f6',
            shadeMode: 'natural',
            harmonyType: 'complementary'
          }
        }
      },
      CallToolResultSchema
    )) as ToolCallResult;

    var generatePayload = asObject(generate.structuredContent);
    assert.equal(generatePayload.schemaVersion, '1.0');
    var palette = asObject(generatePayload.palette);
    var primary = asObject(palette.primary);
    var scale = primary.scale as unknown[];
    assert.equal(scale.length, 11);

    var decode = (await client.request(
      {
        method: 'tools/call',
        params: {
          name: 'decode_share_url',
          arguments: {
            url: '/app?color=%233b82f6&shade=natural&harmony=complementary&anchor=preserve-input'
          }
        }
      },
      CallToolResultSchema
    )) as ToolCallResult;

    var decodePayload = asObject(decode.structuredContent);
    assert.equal(decodePayload.valid, true);

    var exportTokens = (await client.request(
      {
        method: 'tools/call',
        params: {
          name: 'export_tokens',
          arguments: {
            colorInput: '#3b82f6',
            shadeMode: 'natural',
            harmonyType: 'complementary',
            namingPreset: 'numeric'
          }
        }
      },
      CallToolResultSchema
    )) as ToolCallResult;

    var exportPayload = asObject(exportTokens.structuredContent);
    assert.equal(exportPayload.format, 'tokens');
    assert.equal(exportPayload.filename, 'okscale-tokens-numeric.json');

    var invalidGenerate = (await client.request(
      {
        method: 'tools/call',
        params: {
          name: 'generate_palette',
          arguments: {
            colorInput: 'not-a-color',
            shadeMode: 'natural',
            harmonyType: 'complementary'
          }
        }
      },
      CallToolResultSchema
    )) as ToolCallResult;

    assert.equal(invalidGenerate.isError, true);
    var invalidPayload = asObject(invalidGenerate.structuredContent);
    var err = asObject(invalidPayload.error);
    assert.equal(err.code, 'INVALID_COLOR_INPUT');
  });
});
