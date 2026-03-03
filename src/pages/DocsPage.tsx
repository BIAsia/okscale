import { useEffect, useState } from 'preact/hooks';
import { Footer } from '../components/Footer';
import { Nav } from '../components/Nav';

import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/components/badge/badge.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/divider/divider.js';

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
  note?: string;
};

var HUB_SECTIONS: HubSection[] = [
  {
    id: 'quick-start',
    title: 'Quick Start',
    summary: 'Generate a production-ready scale in under 3 minutes.',
    paragraphs: [
      'Go to Generator, input your source color, then tune shade strategy and harmony. If you are new, keep defaults and iterate with one control at a time.',
      'Once the palette looks right, choose one delivery route in Export: Connect Agent, Export Code, or Import to Figma.'
    ],
    bullets: [
      'Input accepts hex, rgb(), hsl(), and oklch().',
      'Core controls: shade mode, harmony type, anchor behavior, neutral mode.',
      'Use Contrast tab before handoff to validate readable pairings.'
    ]
  },
  {
    id: 'why-oklch',
    title: 'Why OKLCH',
    summary: 'Perceptual consistency is the core reason to use OKLCH in system design.',
    paragraphs: [
      'In non-perceptual spaces, equal numeric steps often look uneven. This creates unpredictable jumps between neighboring tokens.',
      'OKLCH separates Lightness, Chroma, and Hue in a perceptual space, making ramps smoother and design intent easier to preserve.',
      'For teams, this reduces manual correction across states, improves token trust, and speeds up visual QA.'
    ],
    bullets: [
      'L controls perceived brightness progression.',
      'C controls color intensity in a stable way.',
      'H controls hue direction without random side effects.'
    ]
  },
  {
    id: 'shade-strategy',
    title: 'Shade Strategy',
    summary: 'Choose strategy by behavior target, not by aesthetic preference alone.',
    paragraphs: [
      'Shade mode defines hue drift over the light-dark ramp. Anchor behavior defines how strictly your input color is preserved at the nearest lightness step.',
      'Neutral mode controls whether neutral ramp keeps source hue influence or trends to absolute gray.'
    ],
    bullets: [
      '`none`: minimal hue drift, best for strict brand lock.',
      '`natural`: balanced default for most UI products.',
      '`warm` / `cool`: intentional temperature movement.',
      '`preserve-input`: keeps exact source color on anchor step.',
      '`auto-gamut`: remaps when exact anchor is not display-safe.'
    ],
    note: 'Rule of thumb: start with natural + preserve-input, then change only one switch at a time.'
  },
  {
    id: 'generator-guide',
    title: 'Generator Guide',
    summary: 'Understand panels and outputs to avoid accidental choices.',
    paragraphs: [
      'Left panel is generation control: source color, sliders, strategy toggles, history, and image extraction.',
      'Center panel is quality readout: full scales, component preview, and contrast-use scenarios.',
      'Right panel is route-first export, designed for direct execution or handoff.'
    ],
    bullets: [
      'History chips keep iteration loops short.',
      'Image upload gives a fast starter direction from artwork.',
      'UI preview helps validate practical component states before export.'
    ]
  },
  {
    id: 'figma-integration',
    title: 'Figma Integration',
    summary: 'Use non-code import path for design-side variable workflows.',
    paragraphs: [
      'In Export route, choose Import to Figma and download Variables JSON.',
      'Import into Figma Variables panel, then verify role groups and key steps before binding components.'
    ],
    bullets: [
      'Open Variables panel in Figma.',
      'Import downloaded JSON.',
      'Confirm groups: primary / secondary / accent / neutral.'
    ]
  },
  {
    id: 'agent-integration',
    title: 'Agent Integration',
    summary: 'Machine-facing interfaces are stable across CLI, HTTP, and MCP.',
    paragraphs: [
      'OKScale exposes consistent request and response contracts so automation clients can safely call generation and export flows.',
      'Use CLI for local scripting, HTTP for service calls, and MCP for agent-native tool execution.'
    ],
    bullets: [
      'CLI: npm run cli -- generate | export | schema',
      'HTTP: POST /api/generate, POST /api/export, GET /api/schema',
      'MCP: generate_palette, export_tokens, decode_share_url, validate_color'
    ],
    code: "curl -sS -X POST \"https://<your-domain>/api/generate\" \\\n  -H \"content-type: application/json\" \\\n  -d '{\"colorInput\":\"#3b82f6\",\"shadeMode\":\"natural\",\"harmonyType\":\"complementary\"}'"
  },
  {
    id: 'about-okscale',
    title: 'About the Project',
    summary: 'OKScale is built for practical design-engineering handoff.',
    paragraphs: [
      'The project focuses on predictable ramps, route-first delivery, and machine-friendly integration. It is intentionally opinionated around production workflows.',
      'Source repository and updates are public and linked from landing.'
    ]
  },
  {
    id: 'updates',
    title: 'Updates',
    summary: 'Recent milestones and behavior changes.',
    paragraphs: [
      'Recent releases added full agent-facing interfaces (CLI + HTTP + MCP), stabilized export contracts, and simplified Generator export UX.',
      'Track latest changes in the repository commits and release notes.'
    ]
  }
];

