import type { MachineErrorShape } from '../core/contracts';
import { MachineInputError } from '../core/service';

type HttpRequest = {
  method?: string;
  body?: unknown;
  query?: Record<string, unknown>;
  url?: string;
  on?: (event: string, listener: (chunk?: unknown) => void) => void;
};

type HttpResponse = {
  statusCode: number;
  setHeader: (name: string, value: string) => void;
  end: (body?: string) => void;
};

function parseJsonText(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (_err) {
    throw new MachineInputError(
      'INVALID_REQUEST',
      'Request body must be valid JSON.',
      'Send JSON payload with Content-Type: application/json.'
    );
  }
}

export async function readJsonBody(req: HttpRequest): Promise<unknown> {
  if (typeof req.body === 'string') {
    if (!req.body.trim()) {
      throw new MachineInputError('INVALID_REQUEST', 'Request body is empty.');
    }
    return parseJsonText(req.body);
  }

  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  if (!req.on) {
    throw new MachineInputError('INVALID_REQUEST', 'Request body is missing.');
  }

  var chunks = [] as Buffer[];
  await new Promise<void>(function (resolve, reject) {
    req.on && req.on('data', function (chunk) {
      chunks.push(Buffer.from(chunk as Buffer));
    });
    req.on && req.on('end', function () {
      resolve();
    });
    req.on && req.on('error', function (err) {
      reject(err);
    });
  });

  var raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) {
    throw new MachineInputError('INVALID_REQUEST', 'Request body is empty.');
  }
  return parseJsonText(raw);
}

function machineErrorShape(
  code: MachineErrorShape['error']['code'],
  message: string,
  hint?: string
): MachineErrorShape {
  return {
    error: {
      code: code,
      message: message,
      hint: hint
    }
  };
}

export function statusForError(err: unknown): number {
  if (!(err instanceof MachineInputError)) return 500;

  if (err.code === 'METHOD_NOT_ALLOWED') return 405;
  if (err.code === 'INVALID_REQUEST') return 400;
  if (
    err.code === 'INVALID_COLOR_INPUT' ||
    err.code === 'UNSUPPORTED_SHADE_MODE' ||
    err.code === 'UNSUPPORTED_HARMONY_TYPE' ||
    err.code === 'UNSUPPORTED_ANCHOR_BEHAVIOR' ||
    err.code === 'UNSUPPORTED_EXPORT_FORMAT' ||
    err.code === 'UNSUPPORTED_NAMING_PRESET'
  ) {
    return 422;
  }

  return 500;
}

export function writeJson(res: HttpResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload, null, 2));
}

export function writeError(res: HttpResponse, err: unknown) {
  if (err instanceof MachineInputError) {
    writeJson(res, statusForError(err), machineErrorShape(err.code, err.message, err.hint));
    return;
  }

  if (err instanceof Error) {
    writeJson(res, 500, machineErrorShape('INTERNAL_ERROR', err.message));
    return;
  }

  writeJson(res, 500, machineErrorShape('INTERNAL_ERROR', 'Unexpected error while processing request.'));
}

export function ensureMethod(req: HttpRequest, res: HttpResponse, method: 'GET' | 'POST'): boolean {
  var actual = (req.method || '').toUpperCase();
  if (actual === method) return true;

  res.setHeader('allow', method);
  writeError(
    res,
    new MachineInputError(
      'METHOD_NOT_ALLOWED',
      'Method not allowed. Expected ' + method + ', got ' + (actual || 'UNKNOWN') + '.',
      'Use HTTP ' + method + ' for this endpoint.'
    )
  );
  return false;
}

export function getQueryParam(req: HttpRequest, name: string): string {
  if (req.query && typeof req.query[name] === 'string') {
    return String(req.query[name]);
  }

  if (req.url && req.url.indexOf('?') >= 0) {
    var search = req.url.slice(req.url.indexOf('?') + 1);
    var params = new URLSearchParams(search);
    return params.get(name) || '';
  }

  return '';
}
