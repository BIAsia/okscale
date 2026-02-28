type LandingPageProps = {
  baseHex: string;
  onNavigate: (to: string) => void;
};

export function LandingPage(props: LandingPageProps) {
  return (
    <div class="landing-wrap">
      <LandingColorBanner baseHex={props.baseHex} />
      <LandingContent onNavigate={props.onNavigate} />
      <LandingHeroType />
      <LandingFooter />
    </div>
  );
}

/* ── Color Banner (top 4-column strip) ── */

function LandingColorBanner(_props: { baseHex: string }) {
  var primarySteps = [
    'var(--ok-primary-50)',
    'var(--ok-primary-100)',
    'var(--ok-primary-200)',
    'var(--ok-primary-300)',
    'var(--ok-primary-400)',
    'var(--ok-primary-500)',
    'var(--ok-primary-600)',
    'var(--ok-primary-700)',
    'var(--ok-primary-800)',
    'var(--ok-primary-900)'
  ];

  return (
    <div class="landing-banner">
      <div class="landing-banner-primary">
        {primarySteps.map(function (color, i) {
          return <div key={i} class="landing-banner-stripe" style={{ background: color }} />;
        })}
      </div>
      <div class="landing-banner-swatch" style={{ background: 'var(--ok-primary-200)', opacity: 0.4 }}>
        <span class="landing-swatch-label text-code">#d9ff00</span>
      </div>
      <div class="landing-banner-swatch" style={{ background: 'var(--ok-primary-200)', opacity: 0.6 }}>
        <span class="landing-swatch-label text-code">#d9ff00</span>
      </div>
      <div class="landing-banner-swatch" style={{ background: 'var(--ok-primary-100)', opacity: 0.3 }}>
        <span class="landing-swatch-label text-code">#d9ff00</span>
      </div>
    </div>
  );
}

/* ── Content area (tagline + links + buttons) ── */

function LandingContent(props: { onNavigate: (to: string) => void }) {
  return (
    <div class="landing-content">
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
          </a>
        </div>
      </div>
      <div class="landing-content-right">
        <div class="landing-link-group">
          <h2 class="landing-link-title">How it works</h2>
          <a class="landing-link" href="/app" onClick={function (e) { e.preventDefault(); props.onNavigate('/app'); }}>Why oklch</a>
          <a class="landing-link" href="/app" onClick={function (e) { e.preventDefault(); props.onNavigate('/app'); }}>Shade strategy</a>
          <a class="landing-link" href="/app" onClick={function (e) { e.preventDefault(); props.onNavigate('/app'); }}>Ease-use Generator</a>
          <a class="landing-link" href="/app" onClick={function (e) { e.preventDefault(); props.onNavigate('/app'); }}>Figma integration</a>
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
    <div class="landing-hero-type">
      <span class="landing-hero-text">OK-Scale</span>
    </div>
  );
}

/* ── Footer bar ── */

function LandingFooter() {
  return (
    <footer class="landing-footer">
      <div class="landing-footer-brand">
        <span class="landing-footer-name">Mona-the-cat</span>
        <span class="landing-footer-label">project</span>
      </div>
      <nav class="landing-footer-nav">
        <a href="/app">All Tools</a>
        <a href="/docs">Doc</a>
        <a href="#">Blog</a>
        <a href="#">About</a>
      </nav>
    </footer>
  );
}
