import type { ScaleColor } from './scale';

export type ContrastUsageRow = {
  label: string;
  textStep: number;
  backgroundStep: number;
  ratio: number;
  minimum: number;
  pass: boolean;
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  var clean = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  var value = parseInt(clean, 16);
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255
  };
}

function linear(v: number): number {
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function contrastRatio(textHex: string, backgroundHex: string): number {
  var text = hexToRgb(textHex);
  var background = hexToRgb(backgroundHex);
  if (!text || !background) return 0;

  var textL = 0.2126 * linear(text.r) + 0.7152 * linear(text.g) + 0.0722 * linear(text.b);
  var bgL = 0.2126 * linear(background.r) + 0.7152 * linear(background.g) + 0.0722 * linear(background.b);
  var light = Math.max(textL, bgL);
  var dark = Math.min(textL, bgL);
  return (light + 0.05) / (dark + 0.05);
}

export function ratioGrade(ratio: number): string {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA Large';
  return 'Fail';
}

function stepHexMap(scale: ScaleColor[]): Record<number, string> {
  var map: Record<number, string> = {};
  scale.forEach(function (item) {
    map[item.step] = item.hex;
  });
  return map;
}

function bestPair(
  label: string,
  minimum: number,
  textCandidates: number[],
  backgroundCandidates: number[],
  hexByStep: Record<number, string>
): ContrastUsageRow | null {
  var best: ContrastUsageRow | null = null;

  backgroundCandidates.forEach(function (backgroundStep) {
    var backgroundHex = hexByStep[backgroundStep];
    if (!backgroundHex) return;

    textCandidates.forEach(function (textStep) {
      var textHex = hexByStep[textStep];
      if (!textHex) return;

      var ratio = contrastRatio(textHex, backgroundHex);
      var candidate: ContrastUsageRow = {
        label: label,
        textStep: textStep,
        backgroundStep: backgroundStep,
        ratio: ratio,
        minimum: minimum,
        pass: ratio >= minimum
      };

      if (!best) {
        best = candidate;
        return;
      }

      if (candidate.pass && !best.pass) {
        best = candidate;
        return;
      }

      if (candidate.pass === best.pass && candidate.ratio > best.ratio) {
        best = candidate;
      }
    });
  });

  return best;
}

export function buildUsageMatrix(primaryScale: ScaleColor[]): ContrastUsageRow[] {
  var hexByStep = stepHexMap(primaryScale);
  var rows: ContrastUsageRow[] = [];

  var bodyLight = bestPair(
    'Body text on light surfaces',
    4.5,
    [950, 900, 800, 700],
    [50, 100, 200],
    hexByStep
  );
  if (bodyLight) rows.push(bodyLight);

  var bodyBrand = bestPair(
    'Body text on brand surfaces',
    4.5,
    [50, 100, 900, 950],
    [500, 600, 700],
    hexByStep
  );
  if (bodyBrand) rows.push(bodyBrand);

  var largeBrand = bestPair(
    'Large headlines on brand surfaces',
    3,
    [50, 100, 900, 950],
    [400, 500, 600],
    hexByStep
  );
  if (largeBrand) rows.push(largeBrand);

  var subtleText = bestPair(
    'Subtle text on tinted surfaces',
    4.5,
    [700, 800, 900],
    [100, 200, 300],
    hexByStep
  );
  if (subtleText) rows.push(subtleText);

  return rows;
}
