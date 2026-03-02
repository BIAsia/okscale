import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { DocsPage } from './pages/DocsPage';
import { LandingPage } from './pages/LandingPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { parseColorInput, rgbToHex, rgbToOklch } from './lib/color';
import { contrastRatio } from './lib/contrast';
import { gradientFromHarmony, gradientFromHarmonyVivid, gradientFromPair } from './lib/gradient';
import { generateHarmony, type HarmonyType } from './lib/harmony';
import { generateFullPalette, type FullPalette, type NeutralMode } from './lib/palette';
import { decodeWorkspaceState, encodeWorkspaceState, type WorkspaceShareState } from './lib/share';
import type { ShadeMode } from './lib/shades';
import { nearestScaleStepForLightness, type AnchorBehavior, type ScaleColor } from './lib/scale';

/* ── Splash screen ── */

function SplashScreen(props: { exiting: boolean; onDone: () => void }) {
  useEffect(
    function () {
      if (!props.exiting) return;
      var t = setTimeout(props.onDone, 650);
      return function () { clearTimeout(t); };
    },
    [props.exiting]
  );

  return (
    <div class={'splash-screen' + (props.exiting ? ' splash-screen--exit' : '')}>
      <span class="splash-text">OK-Scale</span>
    </div>
  );
}

var WORKSPACE_STATE_STORAGE_KEY = 'okscale.workspace.v1';
var RECENT_COLORS_STORAGE_KEY = 'okscale.recent-colors.v1';

