import type { NamingPreset, ExportFormat } from '../lib/export';
import type { HarmonyType } from '../lib/harmony';
import type { AnchorBehavior, ScaleColor } from '../lib/scale';
import type { ShadeMode } from '../lib/shades';

export type OkscaleSchemaVersion = '1.0';

export type GenerateRequest = {
  schemaVersion?: OkscaleSchemaVersion;
  colorInput: string;
  shadeMode: ShadeMode;
  harmonyType: HarmonyType;
  anchorBehavior?: AnchorBehavior;
};

export type ExportRequest = GenerateRequest & {
  format: ExportFormat;
  namingPreset?: NamingPreset;
};

export type MachineWarning = {
  code: 'INPUT_NORMALIZED' | 'ANCHOR_HEX_MAPPED';
  message: string;
};

export type HarmonyColor = {
  label: string;
  hex: string;
  lch: {
    l: number;
    c: number;
    h: number;
  };
};

export type RolePalette = {
  role: 'primary' | 'secondary' | 'accent' | 'neutral';
  label: string;
  baseHex: string;
  baseLch: {
    l: number;
    c: number;
    h: number;
  };
  scale: ScaleColor[];
};

export type GenerateResponse = {
  schemaVersion: OkscaleSchemaVersion;
  algorithmVersion: string;
  request: {
    colorInput: string;
    normalizedHex: string;
    shadeMode: ShadeMode;
    harmonyType: HarmonyType;
    anchorBehavior: AnchorBehavior;
    anchorStep: number;
  };
  warnings: MachineWarning[];
  palette: {
    primary: RolePalette;
    secondary: RolePalette;
    accent: RolePalette;
    neutral: RolePalette;
  };
  harmony: {
    type: HarmonyType;
    colors: HarmonyColor[];
  };
};

export type ExportResponse = {
  schemaVersion: OkscaleSchemaVersion;
  algorithmVersion: string;
  format: ExportFormat;
  namingPreset: NamingPreset;
  filename: string;
  mediaType: string;
  content: string;
  generate: GenerateResponse;
};

export type MachineErrorCode =
  | 'INVALID_REQUEST'
  | 'INVALID_COLOR_INPUT'
  | 'UNSUPPORTED_SHADE_MODE'
  | 'UNSUPPORTED_HARMONY_TYPE'
  | 'UNSUPPORTED_ANCHOR_BEHAVIOR'
  | 'UNSUPPORTED_EXPORT_FORMAT'
  | 'UNSUPPORTED_NAMING_PRESET';

export type MachineErrorShape = {
  error: {
    code: MachineErrorCode;
    message: string;
    hint?: string;
  };
};
