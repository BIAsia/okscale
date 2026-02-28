type FooterMode = 'landing' | 'workspace' | 'docs';

type FooterProps = {
  mode: FooterMode;
  onNavigate?: (to: string) => void;
};

function routeClick(event: MouseEvent, to: string, onNavigate?: (to: string) => void) {
  if (!onNavigate) return;
  event.preventDefault();
  onNavigate(to);
}

export function Footer(props: FooterProps) {
  var year = new Date().getFullYear();

  return (
    <footer class="section" style="padding: 48px 0;">
      <div class="section-inner flex flex-col gap-md">
        <div class="footer-divider" />

        <div class="footer-inner">
          <a
            class="nav-logo"
            href={props.mode === 'landing' ? '#hero' : '/'}
            onClick={
              props.mode !== 'landing'
                ? function (event) {
                    routeClick(event, '/', props.onNavigate);
                  }
                : undefined
            }
          >
            OKSCALE
          </a>

          <nav class="flex gap-md footer-links" aria-label="Footer">
            {props.mode === 'landing' ? (
              <>
                <a class="text-nav" href="#why-oklch">
                  Why Oklch
                </a>
                <a class="text-nav" href="#how">
                  How It Works
                </a>
                <a
                  class="text-nav"
                  href="/docs"
                  onClick={function (event) {
                    routeClick(event, '/docs', props.onNavigate);
                  }}
                >
                  Docs
                </a>
                <a
                  class="text-nav"
                  href="/app"
                  onClick={function (event) {
                    routeClick(event, '/app', props.onNavigate);
                  }}
                >
                  Open App
                </a>
              </>
            ) : props.mode === 'workspace' ? (
              <>
                <a
                  class="text-nav"
                  href="/"
                  onClick={function (event) {
                    routeClick(event, '/', props.onNavigate);
                  }}
                >
                  Home
                </a>
                <a class="text-nav" href="#quick-start">
                  Quick Start
                </a>
                <a class="text-nav" href="#contrast-matrix">
                  Contrast
                </a>
                <a
                  class="text-nav"
                  href="/docs"
                  onClick={function (event) {
                    routeClick(event, '/docs', props.onNavigate);
                  }}
                >
                  Docs
                </a>
              </>
            ) : (
              <>
                <a
                  class="text-nav"
                  href="/"
                  onClick={function (event) {
                    routeClick(event, '/', props.onNavigate);
                  }}
                >
                  Home
                </a>
                <a
                  class="text-nav"
                  href="/app"
                  onClick={function (event) {
                    routeClick(event, '/app', props.onNavigate);
                  }}
                >
                  Workspace
                </a>
              </>
            )}
            <a class="text-nav" href="https://github.com/BIAsia/okscale" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </nav>

          <p class="text-small text-muted">© {year} OKScale. Built with Oklch.</p>
        </div>

        <p class="text-small text-muted" style="text-align: center;">
          Made with perceptual precision.
        </p>
      </div>
    </footer>
  );
}