function applyAllTokens(palette: FullPalette, accentHex?: string) {
  var root = document.documentElement;
  var roles = ['primary', 'secondary', 'accent', 'neutral'] as const;

  // Write all 4 palette scales as CSS variables
  for (var r = 0; r < roles.length; r++) {
    var role = roles[r];
    var entry = palette[role];
    if (!entry || !entry.scale) continue;
    for (var s = 0; s < entry.scale.length; s++) {
      var item = entry.scale[s];
      root.style.setProperty('--ok-' + role + '-' + item.step, item.hex);
    }
  }

  // Set accent highlight (primary highlight color)
  var primaryScale = palette.primary.scale;
  var fallback = primaryScale[Math.min(5, primaryScale.length - 1)];
  var highlight = accentHex || (fallback ? fallback.hex : '#000');
  root.style.setProperty('--ok-highlight', highlight);

  // --ok-highlight-fg: best contrast foreground for text ON highlight background
  var bestFg = '#000';
  var bestRatio = 0;
  for (var i = 0; i < primaryScale.length; i++) {
    var ratio = contrastRatio(primaryScale[i].hex, highlight);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestFg = primaryScale[i].hex;
    }
  }
  root.style.setProperty('--ok-highlight-fg', bestFg);

  // --ok-highlight-text: readable highlight for text on neutral backgrounds
  // Use neutral-50 as reference background
  var neutralScale = palette.neutral.scale;
  var neutralBg = neutralScale.length > 0 ? neutralScale[0].hex : '#f5f5f5';
  var bestOnNeutral = highlight;
  var bestOnNeutralRatio = contrastRatio(highlight, neutralBg);
  // If highlight itself has enough contrast (>= 4.5:1), prefer it
  if (bestOnNeutralRatio < 4.5) {
    // Find the primary step with best contrast against neutral bg
    for (var j = 0; j < primaryScale.length; j++) {
      var cr = contrastRatio(primaryScale[j].hex, neutralBg);
      if (cr > bestOnNeutralRatio) {
        bestOnNeutralRatio = cr;
        bestOnNeutral = primaryScale[j].hex;
      }
    }
  }
  root.style.setProperty('--ok-highlight-text', bestOnNeutral);

  // --ok-secondary-text: readable secondary color for chips/checkbox on neutral bg
  var secondaryScale = palette.secondary.scale;
  var secBase = palette.secondary.baseHex;
  var bestSecText = secBase;
  var bestSecRatio = contrastRatio(secBase, neutralBg);
  if (bestSecRatio < 4.5) {
    for (var k = 0; k < secondaryScale.length; k++) {
      var sr = contrastRatio(secondaryScale[k].hex, neutralBg);
      if (sr > bestSecRatio) {
        bestSecRatio = sr;
        bestSecText = secondaryScale[k].hex;
      }
    }
  }
  root.style.setProperty('--ok-secondary-text', bestSecText);
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
;
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

  var splashState = useState(true);
  var splashVisible = splashState[0];
  var setSplashVisible = splashState[1];

  var splashExitingState = useState(false);
  var splashExiting = splashExitingState[0];
  var setSplashExiting = splashExitingState[1];

  // Trigger exit after 900ms, then unmount after transition (650ms)
  useEffect(function () {
    var t1 = setTimeout(function () { setSplashExiting(true); }, 900);
    return function () { clearTimeout(t1); };
  }, []);

  function handleSplashDone() {
    setSplashVisible(false);
  }

  var routeState = useState<'/' | '/app' | '/docs'>(normalizePathname(window.location.pathname));
  var route = routeState[0];
  var setRoute = routeState[1];

  var colorInputState = useState(initialWorkspace.colorInput);
  var colorInput = colorInputState[0];
  var setColorInput = colorInputState[1];

  var neutralModeState = useState<NeutralMode>('keep-hue');
  var neutralMode = neutralModeState[0];
  var setNeutralMode = neutralModeState[1];

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
    }, neutralMode, harmonyType);
  }, [primaryOklch, parsedRgb, shadeMode, anchorBehavior, anchorStep, neutralMode, harmonyType]);

  var harmony = useMemo(function () {
    if (!primaryOklch) return null;
    return generateHarmony(primaryOklch, harmonyType);
  }, [primaryOklch, harmonyType]);

  var gradients = useMemo(function () {
    if (!harmony || !palette) return [];
    var n50 = palette.neutral.scale.find(function (s) { return s.step === 50; });
    var n50Lch = n50 ? n50.lch : { l: 0.97, c: 0.005, h: palette.neutral.base.h };
    return [
      gradientFromHarmony(harmony),
      gradientFromHarmonyVivid(harmony),
      gradientFromPair(palette.primary.base, n50Lch),
      gradientFromPair(palette.secondary.base, n50Lch),
      gradientFromPair(palette.accent.base, n50Lch)
    ];
  }, [harmony, palette]);

  // Debounce timer ref — we only write to history 800 ms after the last color change
  var historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    function () {
      if (!parsedRgb) return;
      var normalizedHex = rgbToHex(parsedRgb);
      if (historyTimerRef.current !== null) {
        clearTimeout(historyTimerRef.current);
      }
      historyTimerRef.current = setTimeout(function () {
        historyTimerRef.current = null;
        setRecentColors(function (previous) {
          if (previous.length && previous[0] === normalizedHex) return previous;
          var deduped = previous.filter(function (value) {
            return value !== normalizedHex;
          });
          return [normalizedHex].concat(deduped);
        });
      }, 800);
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
      var paletteRef = palette;
      var frame = window.requestAnimationFrame(function () {
        applyAllTokens(paletteRef, accentHex);
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
      <>
        {splashVisible && <SplashScreen exiting={splashExiting} onDone={handleSplashDone} />}
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
          onRemoveRecentColor={function (hex) {
            setRecentColors(function (prev) {
              return prev.filter(function (c) { return c !== hex; });
            });
          }}
          onClearHistory={function () { setRecentColors([]); }}
          neutralMode={neutralMode}
          onNeutralModeChange={setNeutralMode}
        />
      </>
    );
  }

  if (route === '/docs') {
    return (
      <>
        {splashVisible && <SplashScreen exiting={splashExiting} onDone={handleSplashDone} />}
        <DocsPage onNavigate={navigate} />
      </>
    );
  }

  return (
    <>
      {splashVisible && <SplashScreen exiting={splashExiting} onDone={handleSplashDone} />}
      <LandingPage baseHex={colorInput} onNavigate={navigate} palette={palette} />
    </>
  );
}
