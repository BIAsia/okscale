import { gamutMapOklch, maxChromaInGamut, rgbToHex, rgbToOklch, type Oklch } from './color';
import { type AnchorBehavior, nearestScaleStepForLightness, type ScaleColor, generateScale } from './scale';
import { generateHarmony, type HarmonyType } from './harmony';
import { generateShiftedScale, type ShadeMode } from './shades';

export type PaletteRole = 'primary' | 'secondary' | 'accent' | 'neutral';

export type PaletteEntry = {
  role: PaletteRole;
  label: string;
  base: Oklch;
  baseHex: string;
  scale: ScaleColor[];
};

export type FullPalette = {
  primary: PaletteEntry;
  secondary: PaletteEntry;
  accent: PaletteEntry;
  neutral: PaletteEntry;
};

export type PrimaryAnchorSettings = {
  behavior: AnchorBehavior;
  anchorHex: string;
  anchorStep?: number;
};

export type NeutralMode = 'keep-hue' | 'absolute-gray';

function mappedHex(base: Oklch): string {
  return rgbToHex(gamutMapOklch(base));
}

function createEntry(role: PaletteRole, label: string, base: Oklch, scale: ScaleColor[]): PaletteEntry {
  var mappedBase = rgbToOklch(gamutMapOklch(base));
  var baseHex = mappedHex(mappedBase);
  return {
    role: role,
    label: label,
    base: mappedBase,
    baseHex: baseHex,
    scale: scale
  };
}

export function generateFullPalette(
  primaryBase: Oklch,
  shadeMode: ShadeMode,
  primaryAnchor?: PrimaryAnchorSettings,
  neutralMode: NeutralMode = 'keep-hue',
  harmonyType: HarmonyType = 'complementary'
): FullPalette {
  var primaryMapped = rgbToOklch(gamutMapOklch(primaryBase));

  // Derive secondary and accent bases from the selected harmony type
  var harmonyResult = generateHarmony(primaryMapped, harmonyType);
  var secondaryBase: Oklch;
  var accentBase: Oklch;
  if (harmonyType === 'analogous') {
    // [−30, primary, +30]
    secondaryBase = harmonyResult.colors[0].lch;
    accentBase = harmonyResult.colors[2].lch;
  } else if (harmonyType === 'tetradic') {
    // [primary, +90, +180, +270]
    secondaryBase = harmonyResult.colors[1].lch;
    accentBase = harmonyResult.colors[3].lch;
  } else if (harmonyResult.colors.length >= 3) {
    // triadic, split-complementary
    secondaryBase = harmonyResult.colors[1].lch;
    accentBase = harmonyResult.colors[2].lch;
  } else {
    // complementary: [primary, +180] — use +30 analogous as accent
    secondaryBase = harmonyResult.colors[1].lch;
    accentBase = generateHarmony(primaryMapped, 'analogous').colors[2].lch;
  }

  var neutralBase = rgbToOklch(
    gamutMapOklch({
      l: primaryMapped.l,
      c: neutralMode === 'absolute-gray' ? 0 : 0.02,
      h: neutralMode === 'absolute-gray' ? 0 : primaryMapped.h
    })
  );

  // Compute primary's relative chroma (chroma as a fraction of the sRGB gamut boundary
  // at the primary's lightness). The neutral's relative chroma must never exceed this.
  var primaryMaxC = maxChromaInGamut(primaryMapped.l, primaryMapped.h);
  var primaryRelC = primaryMaxC > 0 ? primaryMapped.c / primaryMaxC : 0;

  // Target a gentle tint for neutrals (8 % of gamut), always ≤ primary's relative chroma.
  // Using relativeChroma mode instead of lightChromaDecay ensures uniform apparent
  // saturation across all steps, including near-white (50) and near-black (950).
  var NEUTRAL_TARGET_REL_C = 0.08;
  var neutralRelC = neutralMode === 'absolute-gray' ? 0 : Math.min(NEUTRAL_TARGET_REL_C, primaryRelC);

  var anchorStep = primaryAnchor?.anchorStep || nearestScaleStepForLightness(primaryMapped.l);

  var sharedBehavior = primaryAnchor ? primaryAnchor.behavior : 'auto-gamut';

  var primaryAnchorOptions = primaryAnchor
    ? {
        behavior: sharedBehavior,
        anchorStep: anchorStep,
        anchorHex: primaryAnchor.anchorHex
      }
    : undefined;

  var secondaryAnchorOptions = primaryAnchor
    ? {
        behavior: sharedBehavior,
        anchorStep: anchorStep,
        anchorHex: mappedHex(secondaryBase)
      }
    : undefined;

  var accentAnchorOptions = primaryAnchor
    ? {
        behavior: sharedBehavior,
        anchorStep: anchorStep,
        anchorHex: mappedHex(accentBase)
      }
    : undefined;

  var neutralAnchorOptions = primaryAnchor
    ? {
        behavior: sharedBehavior,
        anchorStep: anchorStep,
        anchorHex: mappedHex(neutralBase),
        relativeChroma: neutralRelC
      }
    : { relativeChroma: neutralRelC };

  var primaryScale = generateShiftedScale(primaryMapped, shadeMode, primaryAnchorOptions);
  var secondaryScale = generateShiftedScale(secondaryBase, shadeMode, secondaryAnchorOptions);
  var accentScale = generateShiftedScale(accentBase, shadeMode, accentAnchorOptions);
  var neutralScale = generateScale(neutralBase, neutralAnchorOptions);

  return {
    primary: createEntry('primary', 'Primary', primaryMapped, primaryScale),
    secondary: createEntry('secondary', 'Secondary', secondaryBase, secondaryScale),
    accent: createEntry('accent', 'Accent', accentBase, accentScale),
    neutral: createEntry('neutral', 'Neutral', neutralBase, neutralScale)
  };
}