export function DocsPage(props: DocsPageProps) {
  var activeState = useState(HUB_SECTIONS[0].id);
  var activeId = activeState[0];
  var setActiveId = activeState[1];

  useEffect(function () {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0.01,
      }
    );

    HUB_SECTIONS.forEach(function (section) {
      var node = document.getElementById(section.id);
      if (node) observer.observe(node);
    });

    return function () {
      observer.disconnect();
    };
  }, []);

  return (
    <div class="page-wrap docs-page" id="doc-hub">
      <Nav mode="docs" onNavigate={props.onNavigate} />

      <section class="section docs-hero">
        <div class="section-inner flex flex-col gap-md">
          <p class="docs-kicker text-code">Documentation</p>
          <h1 class="text-section">Doc Hub</h1>
          <p class="text-body text-muted">
            The main guide for OKScale strategy, generation workflow, exports, and integration.
          </p>

          <nav class="docs-mini-nav" aria-label="Doc section quick links">
            {HUB_SECTIONS.map(function (section) {
              var active = section.id === activeId;
              return (
                <sl-button
                  key={section.id}
                  href={'#' + section.id}
                  size="small"
                  pill
                  variant={active ? 'primary' : 'default'}
                  class="docs-chip"
                >
                  {section.title}
                </sl-button>
              );
            })}
          </nav>
        </div>
      </section>

      <section class="section docs-layout-section">
        <div class="section-inner docs-shell">
          <sl-card class="docs-panel docs-sidebar docs-sidebar--left">
            <h2 class="text-body-lg">On this page</h2>
            <div class="docs-nav-list">
              {HUB_SECTIONS.map(function (section) {
                var active = section.id === activeId;
                return (
                  <sl-button
                    key={section.id}
                    href={'#' + section.id}
                    size="small"
                    variant={active ? 'primary' : 'text'}
                    class="docs-nav-item"
                  >
                    {section.title}
                  </sl-button>
                );
              })}
            </div>
          </sl-card>

          <sl-card class="docs-panel docs-main">
            {HUB_SECTIONS.map(function (section, idx) {
              return (
                <section key={section.id} id={section.id} class="docs-section-block">
                  {idx > 0 ? <sl-divider></sl-divider> : null}

                  <div class="docs-section-head">
                    <h2 class="text-sub">{section.title}</h2>
                    <a class="docs-anchor-link" href={'#' + section.id} aria-label={'Link to ' + section.title}>
                      <sl-badge pill variant="neutral" class="docs-anchor-badge">#</sl-badge>
                    </a>
                  </div>

                  <p class="text-body text-muted">{section.summary}</p>

                  {section.paragraphs.map(function (p, pidx) {
                    return (
                      <p key={section.id + '-p-' + pidx} class="text-body docs-paragraph">
                        {p}
                      </p>
                    );
                  })}

                  {section.bullets && section.bullets.length > 0 && (
                    <ul class="docs-list">
                      {section.bullets.map(function (item, bidx) {
                        return <li key={section.id + '-b-' + bidx}>{item}</li>;
                      })}
                    </ul>
                  )}

                  {section.note && <p class="docs-note text-code">{section.note}</p>}

                  {section.code && (
                    <pre class="code-block docs-code-block">
                      <code>{section.code}</code>
                    </pre>
                  )}
                </section>
              );
            })}
          </sl-card>

          <sl-card class="docs-panel docs-sidebar docs-sidebar--right">
            <h2 class="text-body-lg">Quick Actions</h2>
            <p class="text-body text-muted">Jump into product workflows directly.</p>
            <div class="docs-quick-actions">
              <sl-button variant="primary" onClick={function () { props.onNavigate('/app'); }}>
                Open Generator
              </sl-button>
              <sl-button variant="default" onClick={function () { props.onNavigate('/'); }}>
                Back to Landing
              </sl-button>
            </div>
          </sl-card>
        </div>
      </section>

      <Footer mode="docs" onNavigate={props.onNavigate} />
    </div>
  );
}
