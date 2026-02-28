import { gamutMapOklch, rgbToHex, rgbToOklch, type Oklch } from './color';
import { type AnchorBehavior, nearestScaleStepForLightness, type ScaleColor, generateScale } from './scale';
import { generateHarmony } from './harmony';
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
  primaryAnchor?: PrimaryAnchorSettings
): FullPalette {
  var primaryMapped = rgbToOklch(gamutMapOklch(primaryBase));
  var complementary = generateHarmony(primaryMapped, 'complementary').colors[1].lch;
  var analogous = generateHarmony(primaryMapped, 'analogous').colors[2].lch;
  var neutralBase = rgbToOklch(
    gamutMapOklch({
      l: primaryMapped.l,
      c: 0.02,
      h: primaryMapped.h
    })
  );

  var anchorStep = primaryAnchor?.anchorStep || nearestScaleStepForLightness(primaryMapped.l);

  var primaryAnchorHex = primaryAnchor
    ? primaryAnchor.behavior === 'preserve-input'
      ? primaryAnchor.anchorHex
      : mappedHex(primaryMapped)
    : undefined;

  var primaryAnchorOptions = primaryAnchor
    ? {
        behavior: primaryAnchor.behavior,
        anchorStep: anchorStep,
        anchorHex: primaryAnchorHex
      }
    : undefined;

  var secondaryAnchorOptions = {
    behavior: 'auto-gamut' as const,
    anchorStep: anchorStep,
    anchorHex: mappedHex(complementary)
  };

  var accentAnchorOptions = {
    behavior: 'auto-gamut' as const,
    anchorStep: anchorStep,
    anchorHex: mappedHex(analogous)
  };

  var neutralAnchorOptions = {
    behavior: 'auto-gamut' as const,
    anchorStep: anchorStep,
    anchorHex: mappedHex(neutralBase)
  };

  var primaryScale = generateShiftedScale(primaryMapped, shadeMode, primaryAnchorOptions);
  var secondaryScale = generateShiftedScale(complementary, shadeMode, secondaryAnchorOptions);
  var accentScale = generateShiftedScale(analogous, shadeMode, accentAnchorOptions);
  var neutralScale = generateScale(neutralBase, neutralAnchorOptions);

  return {
    primary: createEntry('primary', 'Primary', primaryMapped, primaryScale),
    secondary: createEntry('secondary', 'Secondary', complementary, secondaryScale),
    accent: createEntry('accent', 'Accent', analogous, accentScale),
    neutral: createEntry('neutral', 'Neutral', neutralBase, neutralScale)
  };
}
