import type { FullPalette, PaletteRole } from './palette';
import type { ScaleColor } from './scale';

function slug(name: string): string {
  var key = name.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return key || 'palette';
}

export var NAMING_PRESETS = ['numeric', 'semantic'] as const;
export type NamingPreset = (typeof NAMING_PRESETS)[number];

var SEMANTIC_STEP_NAMES: Record<number, string> = {
  50: 'bg-soft',
  100: 'bg',
  200: 'surface',
  300: 'border-soft',
  400: 'border',
  500: 'base',
  600: 'strong',
  700: 'stronger',
  800: 'text-soft',
  900: 'text',
  950: 'text-strong'
};

function tokenName(step: number, namingPreset: NamingPreset): string {
  if (namingPreset === 'semantic') {
    return SEMANTIC_STEP_NAMES[step] || String(step);
  }
  return String(step);
}

function toScaleMap(scale: ScaleColor[], namingPreset: NamingPreset): Record<string, string> {
  var map: Record<string, string> = {};
  scale.forEach(function (item) {
    map[tokenName(item.step, namingPreset)] = item.hex;
  });
  return map;
}

var PALETTE_ROLES: PaletteRole[] = ['primary', 'secondary', 'accent', 'neutral'];

function roleScale(palette: FullPalette, role: PaletteRole): ScaleColor[] {
  return palette[role].scale;
}

export function paletteToCss(name: string, scale: ScaleColor[], namingPreset: NamingPreset = 'numeric'): string {
  var key = slug(name);
  var lines = [':root {'];
  scale.forEach(function (item) {
    lines.push('  --' + key + '-' + tokenName(item.step, namingPreset) + ': ' + item.hex + ';');
  });
  lines.push('}');
  return lines.join('\n');
}

export function paletteToTailwind(name: string, scale: ScaleColor[], namingPreset: NamingPreset = 'numeric'): string {
  var key = slug(name);
  var lines = ['export default {', '  theme: {', '    extend: {', '      colors: {', '        ' + key + ': {'];
  scale.forEach(function (item) {
    lines.push("          '" + tokenName(item.step, namingPreset) + "': '" + item.hex + "',");
  });
  lines.push('        }', '      }', '    }', '  }', '};');
  return lines.join('\n');
}

export function paletteToScss(name: string, scale: ScaleColor[], namingPreset: NamingPreset = 'numeric'): string {
  var key = slug(name);
  var lines = ['$' + key + ': ('];
  scale.forEach(function (item, index) {
    var comma = index === scale.length - 1 ? '' : ',';
    lines.push('  ' + tokenName(item.step, namingPreset) + ': ' + item.hex + comma);
  });
  lines.push(');');
  return lines.join('\n');
}

