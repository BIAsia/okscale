import { Footer } from '../components/Footer';
import { Nav } from '../components/Nav';

type DocsPageProps = {
  onNavigate: (to: string) => void;
};

type HubSection = {
  id: string;
  title: string;
  summary: string;
  paragraphs: string[];
  bullets?: string[];
  code?: string;
};

var HUB_SECTIONS: HubSection[] = [
  {
    id: 'quick-start',
    title: 'Quick Start',
    summary: 'Generate a usable system in minutes with one source color.',
    paragraphs: [
      'Open Generator, set your source color, then tune shade strategy and harmony. Keep the default settings if you want the fastest path.',
      'When the palette looks right, choose one export route: connect an Agent, export code, or import directly to Figma variables.'
    ],
    bullets: [
      'Input: hex/rgb/hsl/oklch color formats are supported.',
      'Controls: shade mode, harmony type, anchor behavior, neutral mode.',
      'Validation: contrast tab helps verify practical foreground/background pairs.'
    ],
    code: "# Fastest entry\n/open app\nSet color -> choose route -> copy/download"
  },
  {
    id: 'why-oklch',
    title: 'Why OKLCH',
    summary: 'OKLCH makes visual changes feel even and predictable across the scale.',
    paragraphs: [
      'In many legacy models, equal numeric steps do not look equally spaced to the eye. This causes unexpected jumps in brightness or saturation.',
      'OKLCH separates Lightness, Chroma, and Hue in a perceptual color space. This gives smoother ramps and better control over role relationships.',
      'For design systems, this means easier token tuning, more stable contrast behavior, and less manual correction across states.'
    ],
    bullets: [
      'L controls perceived brightness progression.',
      'C controls colorfulness without breaking the whole ramp.',
      'H controls hue direction while keeping value/chroma intent.'
    ]
  },
  {
    id: 'shade-strategy',
    title: 'Shade Strategy',
    summary: 'Choose strategy by intent, not by preference.',
    paragraphs: [
      'Shade mode controls how hue shifts from light to dark. Pick the mode based on tone behavior you want in UI components.',
      'Anchor behavior controls whether the exact input color is pinned at the nearest lightness step or adjusted for gamut safety.'
    ],
    bullets: [
      '`none`: minimal hue drift; useful for strict brand fidelity.',
      '`natural`: balanced drift for general product UI defaults.',
      '`warm` / `cool`: deliberate temperature direction across the scale.',
      '`preserve-input`: keeps exact source color on anchor step.',
      '`auto-gamut`: allows remapping when exact anchor would clip.'
    ]
  },
  {
    id: 'generator-guide',
    title: 'Generator Guide',
    summary: 'Understand each control so edits stay intentional.',
    paragraphs: [
      'Left panel handles source and generation controls: color input, L/C/H sliders, anchor mode, neutral mode, history, and image extraction.',
      'Center panel is for reading output quality: palette circles, UI preview, and contrast checks for realistic usage cases.',
      'Right panel is route-first export. You select target workflow first, then only see the needed actions.'
    ],
    bullets: [
      'History chips speed up iteration and backtracking.',
      'Upload image extracts a starter theme from artwork.',
      'UI preview simulates practical tokens on components.'
    ]
  },
  {
    id: 'export-guide',
    title: 'Export Guide',
    summary: 'Three routes, each optimized for a different delivery workflow.',
    paragraphs: [
      'Connect Agent: for automated execution in MCP/agent pipelines. Copy command or prompt template directly from Generator.',
      'Export Code: for developer handoff. Choose format and naming, then copy or download generated artifacts.',
      'Import to Figma: for design-side variable workflows. Download JSON and import as variables collection.'
    ],
    bullets: [
      'Code formats: CSS, Tailwind, Design Tokens, SCSS.',
      'Naming presets: numeric or semantic token naming.',
      'Figma export aligns role groups: primary, secondary, accent, neutral.'
    ]
  },
  {
    id: 'agent-integration',
    title: 'Agent Integration',
    summary: 'Machine-facing interfaces are first-class and validated.',
    paragraphs: [
      'OKScale provides consistent contracts across CLI, HTTP API, and MCP tools. All interfaces share stable request/response and error envelope behavior.',
      'Use MCP tools for agent-native workflows, or call HTTP/CLI directly in scripts and CI pipelines.'
    ],
    bullets: [
      'CLI: `npm run cli -- generate|export|schema`',
      'HTTP: `POST /api/generate`, `POST /api/export`, `GET /api/schema`',
      'MCP tools: `generate_palette`, `export_tokens`, `decode_share_url`, `validate_color`'
    ],
    code: "curl -sS -X POST \"https://<your-domain>/api/generate\" \\\n  -H \"content-type: application/json\" \\\n  -d '{\"colorInput\":\"#3b82f6\",\"shadeMode\":\"natural\",\"harmonyType\":\"complementary\"}'"
  },
  {
    id: 'figma-integration',
    title: 'Figma Integration',
    summary: 'Use JSON export for direct variable import into Figma workflows.',
    paragraphs: [
      'Choose Import to Figma in Generator and download variables JSON. Import it through Figma Variables panel.',
      'After import, verify role grouping and key steps so components can bind tokens predictably across design files.'
    ],
    bullets: [
      'Open Variables panel in Figma.',
      'Import JSON file from Generator.',
      'Confirm role sets and key steps (50..950).'
    ]
  },
  {
    id: 'about-okscale',
    title: 'About OKScale',
    summary: 'A practical Oklch system generator for design + engineering teams.',
    paragraphs: [
      'OKScale is built for real production use: quick iteration in UI, deterministic exports for code pipelines, and direct handoff paths for design tooling.',
      'The project focuses on practical color-system outcomes: perceptual consistency, route-first exports, and machine-friendly integration points.'
    ]
  },
  {
    id: 'updates',
    title: 'Updates',
    summary: 'Recent milestones for product and integration capabilities.',
    paragraphs: [
      'Latest milestone includes machine-facing contracts, CLI, HTTP API endpoints, MCP server tools, and external caller smoke tests.',
      'Generator export flow has been simplified to route-first actions: Connect Agent, Export Code, Import to Figma.'
    ],
    bullets: [
      'v1 Agent-ready interfaces shipped.',
      'Route-first export UX landed in Generator.',
      'Doc Hub expanded with anchor-based quick jumps.'
    ]
  }
];

