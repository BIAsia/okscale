export function Hero() {
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
          Generate perceptually uniform color scales powered by Oklch. Export to CSS, Tailwind, SCSS, Design Tokens,
          and Figma Variables.
        </p>
        <p class="text-nav mt-sm text-muted">Free and open source color tooling for modern product teams.</p>
        <div class="mt-md" style={{ width: '80px', height: '2px', background: 'var(--ok-accent)' }} aria-hidden="true" />
      </div>
      <a href="#why-oklch" class="hero-scroll-indicator text-nav" aria-label="Scroll to Why Oklch">
        ↓
      </a>
    </section>
  );
}
