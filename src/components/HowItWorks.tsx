export function HowItWorks() {
  return (
    <section id="how" class="section">
      <h2>How It Works</h2>
      <div class="steps-grid">
        <article>
          <span class="icon">01</span>
          <h3>Pick your brand color</h3>
          <p>Start with a single hex value or native picker input.</p>
        </article>
        <article>
          <span class="icon">02</span>
          <h3>Generate perceptually uniform scale</h3>
          <p>Oklch keeps visual steps even across the full tonal range.</p>
        </article>
        <article>
          <span class="icon">03</span>
          <h3>Export to your stack</h3>
          <p>Ship CSS variables, Tailwind config, tokens, Figma variables, or SCSS.</p>
        </article>
      </div>
    </section>
  );
}
