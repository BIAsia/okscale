import { useEffect, useMemo, useState } from 'preact/hooks';
import { ExportSection } from './components/ExportSection';
import { Footer } from './components/Footer';
import { Generator, type PaletteItem } from './components/Generator';
import { Hero } from './components/Hero';
import { HowItWorks } from './components/HowItWorks';
import { Nav } from './components/Nav';
import { WhyOklch } from './components/WhyOklch';
import { parseColorInput, rgbToHex, rgbToOklch } from './lib/color';
import { generateScale } from './lib/scale';

var DEFAULT_PALETTES: PaletteItem[] = [
  { id: 'primary', name: 'primary', color: '#3b82f6' },
  { id: 'secondary', name: 'secondary', color: '#10b981' },
  { id: 'neutral', name: 'neutral', color: '#64748b' },
  { id: 'accent', name: 'accent', color: '#f97316' }
];

function applyTokens(scale: ReturnType<typeof generateScale>) {
  var root = document.documentElement;
  scale.forEach(function (item) {
    root.style.setProperty('--ok-primary-' + item.step, item.hex);
  });
  root.style.setProperty('--ok-accent', scale[5].hex);
}

export function App() {
  var paletteState = useState(DEFAULT_PALETTES);
  var palettes = paletteState[0];
  var setPalettes = paletteState[1];
  var activeState = useState('primary');
  var activePaletteId = activeState[0];
  var setActivePaletteId = activeState[1];

  var activePalette =
    palettes.find(function (palette) {
      return palette.id === activePaletteId;
    }) || palettes[0];

  var parsed = parseColorInput(activePalette.color);
  var previewHex = parsed ? rgbToHex(parsed) : '#3b82f6';

  var scale = useMemo(function () {
    var sourceRgb = parsed || parseColorInput('#3b82f6');
    return generateScale(rgbToOklch(sourceRgb!));
  }, [previewHex]);

  useEffect(
    function () {
      applyTokens(scale);
    },
    [scale]
  );

  function renamePalette(id: string, name: string) {
    setPalettes(
      palettes.map(function (palette) {
        if (palette.id !== id) return palette;
        return Object.assign({}, palette, { name: name || 'palette' });
      })
    );
  }

  function updateColor(value: string) {
    setPalettes(
      palettes.map(function (palette) {
        if (palette.id !== activePaletteId) return palette;
        return Object.assign({}, palette, { color: value });
      })
    );
  }

  function addPalette() {
    var id = 'palette-' + Date.now();
    setPalettes(palettes.concat([{ id: id, name: 'palette', color: '#7c3aed' }]));
    setActivePaletteId(id);
  }

  function removePalette(id: string) {
    var next = palettes.filter(function (palette) {
      return palette.id !== id;
    });
    if (!next.length) return;
    setPalettes(next);
    if (activePaletteId === id) setActivePaletteId(next[0].id);
  }

  var colorError = parsed
    ? ''
    : 'Color format not recognized. Try #3b82f6, rgb(59,130,246), hsl(217,91%,60%), or oklch(0.62 0.19 259).';

  return (
    <div class="page-wrap">
      <Nav />
      <div id="hero">
        <Hero />
      </div>
      <WhyOklch baseHex={previewHex} />
      <div id="generator">
        <Generator
          palettes={palettes}
          activePaletteId={activePaletteId}
          activeHex={activePalette.color}
          colorError={colorError}
          scale={scale}
          onSelect={setActivePaletteId}
          onRename={renamePalette}
          onColorChange={updateColor}
          onAdd={addPalette}
          onRemove={removePalette}
        />
      </div>
      <div id="export">
        <ExportSection paletteName={activePalette.name || 'palette'} scale={scale} />
      </div>
      <HowItWorks />
      <Footer />
    </div>
  );
}
