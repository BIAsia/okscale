#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod/v4';
import { MachineInputError, type MachineErrorShape } from '../core';
import { runDecodeShareUrl, runExportTokens, runGeneratePalette, runValidateColor } from './tools';

function errorPayload(err: unknown): MachineErrorShape {
  if (err instanceof MachineInputError) {
    return {
      error: {
        code: err.code,
        message: err.message,
        hint: err.hint
      }
    };
  }

  if (err instanceof Error) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message
      }
    };
  }

  return {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected error while executing tool.'
    }
  };
}

function toolErrorResult(err: unknown) {
  var payload = errorPayload(err);
  return {
    isError: true,
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload, null, 2)
      }
    ],
    structuredContent: payload as Record<string, unknown>
  };
}

function toolOkResult(payload: Record<string, unknown>) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload, null, 2)
      }
    ],
    structuredContent: payload
  };
}

var server = new McpServer({
  name: 'okscale-mcp',
  version: '1.0.0'
});

server.registerTool(
  'generate_palette',
  {
    description: 'Generate full OKScale palette from one color input.',
    inputSchema: {
      colorInput: z.string().describe('Base color input. Supports hex, rgb(), hsl(), oklch().'),
      shadeMode: z.enum(['none', 'warm', 'cool', 'natural']).describe('Shade hue strategy mode.'),
      harmonyType: z
        .enum(['complementary', 'analogous', 'triadic', 'split-complementary', 'tetradic'])
        .describe('Harmony mode used for secondary and accent roles.'),
      anchorBehavior: z
        .enum(['preserve-input', 'auto-gamut'])
        .optional()
        .describe('Whether to preserve exact input color at anchor step.')
    }
  },
  async function (args) {
    try {
      return toolOkResult(runGeneratePalette(args) as Record<string, unknown>);
    } catch (err) {
      return toolErrorResult(err);
    }
  }
);

server.registerTool(
  'export_tokens',
  {
    description: 'Generate and export Design Tokens JSON from one color input.',
    inputSchema: {
      colorInput: z.string().describe('Base color input. Supports hex, rgb(), hsl(), oklch().'),
      shadeMode: z.enum(['none', 'warm', 'cool', 'natural']).describe('Shade hue strategy mode.'),
      harmonyType: z
        .enum(['complementary', 'analogous', 'triadic', 'split-complementary', 'tetradic'])
        .describe('Harmony mode used for secondary and accent roles.'),
      anchorBehavior: z
        .enum(['preserve-input', 'auto-gamut'])
        .optional()
        .describe('Whether to preserve exact input color at anchor step.'),
      namingPreset: z.enum(['numeric', 'semantic']).optional().describe('Token naming preset.')
    }
  },
  async function (args) {
    try {
      return toolOkResult(runExportTokens(args) as Record<string, unknown>);
    } catch (err) {
      return toolErrorResult(err);
    }
  }
);

server.registerTool(
  'decode_share_url',
  {
    description: 'Decode workspace query state from a share URL or query string.',
    inputSchema: {
      url: z
        .string()
        .describe('Share URL, path with query, or raw query string, for example /app?color=... or ?color=...')
    }
  },
  async function (args) {
    try {
      return toolOkResult(runDecodeShareUrl(args.url) as Record<string, unknown>);
    } catch (err) {
      return toolErrorResult(err);
    }
  }
);

server.registerTool(
  'validate_color',
  {
    description: 'Validate and normalize color input without generating a full palette.',
    inputSchema: {
      colorInput: z.string().describe('Color input. Supports hex, rgb(), hsl(), oklch().')
    }
  },
  async function (args) {
    try {
      return toolOkResult(runValidateColor(args.colorInput) as Record<string, unknown>);
    } catch (err) {
      return toolErrorResult(err);
    }
  }
);

async function main() {
  var transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('okscale-mcp ready on stdio');
}

main().catch(function (err) {
  console.error('okscale-mcp fatal error:', err);
  process.exit(1);
});
