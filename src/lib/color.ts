export type RGB = { r: number; g: number; b: number };
export type Oklab = { l: number; a: number; b: number };
export type Oklch = { l: number; c: number; h: number };

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function deg2rad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function rad2deg(radians: number): number {
  return (radians * 180) / Math.PI;
}

function srgbToLinear(value: number): number {
  var v = clamp01(value);
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearToSrgb(value: number): number {
  var v = Math.max(0, value);
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

export function rgbToHex(rgb: RGB): string {
  function toByte(v: number): string {
    var n = Math.round(clamp01(v) * 255);
    var s = n.toString(16);
    return s.length === 1 ? '0' + s : s;
  }
  return '#' + toByte(rgb.r) + toByte(rgb.g) + toByte(rgb.b);
}

export function hexToRgb(hex: string): RGB | null {
  var clean = hex.trim().replace(/^#/, '');
  if (clean.length === 3) {
    clean = clean.charAt(0) + clean.charAt(0) + clean.charAt(1) + clean.charAt(1) + clean.charAt(2) + clean.charAt(2);
  }
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    return null;
  }
  var intVal = parseInt(clean, 16);
  return {
    r: ((intVal >> 16) & 255) / 255,
    g: ((intVal >> 8) & 255) / 255,
    b: (intVal & 255) / 255
  };
}

export function rgbToOklab(rgb: RGB): Oklab {
  var r = srgbToLinear(rgb.r);
  var g = srgbToLinear(rgb.g);
  var b = srgbToLinear(rgb.b);

  var l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  var m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  var s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  var l_ = Math.cbrt(l);
  var m_ = Math.cbrt(m);
  var s_ = Math.cbrt(s);

  return {
    l: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  };
}

export function oklabToOklch(lab: Oklab): Oklch {
  var c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  var h = rad2deg(Math.atan2(lab.b, lab.a));
  if (h < 0) h += 360;
  return { l: lab.l, c: c, h: h };
}

export function oklchToOklab(lch: Oklch): Oklab {
  var hRad = deg2rad(lch.h);
  return {
    l: lch.l,
    a: lch.c * Math.cos(hRad),
    b: lch.c * Math.sin(hRad)
  };
}

function oklabToRgbUnclamped(lab: Oklab): RGB {
  var l_ = lab.l + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
  var m_ = lab.l - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
  var s_ = lab.l - 0.0894841775 * lab.a - 1.291485548 * lab.b;

  var l = l_ * l_ * l_;
  var m = m_ * m_ * m_;
  var s = s_ * s_ * s_;

  var rLin = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  var gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  var bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  return {
    r: linearToSrgb(rLin),
    g: linearToSrgb(gLin),
    b: linearToSrgb(bLin)
  };
}

export function oklabToRgb(lab: Oklab): RGB {
  var raw = oklabToRgbUnclamped(lab);
  return {
    r: clamp01(raw.r),
    g: clamp01(raw.g),
    b: clamp01(raw.b)
  };
}

export function rgbToOklch(rgb: RGB): Oklch {
  return oklabToOklch(rgbToOklab(rgb));
}

export function oklchToRgb(lch: Oklch): RGB {
  return gamutMapOklch(lch);
}

export function isInSrgbGamut(rgb: RGB): boolean {
  return rgb.r >= 0 && rgb.r <= 1 && rgb.g >= 0 && rgb.g <= 1 && rgb.b >= 0 && rgb.b <= 1;
}

export function gamutMapOklch(lch: Oklch): RGB {
  var normalized = {
    l: clamp01(lch.l),
    c: Math.max(0, lch.c),
    h: ((lch.h % 360) + 360) % 360
  };
  var rgb = oklabToRgbUnclamped(oklchToOklab(normalized));
  if (isInSrgbGamut(rgb)) {
    return rgb;
  }

  var low = 0;
  var high = normalized.c;
  for (var i = 0; i < 24; i++) {
    var mid = (low + high) / 2;
    var trial = oklabToRgbUnclamped(oklchToOklab({ l: normalized.l, c: mid, h: normalized.h }));
    if (isInSrgbGamut(trial)) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return oklabToRgb(oklchToOklab({ l: normalized.l, c: low, h: normalized.h }));
}

function parseNumberList(content: string): number[] {
  return content
    .split(',')
    .map(function (item) {
      return item.trim();
    })
    .filter(function (item) {
      return item.length > 0;
    })
    .map(function (item) {
      return Number(item.replace(/%$/, ''));
    });
}

function hslToRgb(h: number, s: number, l: number): RGB {
  var hue = ((h % 360) + 360) % 360;
  var sat = clamp01(s);
  var lig = clamp01(l);

  if (sat === 0) {
    return { r: lig, g: lig, b: lig };
  }

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

export function parseColorInput(value: string): RGB | null {
  var input = value.trim();
  if (!input) return null;

  var hex = hexToRgb(input);
  if (hex) return hex;

  var rgbMatch = input.match(/^rgb\((.*)\)$/i);
  if (rgbMatch) {
    var rgbParts = parseNumberList(rgbMatch[1]);
    if (rgbParts.length === 3) {
      return {
        r: clamp01(rgbParts[0] / 255),
        g: clamp01(rgbParts[1] / 255),
        b: clamp01(rgbParts[2] / 255)
      };
    }
  }

  var hslMatch = input.match(/^hsl\((.*)\)$/i);
  if (hslMatch) {
    var hslParts = hslMatch[1].split(',').map(function (item) {
      return item.trim();
    });
    if (hslParts.length === 3) {
      var h = Number(hslParts[0].replace(/deg$/i, ''));
      var s = Number(hslParts[1].replace('%', '')) / 100;
      var l = Number(hslParts[2].replace('%', '')) / 100;
      if (!isNaN(h) && !isNaN(s) && !isNaN(l)) {
        return hslToRgb(h, s, l);
      }
    }
  }

  var oklchMatch = input.match(/^oklch\((.*)\)$/i);
  if (oklchMatch) {
    var oklchParts = oklchMatch[1].split(/\s+/).filter(function (item) {
      return item.length > 0;
    });
    if (oklchParts.length >= 3) {
      var lVal = Number(oklchParts[0].replace('%', '')) / (oklchParts[0].indexOf('%') > -1 ? 100 : 1);
      var cVal = Number(oklchParts[1]);
      var hVal = Number(oklchParts[2].replace(/deg$/i, ''));
      if (!isNaN(lVal) && !isNaN(cVal) && !isNaN(hVal)) {
        return oklchToRgb({ l: lVal, c: cVal, h: hVal });
      }
    }
  }

  return null;
}
