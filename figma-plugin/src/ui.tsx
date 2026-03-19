import { h, render } from 'preact';

import { parseColorInput, rgbToHex, rgbToOklch, oklchToRgb } from '../../src/lib/color';
import { generateFullPalette, type FullPalette, type NeutralMode } from '../../src/lib/palette';
import { nearestScaleStepForLightness, type AnchorBehavior, type ScaleColor } from '../../src/lib/scale';
import { type ShadeMode, SHADE_MODES } from '../../src/lib/shades';
import { type HarmonyType, HARMONY_TYPES, generateHarmony } from '../../src/lib/harmony';
import { gradientFromHarmony, gradientFromHarmonyVivid, gradientFromPair, type GradientResult } from '../../src/lib/gradient';
import { contrastRatio } from '../../src/lib/contrast';
import { formatFullExport, type NamingPreset } from '../../src/lib/export';
import type { SerializedPalette, SerializedRole } from './messages';

/* ── App State ── */

type AppState = {
  colorInput: string;
  shadeMode: ShadeMode;
  harmonyType: HarmonyType;
  anchorBehavior: AnchorBehavior;
  neutralMode: NeutralMode;
  namingPreset: NamingPreset;
  localL: number;
  localC: number;
  localH: number;
  colorHistory: string[];
  exportOpen: boolean;
  lchExpanded: boolean;
};

let state: AppState = {
  colorInput: '#d9ff00',
  shadeMode: 'natural',
  harmonyType: 'tetradic',
  anchorBehavior: 'preserve-input',
  neutralMode: 'keep-hue',
  namingPreset: 'numeric',
  localL: 0.94,
  localC: 0.23,
  localH: 110,
  colorHistory: ['#d9ff00'],
  exportOpen: false,
  lchExpanded: false,
};

function setState(patch: Partial<AppState>) {
  Object.assign(state, patch);
  rerender();
}

function pushHistory(hex: string) {
  const hist = [hex, ...state.colorHistory.filter((h) => h !== hex)].slice(0, 8);
  setState({ colorHistory: hist });
}

/* ── CSS Token injection (mirrors web app's applyAllTokens) ── */

function applyThemeTokens(palette: FullPalette) {
  const root = document.documentElement;
  const roles = ['primary', 'secondary', 'accent', 'neutral'] as const;

  for (const role of roles) {
    for (const item of palette[role].scale) {
      root.style.setProperty('--ok-' + role + '-' + item.step, item.hex);
    }
  }

  const primaryScale = palette.primary.scale;
  const fallback = primaryScale[Math.min(5, primaryScale.length - 1)];
  const highlight = fallback ? fallback.hex : '#000';
  root.style.setProperty('--ok-highlight', highlight);

  let bestFg = '#000';
  let bestFgRatio = 0;
  for (const s of primaryScale) {
    const r = contrastRatio(s.hex, highlight);
    if (r > bestFgRatio) { bestFgRatio = r; bestFg = s.hex; }
  }
  root.style.setProperty('--ok-highlight-fg', bestFg);

  const neutralBg = palette.neutral.scale[0]?.hex ?? '#fafafa';
  let bestOnNeutral = highlight;
  let bestOnNeutralRatio = contrastRatio(highlight, neutralBg);
  if (bestOnNeutralRatio < 4.5) {
    for (const s of primaryScale) {
      const r = contrastRatio(s.hex, neutralBg);
      if (r > bestOnNeutralRatio) { bestOnNeutralRatio = r; bestOnNeutral = s.hex; }
    }
  }
  root.style.setProperty('--ok-highlight-text', bestOnNeutral);

  const secondaryScale = palette.secondary.scale;
  let bestSecText = palette.secondary.baseHex;
  let bestSecRatio = contrastRatio(bestSecText, neutralBg);
  if (bestSecRatio < 4.5) {
    for (const s of secondaryScale) {
      const r = contrastRatio(s.hex, neutralBg);
      if (r > bestSecRatio) { bestSecRatio = r; bestSecText = s.hex; }
    }
  }
  root.style.setProperty('--ok-secondary-text', bestSecText);
}

