import { clamp01, gamutMapOklch, rgbToHex, rgbToOklch, type Oklch } from './color';
import { applyScaleAnchor, type ScaleAnchorOptions, type ScaleColor, SCALE_STEPS, generateScale } from './scale';

export type ShadeMode = 'none' | 'warm' | 'cool' | 'natural';

export var SHADE_MODES: Array<{ id: ShadeMode; label: string }> = [
  { id: 'none', label: 'None' },
  { id: 'warm', label: 'Warm' },
  { id: 'cool', label: 'Cool' },
  { id: 'natural', label: 'Natural' }
];

var LIGHTNESS_BY_STEP: Record<number, number> = {
  50: 0.985,
  100: 0.965,
  200: 0.93,
  300: 0.87,
  400: 0.76,
  500: 0.63,
  600: 0.52,
  700: 0.40,
  800: 0.30,
  900: 0.22,
  950: 0.15
};

function normalizeHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

function getCenteredPhase(step: number, anchorStep: number, minStep: number, maxStep: number): number {
  if (step === anchorStep) return 0;

  if (step < anchorStep) {
    var upSpan = Math.max(1, anchorStep - minStep);
    return -((anchorStep - step) / upSpan);
  }

  var downSpan = Math.max(1, maxStep - anchorStep);
  return (step - anchorStep) / downSpan;
}

function getHueOffset(mode: ShadeMode, centeredPhase: number): number {
  if (mode === 'warm') {
    return centeredPhase < 0 ? centeredPhase * 15 : centeredPhase * 10;
  }

  if (mode === 'cool') {
    return centeredPhase < 0 ? -centeredPhase * 15 : -centeredPhase * 10;
  }

  if (mode === 'natural') {
    return centeredPhase < 0 ? centeredPhase * 10 : centeredPhase * 15;
  }

  return 0;
}

export function generateShiftedScale(base: Oklch, mode: ShadeMode, anchorOptions?: ScaleAnchorOptions): ScaleColor[] {
  if (mode === 'none') {
    return generateScale(base, anchorOptions);
  }

  var baseHue = normalizeHue(base.h);
  var safeBaseC = Math.max(0, base.c);
  var baseL = clamp01(base.l);
  var anchorStep =
    anchorOptions && anchorOptions.anchorStep && LIGHTNESS_BY_STEP[anchorOptions.anchorStep]
      ? anchorOptions.anchorStep
      : 500;
  var baseTargetL = LIGHTNESS_BY_STEP[anchorStep];
  var lOffset = baseL - baseTargetL;
  var minStep = SCALE_STEPS[0];
  var maxStep = SCALE_STEPS[SCALE_STEPS.length - 1];
  var distanceDenominator = Math.max(anchorStep - minStep, maxStep - anchorStep) || 1;

  var generated = SCALE_STEPS.map(function (step) {
    var centeredPhase = getCenteredPhase(step, anchorStep, minStep, maxStep);
    var hueOffset = getHueOffset(mode, centeredPhase);
    var targetL = clamp01(LIGHTNESS_BY_STEP[step] + lOffset * 0.12);
    var distance = Math.abs(step - anchorStep) / distanceDenominator;
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

  return applyScaleAnchor(generated, anchorOptions);
}
