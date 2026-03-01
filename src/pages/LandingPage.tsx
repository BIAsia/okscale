import { useEffect, useRef, useState } from 'preact/hooks';
import { animate, stagger } from 'motion';
import { contrastRatio } from '../lib/contrast';
import type { FullPalette, PaletteEntry, PaletteRole } from '../lib/palette';
import type { ScaleColor } from '../lib/scale';

type LandingPageProps = {
  baseHex: string;
  onNavigate: (to: string) => void;
  palette: FullPalette | null;
};

var ROLES: PaletteRole[] = ['primary', 'secondary', 'accent', 'neutral'];
var ROLE_LABELS: Record<PaletteRole, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  accent: 'Accent',
  neutral: 'Neutral'
};

/* Pick best contrast text color from a scale against a given background */
function bestContrastColor(scale: ScaleColor[], bgHex: string): string {
  if (!scale.length) return '#000';
  var best = scale[0].hex;
  var bestR = 0;
  for (var i = 0; i < scale.length; i++) {
    var r = contrastRatio(scale[i].hex, bgHex);
    if (r > bestR) {
      bestR = r;
      best = scale[i].hex;
    }
  }
  return best;
}

/* Get step hex by step number */
function getStepHex(scale: ScaleColor[], step: number): string {
  for (var i = 0; i < scale.length; i++) {
    if (scale[i].step === step) return scale[i].hex;
  }
  return scale.length > 0 ? scale[0].hex : '#ccc';
}

export function LandingPage(props: LandingPageProps) {
  var alreadyLoaded = typeof window !== 'undefined' && window.sessionStorage.getItem('okscale.loaded');
  var stageState = useState(alreadyLoaded ? 4 : 0);
  var stage = stageState[0];
  var setStage = stageState[1];

  var primaryScale = props.palette ? props.palette.primary.scale : [];

  return (
    <div class="landing-wrap">
      {stage < 4 ? (
        <LoadingOverlay
          stage={stage}
          setStage={setStage}
          scale={primaryScale}
          baseHex={props.baseHex}
        />
      ) : null}
      <div class={'landing-main' + (stage >= 4 ? ' landing-main--visible' : '')}>
        <LandingColorBanner palette={props.palette} />
        <div class={'landing-content-area' + (stage >= 4 ? ' landing-content-area--visible' : '')}>
          <LandingContent onNavigate={props.onNavigate} />
          <LandingHeroType />
          <LandingFooter onNavigate={props.onNavigate} />
        </div>
      </div>
    </div>
  );
}

/* ── Loading Overlay (motion.dev powered) ── */

