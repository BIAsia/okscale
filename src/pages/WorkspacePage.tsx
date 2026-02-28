import { useMemo, useState } from 'preact/hooks';
import { ExportPanel } from '../components/ExportPanel';
import { Footer } from '../components/Footer';
import { Generator, type GeneratorProps } from '../components/Generator';
import { Nav } from '../components/Nav';
import { type ExportFormat, formatFullExport } from '../lib/export';
import type { FullPalette } from '../lib/palette';

type WorkspacePageProps = {
  onNavigate: (to: string) => void;
  palette: FullPalette | null;
} & GeneratorProps;

export function WorkspacePage(props: WorkspacePageProps) {
  var copiedState = useState(false);
  var copied = copiedState[0];
  var setCopied = copiedState[1];

  var quickCss = useMemo(function () {
    if (!props.palette) {
      return '// Generate a palette first';
    }
    return formatFullExport('css' as ExportFormat, props.palette);
  }, [props.palette]);

  async function copyQuickCss() {
    try {
      await navigator.clipboard.writeText(quickCss);
      setCopied(true);
      window.setTimeout(function () {
        setCopied(false);
      }, 1200);
    } catch (_err) {
      window.alert('Clipboard access failed.');
    }
  }

  return (
    <div class="page-wrap workspace-page">
      <Nav mode="workspace" onNavigate={props.onNavigate} />

      <section class="section workspace-topbar">
        <div class="section-inner workspace-topbar-inner">
          <div class="workspace-topbar-copy">
            <h1 class="text-section">Generator Workspace</h1>
            <p class="text-body text-muted">Tune your palette on the left, export from the sticky panel on the right.</p>
          </div>
          <button type="button" class="btn btn-accent" onClick={copyQuickCss}>
            {copied ? 'CSS copied' : 'Copy CSS now'}
          </button>
        </div>
      </section>

      <section class="workspace-layout-section">
        <div class="section-inner workspace-layout">
          <div class="workspace-main">
            <Generator
              colorInput={props.colorInput}
              colorError={props.colorError}
              primaryOklch={props.primaryOklch}
              palette={props.palette}
              harmony={props.harmony}
              gradients={props.gradients}
              shadeMode={props.shadeMode}
              harmonyType={props.harmonyType}
              onColorChange={props.onColorChange}
              onShadeModeChange={props.onShadeModeChange}
              onHarmonyTypeChange={props.onHarmonyTypeChange}
            />
          </div>
          <div class="workspace-aside">
            <ExportPanel palette={props.palette} />
          </div>
        </div>
      </section>

      <Footer mode="workspace" onNavigate={props.onNavigate} />
    </div>
  );
}