/* ── Derived data ── */

function computeDerived() {
  const parsedRgb = parseColorInput(state.colorInput);
  const primaryOklch = parsedRgb ? rgbToOklch(parsedRgb) : null;
  const anchorStep = primaryOklch ? nearestScaleStepForLightness(primaryOklch.l) : 500;
  const palette = primaryOklch && parsedRgb
    ? generateFullPalette(primaryOklch, state.shadeMode, {
        behavior: state.anchorBehavior,
        anchorHex: rgbToHex(parsedRgb),
        anchorStep,
      }, state.neutralMode, state.harmonyType)
    : null;
  const harmony = primaryOklch ? generateHarmony(primaryOklch, state.harmonyType) : null;

  let gradients: GradientResult[] = [];
  if (harmony && palette) {
    const n50 = palette.neutral.scale.find((s) => s.step === 50);
    const n50Lch = n50 ? n50.lch : { l: 0.97, c: 0.005, h: palette.neutral.base.h };
    gradients = [
      gradientFromHarmony(harmony),
      gradientFromHarmonyVivid(harmony),
      gradientFromPair(palette.primary.base, n50Lch),
    ];
  }

  return { parsedRgb, primaryOklch, palette, harmony, gradients };
}

function serializePalette(palette: FullPalette): SerializedPalette {
  function role(entry: FullPalette[keyof FullPalette]): SerializedRole {
    return {
      role: entry.role,
      label: entry.label,
      baseHex: entry.baseHex,
      scale: entry.scale.map((s) => ({ step: s.step, hex: s.hex })),
    };
  }
  return { primary: role(palette.primary), secondary: role(palette.secondary), accent: role(palette.accent), neutral: role(palette.neutral) };
}

/* ── Color helpers ── */

function copyToClipboard(text: string) {
  // execCommand is synchronous and reliable in Figma's plugin iframe
  const el = document.createElement('textarea');
  el.value = text;
  el.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
  document.body.appendChild(el);
  el.focus();
  el.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
  document.body.removeChild(el);

  if (ok) {
    postToPlugin({ type: 'notify-user', message: 'Copied!' });
    return;
  }
  // Fallback: async clipboard API
  navigator.clipboard?.writeText(text).then(
    () => postToPlugin({ type: 'notify-user', message: 'Copied!' }),
    () => postToPlugin({ type: 'notify-user', message: 'Copy failed', error: true }),
  );
}

function postToPlugin(msg: any) {
  parent.postMessage({ pluginMessage: msg }, '*');
}

function applyColor(hex: string) {
  postToPlugin({ type: 'apply-fill', hex });
  copyToClipboard(hex);
}

function contrastTextColor(hex: string): string {
  const rgb = parseColorInput(hex);
  if (!rgb) return '#000000';
  const lum = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
  return lum > 0.35 ? '#000000' : '#ffffff';
}

function onColorInput(val: string) {
  const rgb = parseColorInput(val);
  if (rgb) {
    const lch = rgbToOklch(rgb);
    setState({ colorInput: val, localL: lch.l, localC: lch.c, localH: lch.h });
  } else {
    setState({ colorInput: val });
  }
}

function onColorCommit(val: string) {
  const rgb = parseColorInput(val);
  if (rgb) {
    const hex = rgbToHex(rgb);
    const lch = rgbToOklch(rgb);
    setState({ colorInput: hex, localL: lch.l, localC: lch.c, localH: lch.h });
    pushHistory(hex);
  }
}

function applyLCH(l: number, c: number, hue: number) {
  const hex = rgbToHex(oklchToRgb({ l, c, h: hue }));
  setState({ colorInput: hex, localL: l, localC: c, localH: hue });
  // Commit to history on slider stop (debounce via existing pushHistory)
}

