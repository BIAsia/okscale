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
  if (!scale.length) return;
  var root = document.documentElement;
  scale.forEach(function (item) {
    root.style.setProperty('--ok-primary-' + item.step, item.hex);
  });
  var accent = scale[Math.min(5, scale.length - 1)];
  if (accent) {
    root.style.setProperty('--ok-accent', accent.hex);
  }
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
      if (!palette || !palette.primary || !palette.primary.scale) return;
      var primaryScale = palette.primary.scale;
      var frame = window.requestAnimationFrame(function () {
        applyTokens(primaryScale);
      });
      return function () {
        window.cancelAnimationFrame(frame);
      };
    },
    [palette]
  );

  useEffect(function () {
    var sections = document.querySelectorAll('.section');
    if (!('IntersectionObserver' in window)) {
      sections.forEach(function (section) {
        section.classList.add('visible');
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });

    return function () {
      sections.forEach(function (section) {
        observer.unobserve(section);
      });
      observer.disconnect();
    };
  }, []);

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
