import { generatePaletteResponse } from '../src/core';
import { ensureMethod, readJsonBody, writeError, writeJson } from '../src/server/http';

export default async function handler(req: any, res: any) {
  if (!ensureMethod(req, res, 'POST')) return;

  try {
    var input = await readJsonBody(req);
    var output = generatePaletteResponse(input);
    writeJson(res, 200, output);
  } catch (err) {
    writeError(res, err);
  }
}
