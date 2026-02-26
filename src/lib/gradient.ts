import { clamp01, gamutMapOklch, oklchToRgb, rgbToHex, rgbToOklch, type Oklch, type RGB } from './color';

export type GradientStop = { position: number; hex: string; lch: Oklch };
export type GradientResult = { stops: GradientStop[]; css: string };

function normalizeHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

function buildCss(stops: GradientStop[]): string {
  var segments = stops.map(function (stop) {
    var percent = Math.round(stop.position * 10000) / 100;
    return stop.hex + ' ' + percent + '%';
  });
  return 'linear-gradient(90deg, ' + segments.join(', ') + ')';
}

function toSafeStepCount(steps: number): number {
  return Math.max(2, Math.floor(steps));
}

export function interpolateOklch(a: Oklch, b: Oklch, t: number): Oklch {
  var clampedT = clamp01(t);
  var deltaHue = ((b.h - a.h + 540) % 360) - 180;
  var raw = {
    l: a.l + (b.l - a.l) * clampedT,
    c: a.c + (b.c - a.c) * clampedT,
    h: normalizeHue(a.h + deltaHue * clampedT)
  };
  return rgbToOklch(gamutMapOklch(raw));
}

export function generateGradient(from: Oklch, to: Oklch, steps: number): GradientResult {
  var count = toSafeStepCount(steps);
  var stops: GradientStop[] = [];

  for (var i = 0; i < count; i++) {
    var t = count === 1 ? 0 : i / (count - 1);
    var lch = interpolateOklch(from, to, t);
    var rgb = gamutMapOklch(lch);
    stops.push({
      position: t,
      hex: rgbToHex(rgb),
      lch: rgbToOklch(rgb)
    });
  }

  return {
    stops: stops,
    css: buildCss(stops)
  };
}

export function generateRgbGradient(from: Oklch, to: Oklch, steps: number): GradientResult {
  var count = toSafeStepCount(steps);
  var fromRgb = oklchToRgb(from);
  var toRgb = oklchToRgb(to);
  var stops: GradientStop[] = [];

  for (var i = 0; i < count; i++) {
    var t = count === 1 ? 0 : i / (count - 1);
    var rgb: RGB = {
      r: fromRgb.r + (toRgb.r - fromRgb.r) * t,
      g: fromRgb.g + (toRgb.g - fromRgb.g) * t,
      b: fromRgb.b + (toRgb.b - fromRgb.b) * t
    };
    var safeRgb: RGB = {
      r: clamp01(rgb.r),
      g: clamp01(rgb.g),
      b: clamp01(rgb.b)
    };

    stops.push({
      position: t,
      hex: rgbToHex(safeRgb),
      lch: rgbToOklch(safeRgb)
    });
  }

  return {
    stops: stops,
    css: buildCss(stops)
  };
}

export function suggestGradients(base: Oklch): GradientResult[] {
  var baseSafe = rgbToOklch(gamutMapOklch(base));
  var complement = rgbToOklch(
    gamutMapOklch({
      l: baseSafe.l,
      c: baseSafe.c,
      h: normalizeHue(baseSafe.h + 180)
    })
  );
  var analogous = rgbToOklch(
    gamutMapOklch({
      l: baseSafe.l,
      c: baseSafe.c,
      h: normalizeHue(baseSafe.h + 60)
    })
  );
  var triadic = rgbToOklch(
    gamutMapOklch({
      l: baseSafe.l,
      c: baseSafe.c,
      h: normalizeHue(baseSafe.h + 120)
    })
  );
  var baseLight = rgbToOklch(
    gamutMapOklch({
      l: 0.9,
      c: baseSafe.c,
      h: baseSafe.h
    })
  );
  var baseDark = rgbToOklch(
    gamutMapOklch({
      l: 0.2,
      c: baseSafe.c,
      h: baseSafe.h
    })
  );

  return [
    generateGradient(baseSafe, complement, 10),
    generateGradient(baseLight, baseDark, 10),
    generateGradient(baseSafe, analogous, 10),
    generateGradient(baseSafe, triadic, 10)
  ];
}
