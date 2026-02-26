import { useMemo, useState } from 'preact/hooks';
import { EXPORT_FORMATS, type ExportFormat, formatExport } from '../lib/export';
import type { FullPalette } from '../lib/palette';
import type { ScaleColor } from '../lib/scale';

type Props = {
  paletteName: string;
  palette: FullPalette | null;
  scale: ScaleColor[];
};

function labelFor(format: ExportFormat): string {
  if (format === 'tokens') return 'Design Tokens';
  if (format === 'tailwind') return 'Tailwind';
  if (format === 'figma') return 'Figma';
  if (format === 'scss') return 'SCSS';
  return 'CSS';
}

export function ExportSection(props: Props) {
  var state = useState<ExportFormat>('css');
  var activeFormat = state[0];
  var setActiveFormat = state[1];
  var copiedState = useState(false);
  var copied = copiedState[0];
  var setCopied = copiedState[1];

  var code = useMemo(function () {
    return formatExport(activeFormat, props.paletteName, props.scale);
  }, [activeFormat, props.paletteName, props.scale]);

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

  return (
    <section id="export" class="section">
      <h2>Export</h2>
      <div class="export-actions">
        {EXPORT_FORMATS.map(function (format) {
          return (
            <button
              type="button"
              key={format}
              class={format === activeFormat ? 'active' : ''}
              onClick={function () {
                setActiveFormat(format);
              }}
            >
              {labelFor(format)}
            </button>
          );
        })}
        <button type="button" class="copy" onClick={copyCode}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre class="code-block"><code>{code}</code></pre>
    </section>
  );
}