function resetState() {
  const hex = '#d9ff00';
  const rgb = parseColorInput(hex)!;
  const lch = rgbToOklch(rgb);
  setState({
    colorInput: hex,
    shadeMode: 'natural',
    harmonyType: 'tetradic',
    anchorBehavior: 'preserve-input',
    neutralMode: 'keep-hue',
    localL: lch.l,
    localC: lch.c,
    localH: lch.h,
    lchExpanded: false,
  });
}

function onUploadImage(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const cx = Math.floor(img.width / 2);
      const cy = Math.floor(img.height / 2);
      const [r, g, b] = ctx.getImageData(cx, cy, 1, 1).data;
      const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
      onColorCommit(hex);
    };
    img.src = ev.target?.result as string;
  };
  reader.readAsDataURL(file);
  (e.target as HTMLInputElement).value = '';
}

function buildAgentPrompt(): string {
  const payload = JSON.stringify({
    colorInput: state.colorInput,
    shadeMode: state.shadeMode,
    harmonyType: state.harmonyType,
    anchorBehavior: state.anchorBehavior,
  }, null, 2);
  return [
    'Use OKScale to generate a color system.',
    'Run generate_palette with this payload:',
    payload,
    'Then summarize primary/secondary/accent/neutral in plain language.',
  ].join('\n');
}

