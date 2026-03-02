import {
  EXPORT_REQUEST_SCHEMA,
  EXPORT_RESPONSE_SCHEMA,
  GENERATE_REQUEST_SCHEMA,
  GENERATE_RESPONSE_SCHEMA
} from '../src/core/schemas';
import { MachineInputError } from '../src/core';
import { ensureMethod, getQueryParam, writeError, writeJson } from '../src/server/http';

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

export default function handler(req: any, res: any) {
  if (!ensureMethod(req, res, 'GET')) return;

  try {
    var name = getQueryParam(req, 'name');

    if (!name) {
      writeJson(res, 200, {
        schemaVersion: '1.0',
        available: ['generate-request', 'generate-response', 'export-request', 'export-response'],
        endpoints: {
          self: '/api/schema',
          generateRequest: '/api/schema?name=generate-request',
          generateResponse: '/api/schema?name=generate-response',
          exportRequest: '/api/schema?name=export-request',
          exportResponse: '/api/schema?name=export-response'
        }
      });
      return;
    }

    writeJson(res, 200, schemaByName(name));
  } catch (err) {
    writeError(res, err);
  }
}
