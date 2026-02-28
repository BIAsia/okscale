import { HARMONY_TYPES, type HarmonyType } from './harmony';
import { SHADE_MODES, type ShadeMode } from './shades';

export type WorkspaceShareState = {
  colorInput: string;
  shadeMode: ShadeMode;
  harmonyType: HarmonyType;
};

var VALID_SHADE_MODES = SHADE_MODES.map(function (mode) {
  return mode.id;
});

var VALID_HARMONY_TYPES = HARMONY_TYPES.map(function (mode) {
  return mode.id;
});

function isShadeMode(value: string): value is ShadeMode {
  return VALID_SHADE_MODES.indexOf(value as ShadeMode) >= 0;
}

function isHarmonyType(value: string): value is HarmonyType {
  return VALID_HARMONY_TYPES.indexOf(value as HarmonyType) >= 0;
}

export function decodeWorkspaceState(search: string): WorkspaceShareState | null {
  var params = new URLSearchParams(search);
  var colorInput = params.get('color');
  var shadeMode = params.get('shade');
  var harmonyType = params.get('harmony');

  if (!colorInput || !shadeMode || !harmonyType) return null;
  if (!isShadeMode(shadeMode)) return null;
  if (!isHarmonyType(harmonyType)) return null;

  return {
    colorInput: colorInput,
    shadeMode: shadeMode,
    harmonyType: harmonyType
  };
}

export function encodeWorkspaceState(state: WorkspaceShareState): string {
  var params = new URLSearchParams();
  params.set('color', state.colorInput);
  params.set('shade', state.shadeMode);
  params.set('harmony', state.harmonyType);
  return params.toString();
}

export function buildWorkspaceShareUrl(state: WorkspaceShareState): string {
  var url = new URL(window.location.href);
  url.pathname = '/app';
  url.search = encodeWorkspaceState(state);
  url.hash = '';
  return url.toString();
}
