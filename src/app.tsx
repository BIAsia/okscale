import { useEffect, useMemo, useState } from 'preact/hooks';
import { ExportSection } from './components/ExportSection';
import { Footer } from './components/Footer';
import { Generator } from './components/Generator';
import { Hero } from './components/Hero';
import { HowItWorks } from './components/HowItWorks';
import { Nav } from './components/Nav';
import { WhyOklch } from './components/WhyOklch';
import { parseColorInput, rgbToOklch } from './lib/color';
import { suggestGradients } from './lib/gradient';
import { generateHarmony, type HarmonyType } from './lib/harmony';
import { generateFullPalette } from './lib/palette';
import type { ShadeMode } from './lib/shades';
import type { ScaleColor } from './lib/scale';

function applyTokens(scale: ScaleColor[]) {
  var root = document.documentElement;
  scale.forEach(function (item) {
    root.style.setProperty('--ok-primary-' + item.step, item.hex);
  });
  root.style.setProperty('--ok-accent', scale[5].hex);
}

export function App() {
  var colorInputState = useState('#3b82f6');
  var colorInput = colorInputState[0];
  var setColorInput = colorInputState[1];

  var shadeModeState = useState<ShadeMode>('natural');
  var shadeMode = shadeModeState[0];
  var setShadeMode = shadeModeState[1];

  var harmonyTypeState = useState<HarmonyType>('complementary');
  var harmonyType = harmonyTypeState[0];
  var setHarmonyType = harmonyTypeState[1];

  var parsedRgb = useMemo(function () {
    return parseColorInput(colorInput);
  }, [colorInput]);

  var primaryOklch = useMemo(function () {
    return parsedRgb ? rgbToOklch(parsedRgb) : null;
  }, [parsedRgb]);

  var palette = useMemo(function () {
    if (!primaryOklch) return null;
    return generateFullPalette(primaryOklch, shadeMode);
  }, [primaryOklch, shadeMode]);

  var harmony = useMemo(function () {
    if (!primaryOklch) return null;
    return generateHarmony(primaryOklch, harmonyType);
  }, [primaryOklch, harmonyType]);

  var gradients = useMemo(function () {
    if (!primaryOklch) return [];
    return suggestGradients(primaryOklch);
  }, [primaryOklch]);

  useEffect(
    function () {
      if (!palette) return;
      applyTokens(palette.primary.scale);
    },
    [palette]
  );

  var colorError = parsedRgb
    ? ''
    : 'Color format not recognized. Try #3b82f6, rgb(59,130,246), hsl(217,91%,60%), or oklch(0.62 0.19 259).';

  return (
    <div class="page-wrap">
      <Nav />
      <div id="hero">
        <Hero />
      </div>
      <WhyOklch baseHex={colorInput} />
      <div id="generator">
        <Generator
          colorInput={colorInput}
          colorError={colorError}
          primaryOklch={primaryOklch}
          palette={palette}
          harmony={harmony}
          gradients={gradients}
          shadeMode={shadeMode}
          harmonyType={harmonyType}
          onColorChange={setColorInput}
          onShadeModeChange={setShadeMode}
          onHarmonyTypeChange={setHarmonyType}
        />
      </div>
      <div id="export">
        <ExportSection palette={palette} />
      </div>
      <HowItWorks />
      <Footer />
    </div>
  );
}
