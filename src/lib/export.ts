import type { ScaleColor } from './scale';

export function paletteToCss(name: string, scale: ScaleColor[]): string {
  var key = name.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'palette';
  var lines = [':root {'];

  scale.forEach(function (item) {
    lines.push('  --' + key + '-' + item.step + ': ' + item.hex + ';');
  });

  lines.push('}');
  return lines.join('\n');
}
