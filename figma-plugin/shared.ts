import { parseColorInput, rgbToHex, rgbToOklch, type Oklch } from '../src/lib/color';
import { buildUsageMatrix } from '../src/lib/contrast';
import {
  gradientFromHarmony,
  gradientFromHarmonyVivid,
  gradientFromPair,
  type GradientResult,
} from '../src/lib/gradient';
import { generateHarmony, type HarmonyResult, type HarmonyType } from '../src/lib/harmony';
import {
  generateFullPalette,
  type FullPalette,
  type NeutralMode,
} from '../src/lib/palette';
import { nearestScaleStepForLightness, type AnchorBehavior } from '../src/lib/scale';
import type { ShadeMode } from '../src/lib/shades';

export type PluginSettings = {
  colorInput: string;
  shadeMode: ShadeMode;
  harmonyType: HarmonyType;
  anchorBehavior: AnchorBehavior;
  neutralMode: NeutralMode;
};

export type PluginWarning = {
  code: 'INPUT_NORMALIZED' | 'ANCHOR_HEX_MAPPED';
  message: string;
};

export type PluginGenerated = {
  request: {
    colorInput: string;
    normalizedHex: string;
    shadeMode: ShadeMode;
    harmonyType: HarmonyType;
    anchorBehavior: AnchorBehavior;
    neutralMode: NeutralMode;
    anchorStep: number;
  };
  warnings: PluginWarning[];
  primaryOklch: Oklch;
  palette: FullPalette;
  harmony: HarmonyResult;
  gradients: GradientResult[];
  usageRows: ReturnType<typeof buildUsageMatrix>;
};

export function generatePluginData(input: PluginSettings): PluginGenerated {
  var parsedRgb = parseColorInput(input.colorInput);
  if (!parsedRgb) {
    throw new Error('Could not parse color input. Use #RRGGBB, rgb(), hsl(), or oklch().');
  }

  var normalizedHex = rgbToHex(parsedRgb);
  var primaryOklch = rgbToOklch(parsedRgb);
  var anchorStep = nearestScaleStepForLightness(primaryOklch.l);

  var palette = generateFullPalette(
    primaryOklch,
    input.shadeMode,
    {
      behavior: input.anchorBehavior,
      anchorHex: normalizedHex,
      anchorStep: anchorStep,
    },
    input.neutralMode,
    input.harmonyType,
  );

  var harmony = generateHarmony(primaryOklch, input.harmonyType);
  var n50 = palette.neutral.scale.find(function (s) {
    return s.step === 50;
  });
  var n50Lch = n50 ? n50.lch : { l: 0.97, c: 0.005, h: palette.neutral.base.h };

  var gradients = [
    gradientFromHarmony(harmony),
    gradientFromHarmonyVivid(harmony),
    gradientFromPair(palette.primary.base, n50Lch),
    gradientFromPair(palette.secondary.base, n50Lch),
    gradientFromPair(palette.accent.base, n50Lch),
  ];

  var warnings: PluginWarning[] = [];
  if (input.colorInput.trim().toLowerCase() !== normalizedHex.toLowerCase()) {
    warnings.push({
      code: 'INPUT_NORMALIZED',
      message: 'Input normalized to ' + normalizedHex + '.',
    });
  }

  if (input.anchorBehavior === 'auto-gamut') {
    for (var i = 0; i < palette.primary.scale.length; i++) {
      var stepItem = palette.primary.scale[i];
      if (stepItem.step === anchorStep && stepItem.hex.toLowerCase() !== normalizedHex.toLowerCase()) {
        warnings.push({
          code: 'ANCHOR_HEX_MAPPED',
          message:
            'Auto-gamut remapped primary-' +
            String(anchorStep) +
            ' from ' +
            normalizedHex +
            ' to ' +
            stepItem.hex +
            '.',
        });
        break;
      }
    }
  }

  return {
    request: {
      colorInput: input.colorInput,
      normalizedHex: normalizedHex,
      shadeMode: input.shadeMode,
      harmonyType: input.harmonyType,
      anchorBehavior: input.anchorBehavior,
      neutralMode: input.neutralMode,
      anchorStep: anchorStep,
    },
    warnings: warnings,
    primaryOklch: primaryOklch,
    palette: palette,
    harmony: harmony,
    gradients: gradients,
    usageRows: buildUsageMatrix(palette.primary.scale),
  };
}
