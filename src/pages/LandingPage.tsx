import { useEffect, useState } from 'preact/hooks';
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

/* ── Shade text color: dark text on light bg, light text on dark bg ── */
function shadeTextColor(scale: ScaleColor[], index: number): string {
  if (!scale.length) return '#000';
  var lightHex = scale[0] ? scale[0].hex : '#fff';
  var darkHex = scale[scale.length - 1] ? scale[scale.length - 1].hex : '#000';
  return index < Math.floor(scale.length / 2) ? darkHex : lightHex;
}

function roleLabelColor(entry: PaletteEntry): string {
  var scale = entry.scale;
  if (!scale.length) return '#000';
  // pick mid-dark step for label contrast on base color
  var midIdx = Math.floor(scale.length / 2);
  // simple luminance check on baseHex
  var hex = entry.baseHex.replace('#', '');
  var r = parseInt(hex.substring(0, 2), 16);
  var g = parseInt(hex.substring(2, 4), 16);
  var b = parseInt(hex.substring(4, 6), 16);
  var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.5 ? (scale[scale.length - 1] ? scale[scale.length - 1].hex : '#000') : (scale[0] ? scale[0].hex : '#fff');
}

export function LandingPage(props: LandingPageProps) {
  var loadingStage = useState(function () {
    if (typeof window !== 'undefined' && window.sessionStorage.getItem('okscale.loaded')) return 4;
    return 0;
  });
  var stage = loadingStage[0];
  var setStage = loadingStage[1];

  useEffect(function () {
    if (stage >= 4) return;
    var timers: number[] = [];
    timers.push(window.setTimeout(function () { setStage(1); }, 50) as unknown as number);
    timers.push(window.setTimeout(function () { setStage(2); }, 700) as unknown as number);
    timers.push(window.setTimeout(function () { setStage(3); }, 1500) as unknown as number);
    timers.push(window.setTimeout(function () {
      setStage(4);
      window.sessionStorage.setItem('okscale.loaded', '1');
    }, 2200) as unknown as number);
    return function () {
      timers.forEach(function (t) { window.clearTimeout(t); });
    };
  }, []);

  var primaryScale = props.palette ? props.palette.primary.scale : [];
  var primaryBase = props.palette ? props.palette.primary.baseHex : props.baseHex;

  return (
    <div class="landing-wrap">
      {stage < 4 ? (
        <LoadingOverlay
          stage={stage}
          scale={primaryScale}
          baseHex={primaryBase}
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

/* ── Loading Overlay ── */

function LoadingOverlay(props: { stage: number; scale: ScaleColor[]; baseHex: string }) {
  var stage = props.stage;
  var scale = props.scale;
  var baseHex = props.baseHex;

  var cls = 'landing-loading';
  if (stage === 0) cls += ' landing-loading--stage0';
  if (stage === 1) cls += ' landing-loading--stage1';
  if (stage === 2) cls += ' landing-loading--stage2';
  if (stage === 3) cls += ' landing-loading--stage3';

  return (
    <div class={cls} style={stage <= 1 ? { background: baseHex } : undefined}>
      <div class="landing-loading-columns">
        {scale.length > 0 ? scale.map(function (item, i) {
          return (
            <div
              key={i}
              class="landing-loading-col"
              style={{ background: item.hex }}
            />
          );
        }) : (
          <div class="landing-loading-col" style={{ background: baseHex, flex: 1 }} />
        )}
      </div>
    </div>
  );
}

/* ── Color Banner (top strip with hover expand) ── */

function LandingColorBanner(props: { palette: FullPalette | null }) {
  var hoveredState = useState(null as PaletteRole | null);
  var hovered = hoveredState[0];
  var setHovered = hoveredState[1];
  var p = props.palette;

  return (
    <div class="landing-banner" role="banner" aria-label="Color palette preview">
      {ROLES.map(function (role) {
        var entry = p ? p[role] : null;
        var isActive = hovered === role;
        var isHidden = hovered !== null && hovered !== role;
        var cls = 'landing-banner-role';
        if (isActive) cls += ' landing-banner-role--active';
        if (isHidden) cls += ' landing-banner-role--hidden';

        var scale = entry ? entry.scale : [];
        var baseHex = entry ? entry.baseHex : '#ccc';
        var labelColor = entry ? roleLabelColor(entry) : '#000';

        return (
          <div
            key={role}
            class={cls}
            style={{ background: baseHex }}
            onMouseEnter={function () { setHovered(role); }}
            onMouseLeave={function () { setHovered(null); }}
          >
            <span class="landing-banner-role-label" style={{ color: labelColor }}>
              {ROLE_LABELS[role]}
            </span>
            <div class="landing-banner-shades">
              {scale.map(function (item, i) {
                return (
                  <div
                    key={i}
                    class="landing-banner-shade"
                    style={{ background: item.hex }}
                  >
                    <span
                      class="landing-banner-shade-label"
                      style={{ color: shadeTextColor(scale, i) }}
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

/* ── Content area (tagline + links + buttons) ── */

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
            onClick={function () {
              props.onNavigate('/app');
            }}
          >
            Build your ok-scales
          </button>
          <button type="button" class="landing-btn landing-btn-accent">
            Unlock premium
          </button>
          <a
            class="landing-icon-btn"
            href="https://x.com"
            target="_blank"
            rel="noreferrer"
            aria-label="X (Twitter)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a
            class="landing-icon-btn"
            href="https://github.com/BIAsia/okscale"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
          </a>
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

/* ── Footer bar ── */

function LandingFooter(props: { onNavigate: (to: string) => void }) {
  return (
    <footer class="landing-footer">
      <div class="landing-footer-brand">
        <span class="landing-footer-name">Mona-the-cat</span>
        <span class="landing-footer-label">project</span>
      </div>
      <nav class="landing-footer-nav" aria-label="Footer navigation">
        <a href="/app" onClick={function (e: Event) { e.preventDefault(); props.onNavigate('/app'); }}>All Tools</a>
        <a href="/docs" onClick={function (e: Event) { e.preventDefault(); props.onNavigate('/docs'); }}>Doc</a>
        <a href="#">Blog</a>
        <a href="#">About</a>
      </nav>
    </footer>
  );
}