/* ── Chevron SVG ── */
function Chevron(props: { expanded?: boolean } = {}) {
  return h('svg', {
    class: 'chevron-icon' + (props.expanded ? ' expanded' : ''),
    width: '8', height: '8', viewBox: '0 0 8 8', fill: 'none',
  },
    h('path', { d: 'M1.5 3L4 5.5L6.5 3', stroke: 'currentColor', 'stroke-width': '1.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
  );
}

/* ── LCH Sliders ── */
function LCHSliders() {
  return h('div', { class: 'lch-section' },
    // L
    h('div', { class: 'lch-row' },
      h('div', { class: 'lch-label-row' },
        h('span', { class: 'lch-label' }, 'L'),
        h('span', { class: 'lch-value' }, (state.localL * 100).toFixed(1)),
      ),
      h('input', {
        class: 'lch-slider',
        type: 'range', min: '0', max: '1', step: '0.001',
        value: String(state.localL),
        onInput: (e: Event) => { const v = parseFloat((e.target as HTMLInputElement).value); applyLCH(v, state.localC, state.localH); },
      }),
    ),
    // C
    h('div', { class: 'lch-row' },
      h('div', { class: 'lch-label-row' },
        h('span', { class: 'lch-label' }, 'C'),
        h('span', { class: 'lch-value' }, (state.localC * 100).toFixed(1)),
      ),
      h('input', {
        class: 'lch-slider',
        type: 'range', min: '0', max: '0.4', step: '0.001',
        value: String(state.localC),
        onInput: (e: Event) => { const v = parseFloat((e.target as HTMLInputElement).value); applyLCH(state.localL, v, state.localH); },
      }),
    ),
    // H
    h('div', { class: 'lch-row' },
      h('div', { class: 'lch-label-row' },
        h('span', { class: 'lch-label' }, 'H'),
        h('span', { class: 'lch-value' }, state.localH.toFixed(1)),
      ),
      h('input', {
        class: 'lch-slider',
        type: 'range', min: '0', max: '360', step: '0.1',
        value: String(state.localH),
        onInput: (e: Event) => { const v = parseFloat((e.target as HTMLInputElement).value); applyLCH(state.localL, state.localC, v); },
      }),
    ),
  );
}

/* ── Sidebar ── */

function Sidebar(d: ReturnType<typeof computeDerived>) {
  const previewHex = d.palette?.primary.baseHex ?? (parseColorInput(state.colorInput) ? state.colorInput : '#d9ff00');
  const harmonyLabel = (HARMONY_TYPES as readonly { id: string; label: string }[]).find((t) => t.id === state.harmonyType)?.label ?? 'Harmony';
  const shadeModeLabel = (SHADE_MODES as readonly { id: string; label: string }[]).find((s) => s.id === state.shadeMode)?.label ?? 'Natural';
  const harmonyColors = d.harmony ? d.harmony.colors.slice(0, 3).map((c) => c.hex) : ['#ccc', '#ccc', '#ccc'];

  return h('div', { class: 'sidebar' },
    h('div', { class: 'sidebar-content' },

      /* ── Color input row ── */
      h('div', { class: 'sidebar-row row-color' },
        h('div', { class: 'row-color-inner' },
          h('div', { class: 'color-swatch', style: { background: previewHex } },
            h('input', {
              type: 'color',
              value: previewHex,
              onInput: (e: Event) => onColorInput((e.target as HTMLInputElement).value),
              onChange: (e: Event) => onColorCommit((e.target as HTMLInputElement).value),
            }),
          ),
          h('input', {
            class: 'hex-field',
            value: state.colorInput,
            spellcheck: 'false',
            onInput: (e: Event) => onColorInput((e.target as HTMLInputElement).value),
            onBlur: (e: Event) => onColorCommit((e.target as HTMLInputElement).value),
            onKeyDown: (e: KeyboardEvent) => { if (e.key === 'Enter') onColorCommit((e.target as HTMLInputElement).value); },
          }),
          h('button', {
            class: 'chevron-btn',
            onClick: () => setState({ lchExpanded: !state.lchExpanded }),
            title: state.lchExpanded ? 'Hide LCH sliders' : 'Show LCH sliders',
          }, Chevron({ expanded: state.lchExpanded })),
        ),
      ),

      /* ── LCH sliders (collapsible) ── */
      state.lchExpanded ? LCHSliders() : null,

      /* ── Harmony row ── */
      h('div', { class: 'sidebar-row row-select' },
        h('div', { class: 'row-left' },
          h('span', { class: 'row-label' }, harmonyLabel),
          h('div', { class: 'harmony-dots' },
            ...harmonyColors.map((hex) =>
              h('span', { class: 'harmony-dot', style: { background: hex } }),
            ),
          ),
        ),
        Chevron(),
        h('select', {
          class: 'row-select-overlay',
          onChange: (e: Event) => setState({ harmonyType: (e.target as HTMLSelectElement).value as HarmonyType }),
        },
          ...(HARMONY_TYPES as readonly { id: string; label: string }[]).map((t) =>
            h('option', { value: t.id, selected: t.id === state.harmonyType }, t.label),
          ),
        ),
      ),

      /* ── Shade mode row ── */
      h('div', { class: 'sidebar-row row-select' },
        h('div', { class: 'row-left' },
          h('span', { class: 'row-label' }, shadeModeLabel),
        ),
        Chevron(),
        h('select', {
          class: 'row-select-overlay',
          onChange: (e: Event) => setState({ shadeMode: (e.target as HTMLSelectElement).value as ShadeMode }),
        },
          ...(SHADE_MODES as readonly { id: string; label: string }[]).map((s) =>
            h('option', { value: s.id, selected: s.id === state.shadeMode }, s.label),
          ),
        ),
      ),

      /* ── Anchor section ── */
      h('div', { class: 'sidebar-section' },
        h('div', { class: 'toggle-row', onClick: () => setState({ anchorBehavior: 'preserve-input' }) },
          h('span', { class: 'toggle-indicator' }, state.anchorBehavior === 'preserve-input' ? '[*]' : '[ ]'),
          h('span', { class: 'toggle-label' }, 'Keep input color'),
        ),
        h('div', { class: 'toggle-row', onClick: () => setState({ anchorBehavior: 'auto-gamut' }) },
          h('span', { class: 'toggle-indicator' }, state.anchorBehavior === 'auto-gamut' ? '[*]' : '[ ]'),
          h('span', { class: 'toggle-label' }, 'Auto gamut'),
        ),
      ),

      /* ── Neutral section ── */
      h('div', { class: 'sidebar-section' },
        h('div', { class: 'toggle-row', onClick: () => setState({ neutralMode: 'keep-hue' }) },
          h('span', { class: 'toggle-indicator' }, state.neutralMode === 'keep-hue' ? '[*]' : '[ ]'),
          h('span', { class: 'toggle-label' }, 'Keep hue'),
        ),
        h('div', { class: 'toggle-row', onClick: () => setState({ neutralMode: 'absolute-gray' }) },
          h('span', { class: 'toggle-indicator' }, state.neutralMode === 'absolute-gray' ? '[*]' : '[ ]'),
          h('span', { class: 'toggle-label' }, 'Absolute gray'),
        ),
      ),

      /* ── History section ── */
      h('div', { class: 'sidebar-section history-section' },
        h('div', { class: 'history-header' },
          h('span', { class: 'history-title' }, 'History'),
          h('button', { class: 'clear-btn', onClick: () => setState({ colorHistory: [] }) }, 'Clear'),
        ),
        h('div', { class: 'history-chips' },
          ...state.colorHistory.map((hex) =>
            h('div', { class: 'history-chip', title: hex, onClick: () => onColorCommit(hex) },
              h('span', { class: 'history-chip-dot', style: { background: hex } }),
              h('span', { class: 'history-chip-label' }, hex),
            ),
          ),
        ),
      ),
    ),

    /* ── Sidebar footer ── */
    h('div', { class: 'sidebar-footer' },
      h('label', { class: 'sidebar-btn-upload', for: 'upload-input' }, 'Upload image'),
      h('input', { id: 'upload-input', type: 'file', accept: 'image/*', style: { display: 'none' }, onChange: onUploadImage }),
      h('button', { class: 'sidebar-btn-reset', onClick: resetState }, 'Reset'),
    ),
  );
}

/* ── Circle scale row ── */

function bestTextColorFromScale(bgHex: string, scale: ScaleColor[]): string {
  let best = scale[0]?.hex ?? '#000000';
  let bestRatio = 0;
  for (const s of scale) {
    const r = contrastRatio(s.hex, bgHex);
    if (r > bestRatio) { bestRatio = r; best = s.hex; }
  }
  return best;
}

function CircleScaleRow(props: { label: string; baseHex: string; scale: ScaleColor[] }) {
  return h('div', { class: 'scale-row' },
    h('div', { class: 'scale-header' },
      h('span', { class: 'scale-label' }, props.label),
      h('div', { class: 'scale-base-info' },
        h('span', { class: 'base-dot', style: { background: props.baseHex } }),
        h('span', { class: 'base-hex' }, props.baseHex),
      ),
    ),
    h('div', { class: 'scale-circles' },
      ...props.scale.map((s) => {
        const textColor = bestTextColorFromScale(s.hex, props.scale);
        return h('div', {
          class: 'circle-chip',
          style: { background: s.hex },
          title: `${s.step}: ${s.hex}`,
          onClick: () => applyColor(s.hex),
        },
          h('span', { class: 'circle-label', style: { color: textColor } }, String(s.step)),
        );
      }),
    ),
  );
}

/* ── Export dropdown ── */

function ExportDropdown(d: ReturnType<typeof computeDerived>, serialized: SerializedPalette | null) {
  const cssCode = d.palette
    ? formatFullExport('css', d.palette, state.namingPreset)
    : '/* Enter a color to generate a palette */';

  return h('div', { class: 'export-dropdown' },
    h('button', {
      class: 'exp-menu-item',
      onClick: (e: Event) => {
        e.stopPropagation();
        copyToClipboard(cssCode);
        setState({ exportOpen: false });
      },
    },
      h('span', null, 'Export CSS'),
    ),
    serialized ? h('button', {
      class: 'exp-menu-item',
      onClick: (e: Event) => {
        e.stopPropagation();
        postToPlugin({ type: 'apply-variables', palette: serialized });
        setState({ exportOpen: false });
      },
    },
      h('span', null, 'Export Figma Variables'),
    ) : null,
    serialized ? h('button', {
      class: 'exp-menu-item',
      onClick: (e: Event) => {
        e.stopPropagation();
        postToPlugin({ type: 'apply-styles', palette: serialized });
        setState({ exportOpen: false });
      },
    },
      h('span', null, 'Export Figma Color Styles'),
    ) : null,
    h('div', { class: 'exp-menu-divider' }),
    serialized ? h('button', {
      class: 'exp-menu-item',
      onClick: (e: Event) => {
        e.stopPropagation();
        postToPlugin({ type: 'export-to-canvas', palette: serialized });
        setState({ exportOpen: false });
      },
    },
      h('span', null, 'Export to Figma Canvas'),
    ) : null,
  );
}

/* ── Main panel ── */

function MainPanel(d: ReturnType<typeof computeDerived>) {
  const serialized = d.palette ? serializePalette(d.palette) : null;

  return h('div', { class: 'main-panel' },
    h('div', { class: 'main-content' },

      d.palette
        ? CircleScaleRow({ label: 'Primary', baseHex: d.palette.primary.baseHex, scale: d.palette.primary.scale })
        : h('div', { class: 'empty-state' }, 'Enter a valid color to generate a palette.'),

      d.palette ? CircleScaleRow({ label: 'Secondary', baseHex: d.palette.secondary.baseHex, scale: d.palette.secondary.scale }) : null,
      d.palette ? CircleScaleRow({ label: 'Accent', baseHex: d.palette.accent.baseHex, scale: d.palette.accent.scale }) : null,
      d.palette ? CircleScaleRow({ label: 'Neutral', baseHex: d.palette.neutral.baseHex, scale: d.palette.neutral.scale }) : null,

      d.gradients.length >= 3 ? h('div', { class: 'gradients-section' },
        h('div', { class: 'gradients-label' }, 'Gradients'),
        h('div', { class: 'gradient-row' },
          ...d.gradients.slice(0, 3).map((g) =>
            h('div', {
              class: 'gradient-bar',
              style: { backgroundImage: g.css },
              title: 'Click to copy CSS',
              onClick: () => copyToClipboard(g.css),
            }),
          ),
        ),
      ) : null,
    ),

    /* ── Main footer ── */
    h('div', { class: 'main-footer' },
      h('div', { class: 'footer-links' },
        h('a', { class: 'why-link', href: 'https://jakub.kr/components/oklch-colors', target: '_blank' },
          'Why OKLCH ↗',
        ),
        h('span', { class: 'why-link why-link--disabled' }, 'App ↗'),
      ),
      h('div', { class: 'footer-actions' },
        h('a', { class: 'why-link', href: 'https://x.com/lzybiasia', target: '_blank' },
          'Twitter ↗',
        ),
        h('button', {
          class: 'footer-btn footer-btn--outline footer-btn--disabled',
          disabled: true,
        }, 'Connect Agent'),
        h('div', { class: 'export-wrap' },
          h('button', {
            class: 'footer-btn footer-btn--primary',
            onClick: (e: Event) => { e.stopPropagation(); setState({ exportOpen: !state.exportOpen }); },
          }, 'Export ', Chevron({ expanded: state.exportOpen })),
          state.exportOpen ? ExportDropdown(d, serialized) : null,
        ),
      ),
    ),
  );
}

/* ── App ── */

function App() {
  const d = computeDerived();

  // Apply theme tokens whenever palette is available (just sets CSS vars, no re-render)
  if (d.palette) applyThemeTokens(d.palette);

  return h('div', {
    class: 'plugin-root',
    onClick: () => { if (state.exportOpen) setState({ exportOpen: false }); },
  },
    Sidebar(d),
    MainPanel(d),
  );
}

/* ── Render loop ── */

let renderPending = false;
function rerender() {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(() => {
    renderPending = false;
    const app = document.getElementById('app');
    if (app) render(h(App, null), app);
  });
}


/* ── Initial render ── */
const initialRgb = parseColorInput(state.colorInput);
if (initialRgb) {
  const lch = rgbToOklch(initialRgb);
  state.localL = lch.l;
  state.localC = lch.c;
  state.localH = lch.h;
}

rerender();
