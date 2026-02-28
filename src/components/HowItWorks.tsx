type HowItWorksProps = {
  onOpenApp?: () => void;
};

export function HowItWorks(props: HowItWorksProps) {
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
              Start with any brand color - hex, RGB, HSL, or Oklch. OKScale parses and validates input instantly.
            </p>
          </article>

          <article class="card flex flex-col gap-sm">
            <p class="step-number">02</p>
            <h3 class="text-body-lg">Generate Your System</h3>
            <p class="text-body">
              One color generates four coordinated palettes. Tune shade strategy and advanced options when needed.
            </p>
          </article>

          <article class="card flex flex-col gap-sm">
            <p class="step-number">03</p>
            <h3 class="text-body-lg">Export Everywhere</h3>
            <p class="text-body">
              Copy production-ready code in CSS custom properties, Tailwind config, SCSS maps, Design Tokens, and
              Figma Variables.
            </p>
          </article>
        </div>

        <article class="card-dark cta-card flex flex-col gap-md">
          <div class="flex flex-col gap-sm">
            <h3 class="text-sub">Ready to build?</h3>
            <p class="text-body" style="color: rgba(255, 255, 255, 0.7);">
              Open the workspace and ship your first token set in under 90 seconds.
            </p>
          </div>
          <div class="flex gap-sm cta-actions" style="flex-wrap: wrap;">
            <button
              type="button"
              class="btn btn-accent"
              onClick={function () {
                if (props.onOpenApp) props.onOpenApp();
              }}
            >
              Open Workspace
            </button>
            <a class="btn btn-secondary" href="#why-oklch" style="border-color: #fff; color: #fff;">
              Learn about Oklch
            </a>
          </div>
        </article>
      </div>
    </section>
  );
}
