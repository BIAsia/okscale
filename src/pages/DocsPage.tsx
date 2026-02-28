import { Footer } from '../components/Footer';
import { Nav } from '../components/Nav';

type DocsPageProps = {
  onNavigate: (to: string) => void;
};

export function DocsPage(props: DocsPageProps) {
  return (
    <div class="page-wrap docs-page">
      <Nav mode="docs" onNavigate={props.onNavigate} />

      <section class="section docs-hero">
        <div class="section-inner flex flex-col gap-md">
          <h1 class="text-section">Docs</h1>
          <p class="text-body text-muted">
            Minimal integration snippets for shipping OKScale tokens in production stacks.
          </p>
        </div>
      </section>

      <section class="section">
        <div class="section-inner grid-2 gap-md docs-grid">
          <article class="card flex flex-col gap-sm">
            <h2 class="text-body-lg">CSS Variables</h2>
            <p class="text-body text-muted">Paste generated variables and consume with semantic aliases.</p>
            <pre class="code-block"><code>{`:root {
  --primary-50: #f3f7ff;
  --primary-500: #3b82f6;
  --primary-900: #0f2140;
}

.button-primary {
  background: var(--primary-600);
  color: var(--primary-50);
}`}</code></pre>
          </article>

          <article class="card flex flex-col gap-sm">
            <h2 class="text-body-lg">Tailwind</h2>
            <p class="text-body text-muted">Extend your theme colors with numeric token scales.</p>
            <pre class="code-block"><code>{`export default {
  theme: {
    extend: {
      colors: {
        primary: {
          '50': '#f3f7ff',
          '500': '#3b82f6',
          '900': '#0f2140'
        }
      }
    }
  }
};`}</code></pre>
          </article>

          <article class="card flex flex-col gap-sm">
            <h2 class="text-body-lg">Design Tokens JSON</h2>
            <p class="text-body text-muted">Use W3C token shape in build pipelines and design tooling.</p>
            <pre class="code-block"><code>{`{
  "$schema": "https://tr.designtokens.org/format/",
  "primary": {
    "500": { "value": "#3b82f6", "type": "color" }
  }
}`}</code></pre>
          </article>

          <article class="card flex flex-col gap-sm">
            <h2 class="text-body-lg">Figma Variables</h2>
            <p class="text-body text-muted">Import JSON output into your Figma variable collection workflow.</p>
            <pre class="code-block"><code>{`{
  "collections": [
    {
      "name": "OKScale",
      "modes": ["Light"],
      "variables": [
        {
          "name": "primary",
          "type": "COLOR",
          "valuesByMode": { "Light": { "500": "#3b82f6" } }
        }
      ]
    }
  ]
}`}</code></pre>
          </article>
        </div>
      </section>

      <section class="section docs-cta">
        <div class="section-inner">
          <article class="card-dark flex flex-col gap-md">
            <h2 class="text-sub">Need a full token pack?</h2>
            <p class="text-body" style="color: rgba(255, 255, 255, 0.72);">
              Open workspace, tune your brand color, and export all formats from one panel.
            </p>
            <div class="flex gap-sm cta-actions" style="flex-wrap: wrap;">
              <button
                type="button"
                class="btn btn-accent"
                onClick={function () {
                  props.onNavigate('/app');
                }}
              >
                Open Workspace
              </button>
              <button
                type="button"
                class="btn btn-secondary"
                style="border-color: #fff; color: #fff;"
                onClick={function () {
                  props.onNavigate('/');
                }}
              >
                Back to Landing
              </button>
            </div>
          </article>
        </div>
      </section>

      <Footer mode="docs" onNavigate={props.onNavigate} />
    </div>
  );
}
