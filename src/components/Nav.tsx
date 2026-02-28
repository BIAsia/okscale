type NavMode = 'landing' | 'workspace';

type NavProps = {
  mode: NavMode;
  onNavigate?: (to: string) => void;
};

function navigate(event: MouseEvent, to: string, onNavigate?: (to: string) => void) {
  if (!onNavigate) return;
  event.preventDefault();
  onNavigate(to);
}

export function Nav(props: NavProps) {
  if (props.mode === 'workspace') {
    return (
      <header class="nav">
        <a
          class="nav-logo"
          href="/"
          onClick={function (event) {
            navigate(event, '/', props.onNavigate);
          }}
        >
          OKSCALE
        </a>
        <nav class="nav-links" aria-label="Workspace">
          <a href="#quick-start">Quick Start</a>
          <a href="#palette-preview">Preview</a>
          <a href="#contrast-matrix">Contrast</a>
          <a
            href="https://github.com/BIAsia/okscale"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>
      </header>
    );
  }

  return (
    <header class="nav">
      <a class="nav-logo" href="#hero">
        OKSCALE
      </a>
      <nav class="nav-links" aria-label="Primary">
        <a href="#why-oklch">Why Oklch</a>
        <a href="#how">How it works</a>
        <a
          href="/app"
          onClick={function (event) {
            navigate(event, '/app', props.onNavigate);
          }}
        >
          Open App
        </a>
        <a href="https://github.com/BIAsia/okscale" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </nav>
    </header>
  );
}
