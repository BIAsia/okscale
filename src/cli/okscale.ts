#!/usr/bin/env node
import process from 'node:process';
import {
  exportPaletteResponse,
  generatePaletteResponse,
  MachineInputError,
  type MachineErrorShape
} from '../core';
import {
  EXPORT_REQUEST_SCHEMA,
  EXPORT_RESPONSE_SCHEMA,
  GENERATE_REQUEST_SCHEMA,
  GENERATE_RESPONSE_SCHEMA
} from '../core/schemas';

type ParsedArgs = {
  command: string;
  input: string;
  schemaName: string;
  compact: boolean;
};

function printHelp() {
  var lines = [
    'OKScale machine CLI',
    '',
    'Usage:',
    '  okscale generate [--input <json>] [--compact]',
    '  okscale export   [--input <json>] [--compact]',
    '  okscale schema <generate-request|generate-response|export-request|export-response> [--compact]',
    '',
    'Input mode:',
    '  - If --input is missing, CLI reads JSON from stdin.',
    '',
    'Examples:',
    "  echo '{\"colorInput\":\"#3b82f6\",\"shadeMode\":\"natural\",\"harmonyType\":\"complementary\"}' | okscale generate",
    "  echo '{\"colorInput\":\"#3b82f6\",\"shadeMode\":\"natural\",\"harmonyType\":\"complementary\",\"format\":\"tokens\"}' | okscale export"
  ];

  process.stdout.write(lines.join('\n') + '\n');
}

function parseArgs(argv: string[]): ParsedArgs {
  var command = argv.length > 0 ? argv[0] : 'help';
  var input = '';
  var schemaName = '';
  var compact = false;

  for (var i = 1; i < argv.length; i++) {
    var arg = argv[i];
    if (arg === '--input') {
      input = argv[i + 1] || '';
      i += 1;
      continue;
    }
    if (arg === '--compact') {
      compact = true;
      continue;
    }
    if (command === 'schema' && !schemaName) {
      schemaName = arg;
      continue;
    }
  }

  return {
    command: command,
    input: input,
    schemaName: schemaName,
    compact: compact
  };
}

function readStdin(): Promise<string> {
  return new Promise(function (resolve, reject) {
    var chunks = [] as Buffer[];
    process.stdin.on('data', function (chunk) {
      chunks.push(Buffer.from(chunk));
    });
    process.stdin.on('end', function () {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    process.stdin.on('error', function (err) {
      reject(err);
    });
  });
}

function safeParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (_err) {
    throw new MachineInputError(
      'INVALID_REQUEST',
      'Input payload is not valid JSON.',
      'Pass JSON via --input or stdin.'
    );
  }
}

function printJson(payload: unknown, compact: boolean) {
  process.stdout.write(JSON.stringify(payload, null, compact ? 0 : 2) + '\n');
}

function schemaByName(name: string): unknown {
  if (name === 'generate-request') return GENERATE_REQUEST_SCHEMA;
  if (name === 'generate-response') return GENERATE_RESPONSE_SCHEMA;
  if (name === 'export-request') return EXPORT_REQUEST_SCHEMA;
  if (name === 'export-response') return EXPORT_RESPONSE_SCHEMA;
  throw new MachineInputError(
    'INVALID_REQUEST',
    'Unknown schema name: ' + String(name),
    'Allowed: generate-request, generate-response, export-request, export-response.'
  );
}

async function payloadFromArgs(inputArg: string): Promise<unknown> {
  if (inputArg && inputArg.trim()) {
    return safeParseJson(inputArg);
  }

  if (process.stdin.isTTY) {
    throw new MachineInputError(
      'INVALID_REQUEST',
      'Missing JSON input.',
      'Provide --input <json> or pipe JSON via stdin.'
    );
  }

  var raw = await readStdin();
  if (!raw.trim()) {
    throw new MachineInputError('INVALID_REQUEST', 'Empty stdin input.', 'Pipe a JSON request body to stdin.');
  }
  return safeParseJson(raw);
}

async function main() {
  var args = parseArgs(process.argv.slice(2));

  if (args.command === 'help' || args.command === '--help' || args.command === '-h') {
    printHelp();
    return;
  }

  if (args.command === 'schema') {
    if (!args.schemaName) {
      throw new MachineInputError(
        'INVALID_REQUEST',
        'Missing schema name for schema command.',
        'Use: okscale schema generate-request'
      );
    }
    printJson(schemaByName(args.schemaName), args.compact);
    return;
  }

  if (args.command === 'generate') {
    var generateInput = await payloadFromArgs(args.input);
    printJson(generatePaletteResponse(generateInput), args.compact);
    return;
  }

  if (args.command === 'export') {
    var exportInput = await payloadFromArgs(args.input);
    printJson(exportPaletteResponse(exportInput), args.compact);
    return;
  }

  throw new MachineInputError(
    'INVALID_REQUEST',
    'Unknown command: ' + String(args.command),
    'Use generate, export, schema, or help.'
  );
}

main().catch(function (err: unknown) {
  var fallback = {
    error: {
      code: 'INVALID_REQUEST',
      message: 'Unexpected failure while running CLI.'
    }
  } satisfies MachineErrorShape;

  if (err instanceof MachineInputError) {
    process.stderr.write(
      JSON.stringify(
        {
          error: {
            code: err.code,
            message: err.message,
            hint: err.hint
          }
        } satisfies MachineErrorShape,
        null,
        2
      ) + '\n'
    );
    process.exit(1);
    return;
  }

  if (err instanceof Error) {
    process.stderr.write(
      JSON.stringify(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: err.message
          }
        } satisfies MachineErrorShape,
        null,
        2
      ) + '\n'
    );
    process.exit(1);
    return;
  }

  process.stderr.write(JSON.stringify(fallback, null, 2) + '\n');
  process.exit(1);
});