export function paletteToDesignTokens(name: string, scale: ScaleColor[], namingPreset: NamingPreset = 'numeric'): string {
  var key = slug(name);
  var tokens: Record<string, { value: string; type: string }> = {};
  scale.forEach(function (item) {
    tokens[tokenName(item.step, namingPreset)] = { value: item.hex, type: 'color' };
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

function hexToFigmaColor(hex: string): { r: number; g: number; b: number; a: number } {
  var clean = hex.replace(/^#/, '');
  var val = parseInt(clean, 16);
  return {
    r: Math.round((((val >> 16) & 255) / 255) * 1000) / 1000,
    g: Math.round((((val >> 8) & 255) / 255) * 1000) / 1000,
    b: Math.round(((val & 255) / 255) * 1000) / 1000,
    a: 1
  };
}

export function paletteToFigmaVariables(name: string, scale: ScaleColor[], namingPreset: NamingPreset = 'numeric'): string {
  var key = slug(name);
  var variables: Array<{
    name: string;
    type: string;
    valuesByMode: Record<string, { r: number; g: number; b: number; a: number }>;
  }> = [];
  scale.forEach(function (item) {
    variables.push({
      name: key + '/' + tokenName(item.step, namingPreset),
      type: 'COLOR',
      valuesByMode: {
        Light: hexToFigmaColor(item.hex)
      }
    });
  });
  var payload = {
    collections: [
      {
        name: 'OKScale',
        modes: ['Light'],
        variables: variables
      }
    ]
  };
  return JSON.stringify(payload, null, 2);
}

export function fullPaletteToCss(palette: FullPalette, namingPreset: NamingPreset = 'numeric'): string {
  var lines = [':root {'];
  PALETTE_ROLES.forEach(function (role, roleIndex) {
    var scale = roleScale(palette, role);
    scale.forEach(function (item) {
      lines.push('  --' + role + '-' + tokenName(item.step, namingPreset) + ': ' + item.hex + ';');
    });
    if (roleIndex < PALETTE_ROLES.length - 1) {
      lines.push('');
    }
  });
  lines.push('}');
  return lines.join('\n');
}

export function fullPaletteToTailwind(palette: FullPalette, namingPreset: NamingPreset = 'numeric'): string {
  var lines = ['export default {', '  theme: {', '    extend: {', '      colors: {'];

  PALETTE_ROLES.forEach(function (role, roleIndex) {
    lines.push('        ' + role + ': {');
    roleScale(palette, role).forEach(function (item) {
      lines.push("          '" + tokenName(item.step, namingPreset) + "': '" + item.hex + "',");
    });
    lines.push(roleIndex === PALETTE_ROLES.length - 1 ? '        }' : '        },');
  });

  lines.push('      }', '    }', '  }', '};');
  return lines.join('\n');
}

export function fullPaletteToScss(palette: FullPalette, namingPreset: NamingPreset = 'numeric'): string {
  var lines: string[] = [];
  PALETTE_ROLES.forEach(function (role, roleIndex) {
    lines.push('$' + role + ': (');
    var scale = roleScale(palette, role);
    scale.forEach(function (item, index) {
      var comma = index === scale.length - 1 ? '' : ',';
      lines.push('  ' + tokenName(item.step, namingPreset) + ': ' + item.hex + comma);
    });
    lines.push(');');
    if (roleIndex < PALETTE_ROLES.length - 1) {
      lines.push('');
    }
  });
  return lines.join('\n');
}

export function fullPaletteToDesignTokens(palette: FullPalette, namingPreset: NamingPreset = 'numeric'): string {
  var payload: Record<string, Record<string, { value: string; type: string }>> = {};
  PALETTE_ROLES.forEach(function (role) {
    var tokens: Record<string, { value: string; type: string }> = {};
    roleScale(palette, role).forEach(function (item) {
      tokens[tokenName(item.step, namingPreset)] = { value: item.hex, type: 'color' };
    });
    payload[role] = tokens;
  });

  return JSON.stringify(
    Object.assign(
      {
        $schema: 'https://tr.designtokens.org/format/'
      },
      payload
    ),
    null,
    2
  );
}

export function fullPaletteToFigmaVariables(palette: FullPalette, namingPreset: NamingPreset = 'numeric'): string {
  var variables: Array<{
    name: string;
    type: string;
    valuesByMode: Record<string, { r: number; g: number; b: number; a: number }>;
  }> = [];

  PALETTE_ROLES.forEach(function (role) {
    roleScale(palette, role).forEach(function (item) {
      variables.push({
        name: role + '/' + tokenName(item.step, namingPreset),
        type: 'COLOR',
        valuesByMode: {
          Light: hexToFigmaColor(item.hex)
        }
      });
    });
  });

  return JSON.stringify(
    {
      collections: [
        {
          name: 'OKScale',
          modes: ['Light'],
          variables: variables
        }
      ]
    },
    null,
    2
  );
}

export var EXPORT_FORMATS = ['css', 'tailwind', 'tokens', 'figma', 'scss'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export function formatExport(
  format: ExportFormat,
  name: string,
  scale: ScaleColor[],
  namingPreset: NamingPreset = 'numeric'
): string {
  if (format === 'tailwind') return paletteToTailwind(name, scale, namingPreset);
  if (format === 'tokens') return paletteToDesignTokens(name, scale, namingPreset);
  if (format === 'figma') return paletteToFigmaVariables(name, scale, namingPreset);
  if (format === 'scss') return paletteToScss(name, scale, namingPreset);
  return paletteToCss(name, scale, namingPreset);
}

export function formatFullExport(
  format: ExportFormat,
  palette: FullPalette,
  namingPreset: NamingPreset = 'numeric'
): string {
  if (format === 'tailwind') return fullPaletteToTailwind(palette, namingPreset);
  if (format === 'tokens') return fullPaletteToDesignTokens(palette, namingPreset);
  if (format === 'figma') return fullPaletteToFigmaVariables(palette, namingPreset);
  if (format === 'scss') return fullPaletteToScss(palette, namingPreset);
  return fullPaletteToCss(palette, namingPreset);
}
