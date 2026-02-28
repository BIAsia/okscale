import { useEffect, useMemo, useState } from 'preact/hooks';
import { DocsPage } from './pages/DocsPage';
import { LandingPage } from './pages/LandingPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { parseColorInput, rgbToHex, rgbToOklch } from './lib/color';
import { suggestGradients } from './lib/gradient';
import { generateHarmony, type HarmonyType } from './lib/harmony';
import { generateFullPalette } from './lib/palette';
import { decodeWorkspaceState, encodeWorkspaceState, type WorkspaceShareState } from './lib/share';
import type { ShadeMode } from './lib/shades';
import { nearestScaleStepForLightness, type AnchorBehavior, type ScaleColor } from './lib/scale';

var WORKSPACE_STATE_STORAGE_KEY = 'okscale.workspace.v1';
var RECENT_COLORS_STORAGE_KEY = 'okscale.recent-colors.v1';

function applyTokens(scale: ScaleColor[], accentHex?: string) {
  if (!scale.length) return;
  var root = document.documentElement;
  scale.forEach(function (item) {
    root.style.setProperty('--ok-primary-' + item.step, item.hex);
  });
  var fallback = scale[Math.min(5, scale.length - 1)];
  root.style.setProperty('--ok-accent', accentHex || (fallback ? fallback.hex : '#000'));
}

function normalizePathname(pathname: string): '/' | '/app' | '/docs' {
  if (pathname === '/app') return '/app';
  if (pathname === '/docs') return '/docs';
  return '/';
}

function fallbackWorkspaceState(): WorkspaceShareState {
  return {
    colorInput: '#d9ff00',
    shadeMode: 'natural',
    harmonyType: 'complementary',
    anchorBehavior: 'preserve-input'
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

    return {
      colorInput: parsed.colorInput,
      shadeMode: parsed.shadeMode,
      harmonyType: parsed.harmonyType,
      anchorBehavior: parsed.anchorBehavior === 'auto-gamut' ? 'auto-gamut' : 'preserve-input'
    };
  } catch (_err) {
    return null;
  }
}

function loadRecentColorsFromStorage(): string[] {
  try {
    var raw = window.localStorage.getItem(RECENT_COLORS_STORAGE_KEY);
    if (!raw) return [];
    var parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(function (value) {
        return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
      })
      .slice(0, 8);
  } catch (_err) {
    return [];
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

  var initialRecentColors = useMemo(function () {
    return loadRecentColorsFromStorage();
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

  var anchorBehaviorState = useState<AnchorBehavior>(initialWorkspace.anchorBehavior);
  var anchorBehavior = anchorBehaviorState[0];
  var setAnchorBehavior = anchorBehaviorState[1];

  var recentColorsState = useState<string[]>(initialRecentColors);
  var recentColors = recentColorsState[0];
  var setRecentColors = recentColorsState[1];

  var parsedRgb = useMemo(function () {
    return parseColorInput(colorInput);
  }, [colorInput]);

  var primaryOklch = useMemo(function () {
    return parsedRgb ? rgbToOklch(parsedRgb) : null;
  }, [parsedRgb]);

  var anchorStep = useMemo(function () {
    return primaryOklch ? nearestScaleStepForLightness(primaryOklch.l) : 500;
  }, [primaryOklch]);

  var palette = useMemo(function () {
    if (!primaryOklch || !parsedRgb) return null;
    return generateFullPalette(primaryOklch, shadeMode, {
      behavior: anchorBehavior,
      anchorHex: rgbToHex(parsedRgb),
      anchorStep: anchorStep
    });
  }, [primaryOklch, parsedRgb, shadeMode, anchorBehavior, anchorStep]);

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
      if (!parsedRgb) return;
      var normalizedHex = rgbToHex(parsedRgb);
      setRecentColors(function (previous) {
        if (previous.length && previous[0] === normalizedHex) return previous;
        var deduped = previous.filter(function (value) {
          return value !== normalizedHex;
        });
        return [normalizedHex].concat(deduped).slice(0, 8);
      });
    },
    [parsedRgb]
  );

  useEffect(
    function () {
      if (!palette || !palette.primary || !palette.primary.scale) return;
      var primaryScale = palette.primary.scale;
      var accentHex = undefined as string | undefined;
      if (anchorBehavior === 'preserve-input' && parsedRgb) {
        accentHex = rgbToHex(parsedRgb);
      } else {
        // find the anchor step color in the scale
        for (var i = 0; i < primaryScale.length; i++) {
          if (primaryScale[i].step === anchorStep) {
            accentHex = primaryScale[i].hex;
            break;
          }
        }
      }
      var frame = window.requestAnimationFrame(function () {
        applyTokens(primaryScale, accentHex);
      });
      return function () {
        window.cancelAnimationFrame(frame);
      };
    },
    [palette, anchorBehavior, anchorStep, parsedRgb]
  );

  useEffect(function () {
    function onPopState() {
      setRoute(normalizePathname(window.location.pathname));
      var fromUrl = decodeWorkspaceState(window.location.search);
      if (fromUrl) {
        setColorInput(fromUrl.colorInput);
        setShadeMode(fromUrl.shadeMode);
        setHarmonyType(fromUrl.harmonyType);
        setAnchorBehavior(fromUrl.anchorBehavior);
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
        harmonyType: harmonyType,
        anchorBehavior: anchorBehavior
      };
      try {
        window.localStorage.setItem(WORKSPACE_STATE_STORAGE_KEY, JSON.stringify(state));
      } catch (_err) {
        // no-op
      }
    },
    [colorInput, shadeMode, harmonyType, anchorBehavior]
  );

  useEffect(
    function () {
      try {
        window.localStorage.setItem(RECENT_COLORS_STORAGE_KEY, JSON.stringify(recentColors));
      } catch (_err) {
        // no-op
      }
    },
    [recentColors]
  );

  useEffect(
    function () {
      if (route !== '/app') return;
      var params = encodeWorkspaceState({
        colorInput: colorInput,
        shadeMode: shadeMode,
        harmonyType: harmonyType,
        anchorBehavior: anchorBehavior
      });
      var current = window.location.pathname + window.location.search;
      var next = '/app?' + params;
      if (current === next) return;
      window.history.replaceState({}, '', next);
    },
    [route, colorInput, shadeMode, harmonyType, anchorBehavior]
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
        anchorBehavior={anchorBehavior}
        anchorStep={anchorStep}
        onAnchorBehaviorChange={setAnchorBehavior}
        recentColors={recentColors}
        onSelectRecentColor={setColorInput}
      />
    );
  }

  if (route === '/docs') {
    return <DocsPage onNavigate={navigate} />;
  }

  return <LandingPage baseHex={colorInput} onNavigate={navigate} palette={palette} />;
}
