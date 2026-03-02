import {
  EXPORT_FORMATS,
  NAMING_PRESETS,
  formatFullExport,
  type ExportFormat,
  type NamingPreset
} from '../lib/export';
import { generateHarmony, HARMONY_TYPES } from '../lib/harmony';
import { generateFullPalette, type PaletteRole } from '../lib/palette';
import { parseColorInput, rgbToHex, rgbToOklch } from '../lib/color';
import { nearestScaleStepForLightness, type AnchorBehavior } from '../lib/scale';
import { SHADE_MODES, type ShadeMode } from '../lib/shades';
import type {
  ExportRequest,
  ExportResponse,
  GenerateRequest,
  GenerateResponse,
  HarmonyColor,
  MachineErrorCode,
  RolePalette
} from './contracts';

var ALGORITHM_VERSION = 'okscale-core-1';
var SCHEMA_VERSION = '1.0' as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasMode<T extends string>(value: string, list: Array<{ id: T }>): value is T {
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === value) return true;
  }
  return false;
}

function hasValue<T extends string>(value: string, list: readonly T[]): value is T {
  for (var i = 0; i < list.length; i++) {
    if (list[i] === value) return true;
  }
  return false;
}

function getStringValue(source: Record<string, unknown>, key: string): string | null {
  var value = source[key];
  if (typeof value !== 'string') return null;
  return value;
}

function rolePalette(
  role: PaletteRole,
  entry: {
    label: string;
    baseHex: string;
    base: { l: number; c: number; h: number };
    scale: Array<{ step: number; hex: string; lch: { l: number; c: number; h: number } }>;
  }
): RolePalette {
  return {
    role: role,
    label: entry.label,
    baseHex: entry.baseHex,
    baseLch: {
      l: entry.base.l,
      c: entry.base.c,
      h: entry.base.h
    },
    scale: entry.scale.map(function (item) {
      return {
        step: item.step,
        hex: item.hex,
        lch: {
          l: item.lch.l,
          c: item.lch.c,
          h: item.lch.h
        }
      };
    })
  };
}

function filenameFor(format: ExportFormat, namingPreset: NamingPreset): string {
  var suffix = namingPreset === 'semantic' ? '-semantic' : '-numeric';
  if (format === 'tailwind') return 'okscale-tailwind.config' + suffix + '.ts';
  if (format === 'tokens') return 'okscale-tokens' + suffix + '.json';
  if (format === 'figma') return 'okscale-figma-variables' + suffix + '.json';
  if (format === 'scss') return 'okscale-palette' + suffix + '.scss';
  return 'okscale-palette' + suffix + '.css';
}

function mediaTypeFor(format: ExportFormat): string {
  if (format === 'css') return 'text/css; charset=utf-8';
  if (format === 'scss') return 'text/x-scss; charset=utf-8';
  if (format === 'tokens' || format === 'figma') return 'application/json; charset=utf-8';
  return 'text/plain; charset=utf-8';
}

export class MachineInputError extends Error {
  code: MachineErrorCode;
  hint?: string;

  constructor(code: MachineErrorCode, message: string, hint?: string) {
    super(message);
    this.name = 'MachineInputError';
    this.code = code;
    this.hint = hint;
  }
}

export function parseGenerateRequest(input: unknown): GenerateRequest {
  if (!isObject(input)) {
    throw new MachineInputError(
      'INVALID_REQUEST',
      'Request body must be a JSON object.',
      'Provide fields: colorInput, shadeMode, harmonyType, optional anchorBehavior.'
    );
  }

  var colorInput = getStringValue(input, 'colorInput');
  if (!colorInput || !colorInput.trim()) {
    throw new MachineInputError(
      'INVALID_COLOR_INPUT',
      'Field "colorInput" is required and must be a non-empty string.',
      'Example: "#3b82f6" or "oklch(0.62 0.19 259)".'
    );
  }

  var shadeModeRaw = getStringValue(input, 'shadeMode');
  if (!shadeModeRaw || !hasMode(shadeModeRaw, SHADE_MODES)) {
    throw new MachineInputError(
      'UNSUPPORTED_SHADE_MODE',
      'Unsupported shade mode: ' + String(shadeModeRaw),
      'Allowed: none, warm, cool, natural.'
    );
  }

  var harmonyTypeRaw = getStringValue(input, 'harmonyType');
  if (!harmonyTypeRaw || !hasMode(harmonyTypeRaw, HARMONY_TYPES)) {
    throw new MachineInputError(
      'UNSUPPORTED_HARMONY_TYPE',
      'Unsupported harmony type: ' + String(harmonyTypeRaw),
      'Allowed: complementary, analogous, triadic, split-complementary, tetradic.'
    );
  }

  var anchorBehaviorRaw = getStringValue(input, 'anchorBehavior') || 'preserve-input';
  if (anchorBehaviorRaw !== 'auto-gamut' && anchorBehaviorRaw !== 'preserve-input') {
    throw new MachineInputError(
      'UNSUPPORTED_ANCHOR_BEHAVIOR',
      'Unsupported anchor behavior: ' + String(anchorBehaviorRaw),
      'Allowed: preserve-input, auto-gamut.'
    );
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    colorInput: colorInput,
    shadeMode: shadeModeRaw as ShadeMode,
    harmonyType: harmonyTypeRaw as GenerateRequest['harmonyType'],
    anchorBehavior: anchorBehaviorRaw as AnchorBehavior
  };
}