export function DocsPage(props: DocsPageProps) {
  return (
    <div class="page-wrap docs-page" id="doc-hub">
      <Nav mode="docs" onNavigate={props.onNavigate} />

      <section class="section docs-hero">
        <div class="section-inner flex flex-col gap-md">
          <h1 class="text-section">Doc Hub</h1>
          <p class="text-body text-muted">
            Central documentation for OKScale usage, strategy, export workflows, and integration.
          </p>

          <nav class="docs-mini-nav" aria-label="Doc Hub sections">
            {HUB_SECTIONS.map(function (section) {
              return (
                <a key={section.id} href={'#' + section.id} class="docs-mini-link text-code">
                  {section.title}
                </a>
              );
            })}
          </nav>
        </div>
      </section>

      <section class="section docs-layout-section">
        <div class="section-inner docs-hub-layout">
          <aside class="card docs-nav-card">
            <h2 class="text-body-lg">Doc Hub</h2>
            <p class="text-body text-muted">Quick jump to each anchor section.</p>
            <div class="docs-nav-list">
              {HUB_SECTIONS.map(function (section) {
                return (
                  <a key={section.id} href={'#' + section.id} class="docs-nav-link text-code">
                    {section.title}
                  </a>
                );
              })}
            </div>
          </aside>

          <article class="card docs-hub-article">
            {HUB_SECTIONS.map(function (section) {
              return (
                <section key={section.id} id={section.id} class="docs-hub-block">
                  <h2 class="text-sub">{section.title}</h2>
                  <p class="text-body text-muted">{section.summary}</p>
                  {section.paragraphs.map(function (para, idx) {
                    return (
                      <p key={section.id + '-p-' + idx} class="text-body">
                        {para}
                      </p>
                    );
                  })}
                  {section.bullets && section.bullets.length > 0 && (
                    <ul class="docs-hub-list">
                      {section.bullets.map(function (item, idx) {
                        return <li key={section.id + '-b-' + idx}>{item}</li>;
                      })}
                    </ul>
                  )}
                  {section.code && (
                    <pre class="code-block docs-hub-code"><code>{section.code}</code></pre>
                  )}
                </section>
              );
            })}
          </article>
        </div>
      </section>

      <section class="section docs-cta">
        <div class="section-inner">
          <article class="card-dark flex flex-col gap-md">
            <h2 class="text-sub">Ready to build your scale?</h2>
            <p class="text-body" style="color: var(--ok-neutral-200);">
              Open Generator to tune your palette and choose an export route.
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
                style="border-color: var(--ok-neutral-50); color: var(--ok-neutral-50);"
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
