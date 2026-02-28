type HeroProps = {
  onOpenApp?: () => void;
};

export function Hero(props: HeroProps) {
  return (
    <section
      class="section hero-section"
      style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
    >
      <div class="container flex flex-col items-center" style={{ textAlign: 'center' }}>
        <h1 class="text-hero">OKSCALE</h1>
        <p class="text-nav mt-sm" aria-hidden="true">
          ---
        </p>
        <p class="text-body-lg mt-md">
          Perceptually uniform color scales for modern design systems.
        </p>
        <p class="text-nav mt-sm text-muted">
          Generate tokens in minutes. Export to CSS, Tailwind, SCSS, Design Tokens, and Figma Variables.
        </p>
        <div class="hero-actions">
          <button
            type="button"
            class="btn btn-accent"
            onClick={function () {
              if (props.onOpenApp) props.onOpenApp();
            }}
          >
            Open Generator
          </button>
          <a class="btn btn-secondary" href="#why-oklch">
            Why Oklch
          </a>
        </div>
        <div class="mt-md" style={{ width: '80px', height: '2px', background: 'var(--ok-highlight)' }} aria-hidden="true" />
      </div>
      <a href="#why-oklch" class="hero-scroll-indicator text-nav" aria-label="Scroll to Why Oklch">
        ↓
      </a>
    </section>
  );
}
