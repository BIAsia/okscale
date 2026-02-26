import { type Oklch, gamutMapOklch, rgbToHex, rgbToOklch } from './color';

export type HarmonyType = 'complementary' | 'analogous' | 'triadic' | 'split-complementary' | 'tetradic';

export type HarmonyResult = {
  type: HarmonyType;
  colors: Array<{ lch: Oklch; hex: string; label: string }>;
};

export var HARMONY_TYPES: Array<{ id: HarmonyType; label: string }> = [
  { id: 'complementary', label: 'Complementary' },
  { id: 'analogous', label: 'Analogous' },
  { id: 'triadic', label: 'Triadic' },
  { id: 'split-complementary', label: 'Split Complementary' },
  { id: 'tetradic', label: 'Tetradic' }
];

function normalizeHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

function createHarmonyColor(base: Oklch, hueOffset: number, label: string): { lch: Oklch; hex: string; label: string } {
  var target = {
    l: base.l,
    c: base.c,
    h: normalizeHue(base.h + hueOffset)
  };
  var rgb = gamutMapOklch(target);
  return {
    lch: rgbToOklch(rgb),
    hex: rgbToHex(rgb),
    label: label
  };
}

export function generateHarmony(base: Oklch, type: HarmonyType): HarmonyResult {
  if (type === 'complementary') {
    return {
      type: type,
      colors: [createHarmonyColor(base, 0, 'Primary'), createHarmonyColor(base, 180, 'Complement')]
    };
  }

  if (type === 'analogous') {
    return {
      type: type,
      colors: [
        createHarmonyColor(base, -30, 'Analogous -30°'),
        createHarmonyColor(base, 0, 'Primary'),
        createHarmonyColor(base, 30, 'Analogous +30°')
      ]
    };
  }

  if (type === 'triadic') {
    return {
      type: type,
      colors: [
        createHarmonyColor(base, 0, 'Primary'),
        createHarmonyColor(base, 120, 'Triadic +120°'),
        createHarmonyColor(base, 240, 'Triadic +240°')
      ]
    };
  }

  if (type === 'split-complementary') {
    return {
      type: type,
      colors: [
        createHarmonyColor(base, 0, 'Primary'),
        createHarmonyColor(base, 150, 'Split +150°'),
        createHarmonyColor(base, 210, 'Split +210°')
      ]
    };
  }

  return {
    type: type,
    colors: [
      createHarmonyColor(base, 0, 'Primary'),
      createHarmonyColor(base, 90, 'Tetradic +90°'),
      createHarmonyColor(base, 180, 'Tetradic +180°'),
      createHarmonyColor(base, 270, 'Tetradic +270°')
    ]
  };
}
