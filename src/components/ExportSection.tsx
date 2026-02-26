import { useMemo, useState } from 'preact/hooks';
import { EXPORT_FORMATS, type ExportFormat, formatFullExport } from '../lib/export';
import type { FullPalette } from '../lib/palette';

type ExportSectionProps = {
  palette: FullPalette | null;
};

function labelFor(format: ExportFormat): string {
  if (format === 'tokens') return 'Design Tokens';
  if (format === 'tailwind') return 'Tailwind';
  if (format === 'figma') return 'Figma';
  if (format === 'scss') return 'SCSS';
  return 'CSS';
}

function filenameFor(format: ExportFormat): string {
  if (format === 'tailwind') return 'okscale-tailwind.config.ts';
  if (format === 'tokens') return 'okscale-tokens.json';
  if (format === 'figma') return 'okscale-figma-variables.json';
  if (format === 'scss') return 'okscale-palette.scss';
  return 'okscale-palette.css';
}

export function ExportSection(props: ExportSectionProps) {
  var formatState = useState<ExportFormat>('css');
  var activeFormat = formatState[0];
  var setActiveFormat = formatState[1];

  var copiedState = useState(false);
  var copied = copiedState[0];
  var setCopied = copiedState[1];

  var code = useMemo(function () {
    if (!props.palette) {
      return '// Generate a palette in the Generator section to export your full color system.';
    }
    return formatFullExport(activeFormat, props.palette);
  }, [activeFormat, props.palette]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(function () {
        setCopied(false);
      }, 1200);
    } catch (_err) {
      window.alert('Clipboard access failed. Copy directly from the code panel.');
    }
  }

  function downloadCode() {
    var blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    var href = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = href;
    link.download = filenameFor(activeFormat);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  }

  return (
    <section id="export" class="section">
      <div class="section-inner flex flex-col gap-md">
        <h2 class="text-section">Export</h2>
        <p class="text-body text-muted">Export your complete color system to any format.</p>

        <div class="shade-mode-row">
          {EXPORT_FORMATS.map(function (format) {
            return (
              <button
                type="button"
                key={format}
                class={'btn ' + (format === activeFormat ? 'btn-primary' : 'btn-secondary')}
                onClick={function () {
                  setActiveFormat(format);
                }}
              >
                {labelFor(format)}
              </button>
            );
          })}
        </div>

        <pre class="code-block export-code"><code>{code}</code></pre>

        <div class="flex gap-sm">
          <button type="button" class="btn btn-primary" onClick={copyCode} aria-live="polite">
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>
          <button type="button" class="btn btn-secondary" onClick={downloadCode}>
            Download
          </button>
        </div>
      </div>
    </section>
  );
}
