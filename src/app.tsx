import { useEffect, useMemo, useState } from 'preact/hooks';
import { DocsPage } from './pages/DocsPage';
import { LandingPage } from './pages/LandingPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { parseColorInput, rgbToOklch } from './lib/color';
import { suggestGradients } from './lib/gradient';
import { generateHarmony, type HarmonyType } from './lib/harmony';
import { generateFullPalette } from './lib/palette';
import { decodeWorkspaceState, encodeWorkspaceState, type WorkspaceShareState } from './lib/share';
import type { ShadeMode } from './lib/shades';
import type { ScaleColor } from './lib/scale';

var WORKSPACE_STATE_STORAGE_KEY = 'okscale.workspace.v1';

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

function fallbackWorkspaceState(): WorkspaceShareState {
  return {
    colorInput: '#3b82f6',
    shadeMode: 'natural',
    harmonyType: 'complementary'
  };
}

function loadWorkspaceStateFromStorage(): WorkspaceShareState | null {
  try {
    var raw = window.localStorage.getItem(WORKSPACE_STATE_STORAGE_KEY);
    if (!raw) return null;
    var parsed = JSON.parse(raw) as WorkspaceShareState;
    if (!parsed || typeof parsed.colorInput !== 'string') return null;
    if (typeof parsed.shadeMode !== 'string') return null;
    if (typeof parsed.harmonyType !== 'string') return null;
    return parsed;
  } catch (_err) {
    return null;
  }
}

function resolveInitialWorkspaceState(): WorkspaceShareState {
  var fromUrl = decodeWorkspaceState(window.location.search);
  if (fromUrl) return fromUrl;
  var fromStorage = loadWorkspaceStateFromStorage();
  if (fromStorage) return fromStorage;
  return fallbackWorkspaceState();
}

export function App() {
  var initialWorkspace = useMemo(function () {
    return resolveInitialWorkspaceState();
  }, []);

  var routeState = useState<'/' | '/app' | '/docs'>(normalizePathname(window.location.pathname));
  var route = routeState[0];
  var setRoute = routeState[1];

  var colorInputState = useState(initialWorkspace.colorInput);
  var colorInput = colorInputState[0];
  var setColorInput = colorInputState[1];

  var shadeModeState = useState<ShadeMode>(initialWorkspace.shadeMode);
  var shadeMode = shadeModeState[0];
  var setShadeMode = shadeModeState[1];

  var harmonyTypeState = useState<HarmonyType>(initialWorkspace.harmonyType);
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
      var fromUrl = decodeWorkspaceState(window.location.search);
      if (fromUrl) {
        setColorInput(fromUrl.colorInput);
        setShadeMode(fromUrl.shadeMode);
        setHarmonyType(fromUrl.harmonyType);
      }
      window.scrollTo({ top: 0 });
    }

    window.addEventListener('popstate', onPopState);
    return function () {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  useEffect(
    function () {
      var state: WorkspaceShareState = {
        colorInput: colorInput,
        shadeMode: shadeMode,
        harmonyType: harmonyType
      };
      try {
        window.localStorage.setItem(WORKSPACE_STATE_STORAGE_KEY, JSON.stringify(state));
      } catch (_err) {
        // no-op
      }
    },
    [colorInput, shadeMode, harmonyType]
  );

  useEffect(
    function () {
      if (route !== '/app') return;
      var params = encodeWorkspaceState({
        colorInput: colorInput,
        shadeMode: shadeMode,
        harmonyType: harmonyType
      });
      var current = window.location.pathname + window.location.search;
      var next = '/app?' + params;
      if (current === next) return;
      window.history.replaceState({}, '', next);
    },
    [route, colorInput, shadeMode, harmonyType]
  );

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
