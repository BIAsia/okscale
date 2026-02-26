import type { ScaleColor } from './scale';

function slug(name: string): string {
  var key = name.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return key || 'palette';
}

function toScaleMap(scale: ScaleColor[]): Record<string, string> {
  var map: Record<string, string> = {};
  scale.forEach(function (item) {
    map[String(item.step)] = item.hex;
  });
  return map;
}

export function paletteToCss(name: string, scale: ScaleColor[]): string {
  var key = slug(name);
  var lines = [':root {'];
  scale.forEach(function (item) {
    lines.push('  --' + key + '-' + item.step + ': ' + item.hex + ';');
  });
  lines.push('}');
  return lines.join('\n');
}

export function paletteToTailwind(name: string, scale: ScaleColor[]): string {
  var key = slug(name);
  var lines = ['export default {', '  theme: {', '    extend: {', '      colors: {', '        ' + key + ': {'];
  scale.forEach(function (item) {
    lines.push("          '" + item.step + "': '" + item.hex + "',");
  });
  lines.push('        }', '      }', '    }', '  }', '};');
  return lines.join('\n');
}

export function paletteToScss(name: string, scale: ScaleColor[]): string {
  var key = slug(name);
  var lines = ['$' + key + ': ('];
  scale.forEach(function (item, index) {
    var comma = index === scale.length - 1 ? '' : ',';
    lines.push('  ' + item.step + ': ' + item.hex + comma);
  });
  lines.push(');');
  return lines.join('\n');
}

export function paletteToDesignTokens(name: string, scale: ScaleColor[]): string {
  var key = slug(name);
  var tokens: Record<string, { value: string; type: string }> = {};
  scale.forEach(function (item) {
    tokens[item.step] = { value: item.hex, type: 'color' };
  });

  return JSON.stringify(
    {
      $schema: 'https://tr.designtokens.org/format/',
      [key]: tokens
    },
    null,
    2
  );
}

export function paletteToFigmaVariables(name: string, scale: ScaleColor[]): string {
  var key = slug(name);
  var valuesByMode = toScaleMap(scale);
  var payload = {
    collections: [
      {
        name: 'OKScale',
        modes: ['Light'],
        variables: [
          {
            name: key,
            type: 'COLOR',
            valuesByMode: {
              Light: valuesByMode
            }
          }
        ]
      }
    ]
  };
  return JSON.stringify(payload, null, 2);
}

export var EXPORT_FORMATS = ['css', 'tailwind', 'tokens', 'figma', 'scss'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export function formatExport(format: ExportFormat, name: string, scale: ScaleColor[]): string {
  if (format === 'tailwind') return paletteToTailwind(name, scale);
  if (format === 'tokens') return paletteToDesignTokens(name, scale);
  if (format === 'figma') return paletteToFigmaVariables(name, scale);
  if (format === 'scss') return paletteToScss(name, scale);
  return paletteToCss(name, scale);
}
