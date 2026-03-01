import { decodeWorkspaceState, type WorkspaceShareState } from '../lib/share';
import { parseColorInput, rgbToHex, rgbToOklch } from '../lib/color';
import { nearestScaleStepForLightness } from '../lib/scale';
import { exportPaletteResponse, generatePaletteResponse, MachineInputError } from '../core';
import type { ExportResponse, GenerateResponse } from '../core';
import type { NamingPreset } from '../lib/export';
import type { AnchorBehavior } from '../lib/scale';
import type { HarmonyType } from '../lib/harmony';
import type { ShadeMode } from '../lib/shades';

export type GeneratePaletteInput = {
  colorInput: string;
  shadeMode: ShadeMode;
  harmonyType: HarmonyType;
  anchorBehavior?: AnchorBehavior;
};

export type ExportTokensInput = GeneratePaletteInput & {
  namingPreset?: NamingPreset;
};

export type DecodeShareUrlResult = {
  valid: boolean;
  url: string;
  pathname: string;
  search: string;
  state?: WorkspaceShareState;
  reason?: string;
};

export type ValidateColorResult = {
  valid: boolean;
  input: string;
  normalizedHex?: string;
  oklch?: {
    l: number;
    c: number;
    h: number;
  };
  anchorStep?: number;
  reason?: string;
};

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new MachineInputError('INVALID_REQUEST', 'Field "' + field + '" must be a non-empty string.');
  }
  return value;
}

function parseSearch(urlOrSearch: string): { pathname: string; search: string } {
  var trimmed = urlOrSearch.trim();
  if (!trimmed) {
    throw new MachineInputError('INVALID_REQUEST', 'Field "url" must be a non-empty string.');
  }

  if (trimmed.charAt(0) === '?') {
    return {
      pathname: '/app',
      search: trimmed
    };
  }

  if (trimmed.indexOf('=') >= 0 && trimmed.indexOf('?') === -1 && trimmed.indexOf('/') === -1) {
    return {
      pathname: '/app',
      search: '?' + trimmed
    };
  }

  try {
    var parsed = new URL(trimmed, 'https://okscale.dev');
    return {
      pathname: parsed.pathname || '/app',
      search: parsed.search || ''
    };
  } catch (_err) {
    throw new MachineInputError(
      'INVALID_REQUEST',
      'Field "url" is not a valid URL or query string.',
      'Use full URL, path with query, or raw query like color=%233b82f6&shade=natural&harmony=complementary.'
    );
  }
}

export function runGeneratePalette(input: GeneratePaletteInput): GenerateResponse {
  return generatePaletteResponse(input);
}

export function runExportTokens(input: ExportTokensInput): ExportResponse {
  var request = {
    colorInput: input.colorInput,
    shadeMode: input.shadeMode,
    harmonyType: input.harmonyType,
    anchorBehavior: input.anchorBehavior,
    format: 'tokens',
    namingPreset: input.namingPreset || 'numeric'
  };
  return exportPaletteResponse(request);
}

export function runDecodeShareUrl(url: string): DecodeShareUrlResult {
  var normalizedUrl = requireString(url, 'url');
  var parsed = parseSearch(normalizedUrl);
  var state = decodeWorkspaceState(parsed.search);

  if (!state) {
    return {
      valid: false,
      url: normalizedUrl,
      pathname: parsed.pathname,
      search: parsed.search,
      reason: 'Could not decode workspace state from query parameters.'
    };
  }

  return {
    valid: true,
    url: normalizedUrl,
    pathname: parsed.pathname,
    search: parsed.search,
    state: state
  };
}

export function runValidateColor(colorInput: string): ValidateColorResult {
  var raw = requireString(colorInput, 'colorInput');
  var rgb = parseColorInput(raw);

  if (!rgb) {
    return {
      valid: false,
      input: raw,
      reason: 'Color format not recognized. Use #RRGGBB, rgb(), hsl(), or oklch().'
    };
  }

  var oklch = rgbToOklch(rgb);
  return {
    valid: true,
    input: raw,
    normalizedHex: rgbToHex(rgb),
    oklch: {
      l: oklch.l,
      c: oklch.c,
      h: oklch.h
    },
    anchorStep: nearestScaleStepForLightness(oklch.l)
  };
}