export function parseExportRequest(input: unknown): ExportRequest {
  var request = parseGenerateRequest(input);
  var source = input as Record<string, unknown>;

  var formatRaw = getStringValue(source, 'format');
  if (!formatRaw || !hasValue(formatRaw, EXPORT_FORMATS)) {
    throw new MachineInputError(
      'UNSUPPORTED_EXPORT_FORMAT',
      'Unsupported export format: ' + String(formatRaw),
      'Allowed: css, tailwind, tokens, figma, scss.'
    );
  }

  var namingPresetRaw = getStringValue(source, 'namingPreset') || 'numeric';
  if (!hasValue(namingPresetRaw, NAMING_PRESETS)) {
    throw new MachineInputError(
      'UNSUPPORTED_NAMING_PRESET',
      'Unsupported naming preset: ' + String(namingPresetRaw),
      'Allowed: numeric, semantic.'
    );
  }

  return {
    schemaVersion: request.schemaVersion,
    colorInput: request.colorInput,
    shadeMode: request.shadeMode,
    harmonyType: request.harmonyType,
    anchorBehavior: request.anchorBehavior,
    format: formatRaw,
    namingPreset: namingPresetRaw
  };
}

export function generatePaletteResponse(input: unknown): GenerateResponse {
  var request = parseGenerateRequest(input);
  var parsedRgb = parseColorInput(request.colorInput);

  if (!parsedRgb) {
    throw new MachineInputError(
      'INVALID_COLOR_INPUT',
      'Could not parse color input: ' + request.colorInput,
      'Use #RRGGBB, rgb(), hsl(), or oklch().'
    );
  }

  var normalizedHex = rgbToHex(parsedRgb);
  var primaryOklch = rgbToOklch(parsedRgb);
  var anchorStep = nearestScaleStepForLightness(primaryOklch.l);
  var anchorBehavior = request.anchorBehavior || 'preserve-input';

  var palette = generateFullPalette(primaryOklch, request.shadeMode, {
    behavior: anchorBehavior,
    anchorHex: normalizedHex,
    anchorStep: anchorStep
  });

  var harmony = generateHarmony(primaryOklch, request.harmonyType);

  var warnings = [] as GenerateResponse['warnings'];
  if (request.colorInput.trim().toLowerCase() !== normalizedHex.toLowerCase()) {
    warnings.push({
      code: 'INPUT_NORMALIZED',
      message: 'Input was normalized to ' + normalizedHex + ' before generation.'
    });
  }

  if (anchorBehavior === 'auto-gamut') {
    for (var i = 0; i < palette.primary.scale.length; i++) {
      var item = palette.primary.scale[i];
      if (item.step === anchorStep && item.hex.toLowerCase() !== normalizedHex.toLowerCase()) {
        warnings.push({
          code: 'ANCHOR_HEX_MAPPED',
          message:
            'Anchor step primary-' +
            String(anchorStep) +
            ' mapped from ' +
            normalizedHex +
            ' to ' +
            item.hex +
            ' due to auto-gamut mode.'
        });
        break;
      }
    }
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    algorithmVersion: ALGORITHM_VERSION,
    request: {
      colorInput: request.colorInput,
      normalizedHex: normalizedHex,
      shadeMode: request.shadeMode,
      harmonyType: request.harmonyType,
      anchorBehavior: anchorBehavior,
      anchorStep: anchorStep
    },
    warnings: warnings,
    palette: {
      primary: rolePalette('primary', palette.primary),
      secondary: rolePalette('secondary', palette.secondary),
      accent: rolePalette('accent', palette.accent),
      neutral: rolePalette('neutral', palette.neutral)
    },
    harmony: {
      type: harmony.type,
      colors: harmony.colors.map(function (item): HarmonyColor {
        return {
          label: item.label,
          hex: item.hex,
          lch: {
            l: item.lch.l,
            c: item.lch.c,
            h: item.lch.h
          }
        };
      })
    }
  };
}

export function exportPaletteResponse(input: unknown): ExportResponse {
  var request = parseExportRequest(input);
  var generated = generatePaletteResponse(request);
  var namingPreset = request.namingPreset || 'numeric';

  var parsedRgb = parseColorInput(generated.request.normalizedHex);
  if (!parsedRgb) {
    throw new MachineInputError('INVALID_COLOR_INPUT', 'Normalized color could not be parsed.');
  }

  var primaryOklch = rgbToOklch(parsedRgb);
  var fullPalette = generateFullPalette(primaryOklch, generated.request.shadeMode, {
    behavior: generated.request.anchorBehavior,
    anchorHex: generated.request.normalizedHex,
    anchorStep: generated.request.anchorStep
  });

  var content = formatFullExport(request.format, fullPalette, namingPreset);

  return {
    schemaVersion: SCHEMA_VERSION,
    algorithmVersion: ALGORITHM_VERSION,
    format: request.format,
    namingPreset: namingPreset,
    filename: filenameFor(request.format, namingPreset),
    mediaType: mediaTypeFor(request.format),
    content: content,
    generate: generated
  };
}
