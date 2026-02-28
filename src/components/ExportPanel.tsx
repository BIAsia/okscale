import { useMemo, useState } from 'preact/hooks';
import {
  EXPORT_FORMATS,
  NAMING_PRESETS,
  type ExportFormat,
  type NamingPreset,
  formatFullExport
} from '../lib/export';
import type { FullPalette } from '../lib/palette';

type ExportPanelProps = {
  palette: FullPalette | null;
};

function labelFor(format: ExportFormat): string {
  if (format === 'tokens') return 'Design Tokens';
  if (format === 'tailwind') return 'Tailwind';
  if (format === 'figma') return 'Figma';
  if (format === 'scss') return 'SCSS';
  return 'CSS';
}

function namingLabel(preset: NamingPreset): string {
  if (preset === 'semantic') return 'Semantic';
  return 'Numeric';
}

function filenameFor(format: ExportFormat, namingPreset: NamingPreset): string {
  var suffix = namingPreset === 'semantic' ? '-semantic' : '-numeric';
  if (format === 'tailwind') return 'okscale-tailwind.config' + suffix + '.ts';
  if (format === 'tokens') return 'okscale-tokens' + suffix + '.json';
  if (format === 'figma') return 'okscale-figma-variables' + suffix + '.json';
  if (format === 'scss') return 'okscale-palette' + suffix + '.scss';
  return 'okscale-palette' + suffix + '.css';
}

export function ExportPanel(props: ExportPanelProps) {
  var formatState = useState<ExportFormat>('css');
  var activeFormat = formatState[0];
  var setActiveFormat = formatState[1];

  var namingState = useState<NamingPreset>('numeric');
  var namingPreset = namingState[0];
  var setNamingPreset = namingState[1];

  var copiedState = useState(false);
  var copied = copiedState[0];
  var setCopied = copiedState[1];

  var code = useMemo(function () {
    if (!props.palette) {
      return '// Generate a palette to unlock export output.';
    }
    return formatFullExport(activeFormat, props.palette, namingPreset);
  }, [activeFormat, namingPreset, props.palette]);

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
    link.download = filenameFor(activeFormat, namingPreset);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  }

  return (
    <aside class="card export-panel-sticky flex flex-col gap-md" aria-label="Export panel">
      <div class="flex flex-col gap-sm">
        <h2 class="text-body-lg">Export</h2>
        <p class="text-body text-muted">Keep this panel open while tuning your palette.</p>
      </div>

      <div class="format-tabs">
        {EXPORT_FORMATS.map(function (format) {
          var active = format === activeFormat;
          return (
            <button
              type="button"
              key={format}
              class={active ? 'btn btn-primary tab-button' : 'btn btn-secondary tab-button'}
              onClick={function () {
                setActiveFormat(format);
              }}
            >
              {labelFor(format)}
            </button>
          );
        })}
      </div>

      <div class="naming-tabs" role="group" aria-label="Token naming preset">
        {NAMING_PRESETS.map(function (preset) {
          var active = preset === namingPreset;
          return (
            <button
              type="button"
              key={preset}
              class={active ? 'btn btn-primary tab-button' : 'btn btn-secondary tab-button'}
              onClick={function () {
                setNamingPreset(preset);
              }}
            >
              {namingLabel(preset)}
            </button>
          );
        })}
      </div>

      <pre class="code-block export-code"><code>{code}</code></pre>

      <div class="flex gap-sm workspace-export-actions">
        <button type="button" class="btn btn-primary" onClick={copyCode} aria-live="polite">
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button type="button" class="btn btn-secondary" onClick={downloadCode}>
          Download
        </button>
      </div>
    </aside>
  );
}
