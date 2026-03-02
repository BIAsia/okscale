import { clamp01, gamutMapOklch, oklchToRgb, rgbToHex, rgbToOklch, type Oklch, type RGB } from './color';
import type { HarmonyResult } from './harmony';

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

/**
 * Build a gradient whose stops are derived from the active harmony colors.
 * Between each consecutive pair of harmony colors we interpolate in OKLCH
 * so the gradient is smooth and perceptually uniform.
 */
export function gradientFromHarmony(harmony: HarmonyResult): GradientResult {
  var colors = harmony.colors;
  if (colors.length === 0) {
    return { stops: [], css: '' };
  }
  if (colors.length === 1) {
    var only = colors[0];
    return {
      stops: [{ position: 0, hex: only.hex, lch: only.lch }],
      css: 'linear-gradient(90deg, ' + only.hex + ' 0%, ' + only.hex + ' 100%)'
    };
  }

  var MAX_STOPS = 10;
  var segments = colors.length - 1;
  // distribute stops evenly across segments, total ≤ MAX_STOPS
  var stepsPerSegment = Math.max(1, Math.floor((MAX_STOPS - 1) / segments));
  var allStops: GradientStop[] = [];

  for (var seg = 0; seg < segments; seg++) {
    var fromColor = colors[seg];
    var toColor = colors[seg + 1];
    var segStart = seg / segments;
    var segEnd = (seg + 1) / segments;

    // include start of this segment; skip it on subsequent segments to avoid duplicates
    for (var s = (seg === 0 ? 0 : 1); s <= stepsPerSegment; s++) {
      var t = s / stepsPerSegment;
      var globalPos = segStart + (segEnd - segStart) * t;
      var lch = interpolateOklch(fromColor.lch, toColor.lch, t);
      var rgb = gamutMapOklch(lch);
      allStops.push({
        position: globalPos,
        hex: rgbToHex(rgb),
        lch: rgbToOklch(rgb)
      });
    }
  }

  // Build anchor stops that sit exactly at each harmony color position,
  // used for chip rendering (returned separately so UI can read them).
  var anchorStops: GradientStop[] = colors.map(function (c, i) {
    return {
      position: segments === 0 ? 0 : i / segments,
      hex: c.hex,
      lch: c.lch
    };
  });

  return {
    stops: anchorStops,
    css: buildCss(allStops)
  };
}

/**
 * Like gradientFromHarmony but remaps each harmony color into a vivid
 * lightness band [L_MIN, L_MAX] and raises chroma to MIN_C.
 * This keeps the gradient perceptually vivid regardless of how dark / muted
 * the primary color is.
 */
export function gradientFromHarmonyVivid(
  harmony: HarmonyResult,
  options?: { lMin?: number; lMax?: number; minC?: number }
): GradientResult {
  var L_MIN = (options && options.lMin !== undefined) ? options.lMin : 0.60;
  var L_MAX = (options && options.lMax !== undefined) ? options.lMax : 0.80;
  var MIN_C = (options && options.minC !== undefined) ? options.minC : 0.2;

  function vividLch(lch: Oklch): Oklch {
    var l = lch.l < L_MIN ? L_MIN : lch.l > L_MAX ? L_MAX : lch.l;
    var c = lch.c < MIN_C ? MIN_C : lch.c;
    return rgbToOklch(gamutMapOklch({ l: l, c: c, h: lch.h }));
  }

  var vivid: HarmonyResult = {
    type: harmony.type,
    colors: harmony.colors.map(function (col) {
      var lch = vividLch(col.lch);
      var rgb = gamutMapOklch(lch);
      return { label: col.label, lch: lch, hex: rgbToHex(rgb) };
    })
  };

  return gradientFromHarmony(vivid);
}

/**
 * Build a gradient between two arbitrary OKLCH colors.
 * Returns the two endpoints as anchor stops (for chip display)
 * and a 10-step OKLCH-interpolated CSS string.
 */
export function gradientFromPair(from: Oklch, to: Oklch): GradientResult {
  var CSS_STEPS = 10;
  var cssStops: GradientStop[] = [];
  for (var i = 0; i < CSS_STEPS; i++) {
    var t = i / (CSS_STEPS - 1);
    var lch = interpolateOklch(from, to, t);
    var rgb = gamutMapOklch(lch);
    cssStops.push({ position: t, hex: rgbToHex(rgb), lch: rgbToOklch(rgb) });
  }
  var fromRgb = gamutMapOklch(from);
  var toRgb = gamutMapOklch(to);
  return {
    stops: [
      { position: 0, hex: rgbToHex(fromRgb), lch: rgbToOklch(fromRgb) },
      { position: 1, hex: rgbToHex(toRgb),   lch: rgbToOklch(toRgb)   }
    ],
    css: buildCss(cssStops)
  };
}
