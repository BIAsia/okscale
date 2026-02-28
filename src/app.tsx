import { useEffect, useMemo, useState } from 'preact/hooks';
import { DocsPage } from './pages/DocsPage';
import { LandingPage } from './pages/LandingPage';
import { WorkspacePage } from './pages/WorkspacePage';
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

function normalizePathname(pathname: string): '/' | '/app' | '/docs' {
  if (pathname === '/app') return '/app';
  if (pathname === '/docs') return '/docs';
  return '/';
}

export function App() {
  var routeState = useState<'/' | '/app' | '/docs'>(normalizePathname(window.location.pathname));
  var route = routeState[0];
  var setRoute = routeState[1];

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
    function onPopState() {
      setRoute(normalizePathname(window.location.pathname));
      window.scrollTo({ top: 0 });
    }

    window.addEventListener('popstate', onPopState);
    return function () {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  function navigate(to: string) {
    var next = normalizePathname(to);
    if (next !== normalizePathname(window.location.pathname)) {
      window.history.pushState({}, '', next);
    }
    setRoute(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  useEffect(
    function () {
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
        section.classList.remove('visible');
        observer.observe(section);
      });

      return function () {
        sections.forEach(function (section) {
          observer.unobserve(section);
        });
        observer.disconnect();
      };
    },
    [route, palette]
  );

  var colorError = parsedRgb
    ? ''
    : 'Color format not recognized. Try #3b82f6, rgb(59,130,246), hsl(217,91%,60%), or oklch(0.62 0.19 259).';

  if (route === '/app') {
    return (
      <WorkspacePage
        onNavigate={navigate}
        palette={palette}
        colorInput={colorInput}
        colorError={colorError}
        primaryOklch={primaryOklch}
        harmony={harmony}
        gradients={gradients}
        shadeMode={shadeMode}
        harmonyType={harmonyType}
        onColorChange={setColorInput}
        onShadeModeChange={setShadeMode}
        onHarmonyTypeChange={setHarmonyType}
      />
    );
  }

  if (route === '/docs') {
    return <DocsPage onNavigate={navigate} />;
  }

  return <LandingPage baseHex={colorInput} onNavigate={navigate} />;
}
