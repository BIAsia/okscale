import { useMemo, useState } from 'preact/hooks';
import { ColorInput } from './components/ColorInput';
import { ContrastCheck } from './components/ContrastCheck';
import { ExportPanel } from './components/ExportPanel';
import { PaletteManager, type PaletteItem } from './components/PaletteManager';
import { ScalePreview } from './components/ScalePreview';
import { parseColorInput, rgbToHex, rgbToOklch } from './lib/color';
import { paletteToCss } from './lib/export';
import { generateScale } from './lib/scale';

var DEFAULT_PALETTES: PaletteItem[] = [
  { id: 'primary', name: 'primary', color: '#3b82f6' },
  { id: 'secondary', name: 'secondary', color: '#10b981' },
  { id: 'neutral', name: 'neutral', color: '#64748b' },
  { id: 'accent', name: 'accent', color: '#f97316' }
];

export function App() {
  var _a = useState(DEFAULT_PALETTES), palettes = _a[0], setPalettes = _a[1];
  var _b = useState('primary'), activePaletteId = _b[0], setActivePaletteId = _b[1];

  var activePalette = palettes.find(function (palette) {
    return palette.id === activePaletteId;
  }) || palettes[0];

  var parsed = parseColorInput(activePalette.color);
  var previewHex = parsed ? rgbToHex(parsed) : '#3b82f6';
  var error = parsed ? '' : 'Color format not recognized. Try #3b82f6, rgb(59,130,246), hsl(217,91%,60%), or oklch(0.62 0.19 259).';

  var scale = useMemo(function () {
    var sourceRgb = parsed || parseColorInput('#3b82f6');
    return generateScale(rgbToOklch(sourceRgb!));
  }, [previewHex]);

  var cssText = useMemo(function () {
    return paletteToCss(activePalette.name || 'palette', scale);
  }, [activePalette.name, scale]);

  function updateActiveColor(value: string) {
    setPalettes(
      palettes.map(function (palette) {
        if (palette.id !== activePaletteId) return palette;
        return Object.assign({}, palette, { color: value });
      })
    );
  }

  function renamePalette(id: string, name: string) {
    setPalettes(
      palettes.map(function (palette) {
        if (palette.id !== id) return palette;
        return Object.assign({}, palette, { name: name || 'palette' });
      })
    );
  }

  function addPalette() {
    var id = 'palette-' + Date.now();
    var next = palettes.concat([{ id: id, name: 'palette', color: '#7c3aed' }]);
    setPalettes(next);
    setActivePaletteId(id);
  }

  function removePalette(id: string) {
    var next = palettes.filter(function (palette) {
      return palette.id !== id;
    });
    if (next.length === 0) return;
    setPalettes(next);
    if (activePaletteId === id) {
      setActivePaletteId(next[0].id);
    }
  }

  return (
    <main class="app-shell">
      <header class="hero">
        <h1>OKScale</h1>
        <p>Oklch design token generator for smooth, perceptually uniform color ramps.</p>
      </header>

      <div class="layout">
        <div class="left-col">
          <PaletteManager
            palettes={palettes}
            activePaletteId={activePaletteId}
            onSelect={setActivePaletteId}
            onRename={renamePalette}
            onAdd={addPalette}
            onRemove={removePalette}
          />
          <ColorInput value={activePalette.color} onChange={updateActiveColor} previewHex={previewHex} error={error} />
          <ExportPanel cssText={cssText} />
        </div>
        <div class="right-col">
          <ScalePreview scale={scale} />
          <ContrastCheck scale={scale} />
        </div>
      </div>
    </main>
  );
}
