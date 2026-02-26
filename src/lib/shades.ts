import { clamp01, gamutMapOklch, rgbToHex, rgbToOklch, type Oklch } from './color';
import { type ScaleColor, SCALE_STEPS, generateScale } from './scale';

export type ShadeMode = 'none' | 'warm' | 'cool' | 'natural';

export var SHADE_MODES: Array<{ id: ShadeMode; label: string }> = [
  { id: 'none', label: 'None' },
  { id: 'warm', label: 'Warm' },
  { id: 'cool', label: 'Cool' },
  { id: 'natural', label: 'Natural' }
];

var LIGHTNESS_BY_STEP: Record<number, number> = {
  50: 0.97,
  100: 0.93,
  200: 0.86,
  300: 0.78,
  400: 0.68,
  500: 0.58,
  600: 0.49,
  700: 0.39,
  800: 0.3,
  900: 0.22,
  950: 0.15
};

function normalizeHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

function interpolate(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

function getHueOffset(mode: ShadeMode, t: number): number {
  if (mode === 'warm') return interpolate(-15, 10, t);
  if (mode === 'cool') return interpolate(15, -10, t);
  if (mode === 'natural') return interpolate(-10, 15, t);
  return 0;
}

export function generateShiftedScale(base: Oklch, mode: ShadeMode): ScaleColor[] {
  if (mode === 'none') {
    return generateScale(base);
  }

  var baseHue = normalizeHue(base.h);
  var safeBaseC = Math.max(0, base.c);
  var baseL = clamp01(base.l);
  var baseTargetL = LIGHTNESS_BY_STEP[500];
  var lOffset = baseL - baseTargetL;
  var minStep = SCALE_STEPS[0];
  var maxStep = SCALE_STEPS[SCALE_STEPS.length - 1];

  return SCALE_STEPS.map(function (step) {
    var t = (step - minStep) / (maxStep - minStep);
    var hueOffset = getHueOffset(mode, t);
    var targetL = clamp01(LIGHTNESS_BY_STEP[step] + lOffset * 0.12);
    var distance = Math.abs(step - 500) / 450;
    var chromaFactor = 1 - distance * 0.32;
    if (step <= 100) chromaFactor *= 0.75;
    if (step >= 900) chromaFactor *= 0.8;

    var raw = {
      l: targetL,
      c: Math.max(0, safeBaseC * chromaFactor),
      h: normalizeHue(baseHue + hueOffset)
    };

    var rgb = gamutMapOklch(raw);
    return {
      step: step,
      lch: rgbToOklch(rgb),
      hex: rgbToHex(rgb)
    };
  });
}
