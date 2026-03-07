import { useMemo, useState } from 'preact/hooks';
import { Footer } from '../components/Footer';
import { Nav } from '../components/Nav';
import { CodeBlock } from '../components/CodeBlock';

type DocsPageProps = {
  onNavigate: (to: string) => void;
};

type DocSection = {
  id: string;
  title: string;
  desc: string;
  tags: string[];
  code: string;
  language: string;
};

var DOC_SECTIONS: DocSection[] = [
  {
    id: 'css-variables',
    title: 'CSS Variables',
    desc: 'Paste generated variables and consume with semantic aliases.',
    tags: ['css', 'variables', 'tokens', 'styles'],
    language: 'css',
    code: `:root {
  --primary-50: #f3f7ff;
  --primary-500: #3b82f6;
  --primary-900: #0f2140;
}

.button-primary {
  background: var(--primary-600);
  color: var(--primary-50);
}`
  },
  {
    id: 'tailwind',
    title: 'Tailwind',
    desc: 'Extend your theme colors with numeric or semantic token scales.',
    tags: ['tailwind', 'utility', 'config'],
    language: 'javascript',
    code: `export default {
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
};`
  },
  {
    id: 'design-tokens',
    title: 'Design Tokens JSON',
    desc: 'Use W3C token shape in build pipelines and design tooling.',
    tags: ['json', 'w3c', 'tokens', 'pipeline'],
    language: 'json',
    code: `{
  "$schema": "https://tr.designtokens.org/format/",
  "primary": {
    "500": { "value": "#3b82f6", "type": "color" }
  }
}`
  },
  {
    id: 'figma-variables',
    title: 'Figma Variables',
    desc: 'Import JSON output into your Figma variable collection workflow.',
    tags: ['figma', 'variables', 'design'],
    language: 'json',
    code: `{
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
}`
  }
];

function includesQuery(section: DocSection, query: string): boolean {
  if (!query) return true;
  var normalized = query.toLowerCase();
  if (section.title.toLowerCase().indexOf(normalized) >= 0) return true;
  if (section.desc.toLowerCase().indexOf(normalized) >= 0) return true;
  return section.tags.some(function (tag) {
    return tag.indexOf(normalized) >= 0;
  });
}

export function DocsPage(props: DocsPageProps) {
  var searchState = useState('');
  var search = searchState[0];
  var setSearch = searchState[1];

  var visibleSections = useMemo(function () {
    return DOC_SECTIONS.filter(function (section) {
      return includesQuery(section, search);
    });
  }, [search]);

  return (
    <div class="page-wrap docs-page">
      <Nav mode="docs" onNavigate={props.onNavigate} />

      <section class="section docs-hero">
        <div class="section-inner flex flex-col gap-md">
          <h1 class="text-section">Docs</h1>
          <p class="text-body text-muted">
            Searchable integration snippets for shipping OKScale tokens in production stacks.
          </p>
          <div class="docs-search-row" role="search">
            <div class="docs-search-wrapper">
              <svg class="docs-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M7 12C9.76142 12 12 9.76142 12 7C12 4.23858 9.76142 2 7 2C4.23858 2 2 4.23858 2 7C2 9.76142 4.23858 12 7 12Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M14 14L10.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <input
                class="text-code docs-search-input"
                value={search}
                onInput={function (event) {
                  setSearch((event.currentTarget as HTMLInputElement).value);
                }}
                placeholder="Search docs: tailwind, figma, css, tokens..."
                spellcheck={false}
                aria-label="Search documentation"
              />
            </div>
            <button
              type="button"
              class="btn btn-secondary"
              onClick={function () {
                setSearch('');
              }}
              aria-label="Clear search"
            >
              Clear
            </button>
          </div>
        </div>
      </section>

      <section class="section docs-layout-section">
        <div class="section-inner docs-layout">
          <aside class="card docs-nav-card">
            <h2 class="text-body-lg">Navigation</h2>
            <p class="text-body text-muted">Jump to matching integration blocks.</p>
            <nav class="docs-nav-list" aria-label="Documentation sections">
              {visibleSections.map(function (section) {
                return (
                  <a key={section.id} href={'#' + section.id} class="docs-nav-link text-code">
                    {section.title}
                  </a>
                );
              })}
            </nav>
          </aside>

          <div class="docs-content-grid">
            {visibleSections.length ? (
              visibleSections.map(function (section) {
                return (
                  <article key={section.id} id={section.id} class="card docs-snippet-card flex flex-col gap-sm">
                    <h2 class="text-body-lg">{section.title}</h2>
                    <p class="text-body text-muted">{section.desc}</p>
                    <CodeBlock code={section.code} language={section.language} />
                  </article>
                );
              })
            ) : (
              <article class="card flex flex-col gap-sm">
                <h2 class="text-body-lg">No matching snippets</h2>
                <p class="text-body text-muted">Try a broader keyword like "css", "tailwind", "tokens", or "figma".</p>
              </article>
            )}
          </div>
        </div>
      </section>

      <section class="section docs-cta">
        <div class="section-inner">
          <article class="card-dark flex flex-col gap-md">
            <h2 class="text-sub">Need a full token pack?</h2>
            <p class="text-body" style="color: var(--ok-neutral-200);">
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
