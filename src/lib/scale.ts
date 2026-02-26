import { clamp01, gamutMapOklch, rgbToHex, rgbToOklch, oklchToRgb, type Oklch } from './color';

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

function rgbToHsl(rgb: { r: number; g: number; b: number }): { h: number; s: number; l: number } {
  var max = Math.max(rgb.r, rgb.g, rgb.b);
  var min = Math.min(rgb.r, rgb.g, rgb.b);
  var delta = max - min;
  var h = 0;
  var l = (max + min) / 2;
  var s = 0;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === rgb.r) h = ((rgb.g - rgb.b) / delta) % 6;
    else if (max === rgb.g) h = (rgb.b - rgb.r) / delta + 2;
    else h = (rgb.r - rgb.g) / delta + 4;
    h = h * 60;
    if (h < 0) h += 360;
  }

  return { h: h, s: s, l: l };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  var hue = ((h % 360) + 360) % 360;
  var sat = clamp01(s);
  var lig = clamp01(l);
  if (sat === 0) return { r: lig, g: lig, b: lig };

  var c = (1 - Math.abs(2 * lig - 1)) * sat;
  var hp = hue / 60;
  var x = c * (1 - Math.abs((hp % 2) - 1));
  var base = { r: 0, g: 0, b: 0 };

  if (hp >= 0 && hp < 1) base = { r: c, g: x, b: 0 };
  else if (hp < 2) base = { r: x, g: c, b: 0 };
  else if (hp < 3) base = { r: 0, g: c, b: x };
  else if (hp < 4) base = { r: 0, g: x, b: c };
  else if (hp < 5) base = { r: x, g: 0, b: c };
  else base = { r: c, g: 0, b: x };

  var m = lig - c / 2;
  return { r: base.r + m, g: base.g + m, b: base.b + m };
}

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

export function generateHslScale(base: Oklch): ScaleColor[] {
  var hsl = rgbToHsl(oklchToRgb(base));
  return SCALE_STEPS.map(function (step) {
    var l = LIGHTNESS_BY_STEP[step];
    var sat = hsl.s;
    if (step <= 100) sat = sat * 0.85;
    if (step >= 900) sat = sat * 0.9;
    var rgb = hslToRgb(hsl.h, sat, l);
    return {
      step: step,
      lch: rgbToOklch(rgb),
      hex: rgbToHex(rgb)
    };
  });
}
