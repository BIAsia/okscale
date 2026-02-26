type Props = {
  cssText: string;
};

export function ExportPanel(props: Props) {
  async function copyCss() {
    try {
      await navigator.clipboard.writeText(props.cssText);
      const button = document.getElementById('copy-css-btn') as HTMLButtonElement | null;
      if (!button) return;
      button.textContent = 'Copied!';
      window.setTimeout(function () {
        button.textContent = 'Copy CSS';
      }, 1400);
    } catch (_err) {
      window.alert('Clipboard access failed. Copy manually from preview.');
    }
  }

  return (
    <section class="panel">
      <div class="panel-head">
        <h2>Export</h2>
      </div>
      <div class="export-actions">
        <button id="copy-css-btn" type="button" onClick={copyCss}>
          Copy CSS
        </button>
        <button type="button" disabled>
          Tailwind (M2)
        </button>
        <button type="button" disabled>
          Design Tokens (M2)
        </button>
      </div>
      <pre class="code-preview">{props.cssText}</pre>
    </section>
  );
}
