export function HowItWorks() {
  return (
    <section id="how" class="section">
      <div class="section-inner flex flex-col gap-md">
        <h2 class="text-section">How It Works</h2>
        <p class="text-body text-muted">From brand color to production-ready design tokens in three steps.</p>

        <div class="grid-3">
          <article class="card flex flex-col gap-sm">
            <p class="step-number">01</p>
            <h3 class="text-body-lg">Pick a Color</h3>
            <p class="text-body">
              Start with any brand color - hex, RGB, or use the native picker. OKScale extracts the Oklch values and
              uses them as the foundation for your entire color system.
            </p>
          </article>

          <article class="card flex flex-col gap-sm">
            <p class="step-number">02</p>
            <h3 class="text-body-lg">Generate Your System</h3>
            <p class="text-body">
              One color generates four coordinated palettes - primary, secondary, accent, and neutral. Choose shade
              modes and harmony types to fine-tune the feel. Every step is perceptually uniform.
            </p>
          </article>

          <article class="card flex flex-col gap-sm">
            <p class="step-number">03</p>
            <h3 class="text-body-lg">Export Everywhere</h3>
            <p class="text-body">
              Copy production-ready code in CSS custom properties, Tailwind config, SCSS maps, W3C Design Tokens, or
              Figma Variables. Your entire color system, one click away.
            </p>
          </article>
        </div>

        <article class="card-dark cta-card flex flex-col gap-md">
          <div class="flex flex-col gap-sm">
            <h3 class="text-sub">Ready to build?</h3>
            <p class="text-body" style="color: rgba(255, 255, 255, 0.7);">
              Start with your brand color above, or explore the Oklch color space.
            </p>
          </div>
          <div class="flex gap-sm cta-actions" style="flex-wrap: wrap;">
            <a class="btn btn-accent" href="#generator">
              Try the Generator
            </a>
            <a class="btn btn-secondary" href="#why-oklch" style="border-color: #fff; color: #fff;">
              Learn about Oklch
            </a>
          </div>
        </article>
      </div>
    </section>
  );
}
