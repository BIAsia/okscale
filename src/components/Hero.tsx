export function Hero() {
  return (
    <section
      class="section"
      style={{ minHeight: '100vh', paddingTop: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
    >
      <div class="container flex flex-col items-center" style={{ textAlign: 'center' }}>
        <h1 class="text-hero">OKSCALE</h1>
        <p class="text-nav mt-sm" aria-hidden="true">
          ---
        </p>
        <p class="text-body-lg mt-md">Perceptually uniform color scales for modern design systems. Powered by Oklch.</p>
        <p class="text-nav mt-sm text-muted">Color Scales, Design Tokens, Oklch</p>
        <div class="mt-md" style={{ width: '80px', height: '2px', background: 'var(--ok-accent)' }} aria-hidden="true" />
      </div>
      <a
        href="#why-oklch"
        class="text-nav"
        style={{ position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)', textDecoration: 'none', color: '#000' }}
        aria-label="Scroll to Why Oklch"
      >
        ↓
      </a>
    </section>
  );
}