function LoadingOverlay(props: {
  stage: number;
  setStage: (s: number) => void;
  scale: ScaleColor[];
  baseHex: string;
}) {
  var containerRef = useRef<HTMLDivElement>(null);
  var colsRef = useRef<HTMLDivElement>(null);
  var setStage = props.setStage;
  var scale = props.scale;
  var baseHex = props.baseHex;

  useEffect(function () {
    var container = containerRef.current;
    var colsEl = colsRef.current;
    if (!container || !colsEl) return;
    var cols = colsEl.children;
    if (!cols.length) return;

    // Stage 1: full-screen single color, show "OK-Scale" text briefly
    setStage(1);

    // Stage 2: split into 11 shade columns (flex 0 -> 1)
    var t1 = window.setTimeout(function () {
      setStage(2);
      animate(
        Array.prototype.slice.call(cols) as Element[],
        { flex: ['0 0 0%', '1 1 0%'] },
        { duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: stagger(0.04) }
      );
    }, 600);

    // Stage 3: collapse height to 202px
    var t2 = window.setTimeout(function () {
      setStage(3);
      animate(
        container as Element,
        { height: ['100vh', '202px'] },
        { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
      ).then(function () {
        setStage(4);
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('okscale.loaded', '1');
        }
      });
    }, 1600);

    return function () {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      class="landing-loading"
      style={{ background: baseHex, height: '100vh' }}
    >
      <div ref={colsRef} class="landing-loading-columns">
        {scale.length > 0 ? scale.map(function (item, i) {
          var textColor = bestContrastColor(scale, item.hex);
          return (
            <div
              key={i}
              class="landing-loading-col"
              style={{ background: item.hex, flex: '0 0 0%' }}
            >
              <span class="landing-loading-label" style={{ color: textColor }}>{item.step}</span>
            </div>
          );
        }) : (
          <div class="landing-loading-col" style={{ background: baseHex, flex: '1 1 0%' }} />
        )}
      </div>
    </div>
  );
}

/* ── Color Banner (shade-based, all shades always in DOM) ── */

function getBaseStepIndex(scale: ScaleColor[]): number {
  // The "base" visible shade in default state = step 100
  for (var i = 0; i < scale.length; i++) {
    if (scale[i].step === 100) return i;
  }
  return 1;
}

function LandingColorBanner(props: { palette: FullPalette | null }) {
  var hoveredState = useState(null as PaletteRole | null);
  var hovered = hoveredState[0];
  var setHovered = hoveredState[1];
  var leavingState = useState(null as PaletteRole | null);
  var leavingRole = leavingState[0];
  var setLeavingRole = leavingState[1];
  var p = props.palette;
  var isInteractive = hovered !== null || leavingRole !== null;

  return (
    <div
      class={'landing-banner' + (isInteractive ? ' landing-banner--interactive' : '')}
      role="banner"
      aria-label="Color palette preview"
    >
      {ROLES.map(function (role) {
        var entry = p ? p[role] : null;
        var isActive = hovered === role;
        var isHidden = hovered !== null && hovered !== role;
        var isLeaving = hovered === null && leavingRole === role;
        var cls = 'landing-banner-role';
        if (isActive) cls += ' landing-banner-role--active';
        if (isHidden) cls += ' landing-banner-role--hidden';
        if (isLeaving) cls += ' landing-banner-role--leaving';

        var scale = entry ? entry.scale : [];
        var baseIdx = scale.length > 0 ? getBaseStepIndex(scale) : -1;
        var themeHex = scale.length > 0 ? getStepHex(scale, 100) : '#ccc';
        var labelColor = scale.length > 0 ? getStepHex(scale, 500) : '#000';

        return (
          <div
            key={role}
            class={cls}
            onMouseEnter={function () {
              setLeavingRole(null);
              setHovered(role);
            }}
            onMouseLeave={function () {
              if (hovered === role) {
                setHovered(null);
                setLeavingRole(role);
              }
            }}
          >
            <div
              class="landing-banner-theme"
              style={{ background: themeHex }}
              onAnimationEnd={function () {
                if (leavingRole === role) {
                  setLeavingRole(null);
                }
              }}
            >
              <span class="landing-banner-role-label" style={{ color: labelColor }}>
                {ROLE_LABELS[role]}
              </span>
            </div>
            <div class="landing-banner-shades">
              {scale.map(function (item, i) {
                var isBase = i === baseIdx;
                var shadeCls = 'landing-banner-shade';
                if (isBase) shadeCls += ' landing-banner-shade--base';
                var textColor = bestContrastColor(scale, item.hex);
                return (
                  <div
                    key={i}
                    class={shadeCls}
                    style={{ background: item.hex }}
                  >
                    <span
                      class="landing-banner-shade-label"
                      style={{ color: textColor }}
                    >
                      {item.step}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Content area ── */

function LandingContent(props: { onNavigate: (to: string) => void }) {
  return (
    <div class="landing-content section">
      <div class="landing-content-left">
        <h1 class="landing-tagline">
          Perceptually uniform color scales for modern design systems.
        </h1>
        <div class="landing-actions">
          <button
            type="button"
            class="landing-btn landing-btn-dark"
            onClick={function () { props.onNavigate('/app'); }}
          >
            Build your scales
          </button>
          <button type="button" class="landing-btn landing-btn-accent">
            Unlock premium
          </button>
        </div>
      </div>
      <div class="landing-content-right">
        <div class="landing-link-group">
          <h2 class="landing-link-title">How it works</h2>
          <a class="landing-link" href="/docs" onClick={function (e: Event) { e.preventDefault(); props.onNavigate('/docs'); }}>Why oklch</a>
          <a class="landing-link" href="/docs" onClick={function (e: Event) { e.preventDefault(); props.onNavigate('/docs'); }}>Shade strategy</a>
          <a class="landing-link" href="/app" onClick={function (e: Event) { e.preventDefault(); props.onNavigate('/app'); }}>Ease-use Generator</a>
          <a class="landing-link" href="/docs" onClick={function (e: Event) { e.preventDefault(); props.onNavigate('/docs'); }}>Figma integration</a>
        </div>
        <div class="landing-link-group">
          <h2 class="landing-link-title">Behind the tool</h2>
          <a class="landing-link" href="https://github.com/BIAsia/okscale" target="_blank" rel="noreferrer">Made by <strong>openclaw</strong></a>
          <a class="landing-link" href="https://github.com/BIAsia/okscale" target="_blank" rel="noreferrer">Updates</a>
        </div>
      </div>
    </div>
  );
}

/* ── Giant OK-Scale type ── */

function LandingHeroType() {
  return (
    <div class="landing-hero-type" aria-hidden="true">
      <span class="landing-hero-text">OK-Scale</span>
    </div>
  );
}

/* ── Footer bar (4 columns with border) ── */

function LandingFooter(props: { onNavigate: (to: string) => void }) {
  return (
    <footer class="landing-footer">
      <div class="landing-footer-cell">
        <span class="landing-footer-name">Mona-the-cat</span>
        <span class="landing-footer-label">project</span>
      </div>
      <div class="landing-footer-cell">
        <a href="/docs" onClick={function (e: Event) { e.preventDefault(); props.onNavigate('/docs'); }}>Doc hub</a>
      </div>
      <div class="landing-footer-cell">
        <a href="#">About the project</a>
      </div>
      <div class="landing-footer-cell landing-footer-social">
        <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="X">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        </a>
        <a href="https://github.com/BIAsia/okscale" target="_blank" rel="noreferrer" aria-label="GitHub">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
        </a>
      </div>
    </footer>
  );
}
