export function Footer() {
  return (
    <footer class="section" style="padding: 48px 0;">
      <div class="section-inner flex flex-col gap-md">
        <div class="footer-divider" />

        <div class="footer-inner">
          <a class="nav-logo" href="#hero">
            OKSCALE
          </a>

          <nav class="flex gap-md footer-links" aria-label="Footer">
            <a class="text-nav" href="#generator">
              Generator
            </a>
            <a class="text-nav" href="#why-oklch">
              Why Oklch
            </a>
            <a class="text-nav" href="#export">
              Export
            </a>
            <a class="text-nav" href="https://github.com/BIAsia/okscale" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </nav>

          <p class="text-small text-muted">© 2026 OKScale. Built with Oklch.</p>
        </div>

        <p class="text-small text-muted" style="text-align: center;">
          Made with perceptual precision.
        </p>
      </div>
    </footer>
  );
}
