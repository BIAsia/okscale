import { clamp01, gamutMapOklch, rgbToHex, rgbToOklch, type Oklch } from './color';

export var SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

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

export type ScaleColor = {
  step: number;
  lch: Oklch;
  hex: string;
};

export function generateScale(base: Oklch): ScaleColor[] {
  var hue = ((base.h % 360) + 360) % 360;
  var safeBaseC = Math.max(0, base.c);
  var baseL = clamp01(base.l);
  var baseTargetL = LIGHTNESS_BY_STEP[500];
  var lOffset = baseL - baseTargetL;

  return SCALE_STEPS.map(function (step) {
    var targetL = clamp01(LIGHTNESS_BY_STEP[step] + lOffset * 0.12);
    var distance = Math.abs(step - 500) / 450;
    var chromaFactor = 1 - distance * 0.32;
    if (step <= 100) chromaFactor *= 0.75;
    if (step >= 900) chromaFactor *= 0.8;

    var raw = {
      l: targetL,
      c: Math.max(0, safeBaseC * chromaFactor),
      h: hue
    };

    var rgb = gamutMapOklch(raw);
    var mapped = rgbToOklch(rgb);

    return {
      step: step,
      lch: mapped,
      hex: rgbToHex(rgb)
    };
  });
}
