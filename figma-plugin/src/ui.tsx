/* ── Minimal Preact-like h/render for Figma plugin (no dependencies) ── */

type VNode = { tag: string | Function; props: any; children: any[] };
type Child = VNode | string | number | null | undefined | boolean | Child[];

function h(tag: string | Function, props: any, ...children: Child[]): VNode {
  return { tag, props: props || {}, children: children.flat(Infinity).filter((c) => c != null && c !== false && c !== true) };
}

function Fragment(_props: any): any { return null; }

function render(vnode: Child, container: HTMLElement) {
  container.innerHTML = '';
  const el = createElement(vnode);
  if (el) container.appendChild(el);
}

function createElement(vnode: Child): Node | null {
  if (vnode == null || typeof vnode === 'boolean') return null;
  if (typeof vnode === 'string' || typeof vnode === 'number') return document.createTextNode(String(vnode));
  if (Array.isArray(vnode)) {
    const frag = document.createDocumentFragment();
    vnode.forEach((v) => { const n = createElement(v); if (n) frag.appendChild(n); });
    return frag;
  }
  const { tag, props, children } = vnode as VNode;
  if (typeof tag === 'function') {
    if (tag === Fragment) {
      const frag = document.createDocumentFragment();
      children.forEach((c: Child) => { const n = createElement(c); if (n) frag.appendChild(n); });
      return frag;
    }
    return createElement(tag({ ...props, children }));
  }
  const el = document.createElement(tag);
  for (const [key, val] of Object.entries(props)) {
    if (key === 'children') continue;
    if (key === 'class' || key === 'className') { el.className = val as string; continue; }
    if (key === 'style' && typeof val === 'object') {
      for (const [sk, sv] of Object.entries(val as Record<string, string>)) el.style.setProperty(sk.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()), String(sv));
      continue;
    }
    if (key.startsWith('on') && typeof val === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), val as EventListener);
      continue;
    }
    if (key === 'dangerouslySetInnerHTML') { el.innerHTML = (val as any).__html; continue; }
    if (typeof val === 'boolean') { if (val) el.setAttribute(key, ''); }
    else el.setAttribute(key, String(val));
  }
  children.forEach((c: Child) => { const n = createElement(c); if (n) el.appendChild(n); });
  return el;
}

/* ── Import color generation libs from parent src/lib ── */

import { parseColorInput, rgbToHex, rgbToOklch, oklchToRgb, type Oklch } from '../../src/lib/color';
import { generateFullPalette, type FullPalette, type NeutralMode } from '../../src/lib/palette';
import { nearestScaleStepForLightness, type AnchorBehavior, type ScaleColor } from '../../src/lib/scale';
import { type ShadeMode, SHADE_MODES } from '../../src/lib/shades';
import { type HarmonyType, HARMONY_TYPES, generateHarmony, type HarmonyResult } from '../../src/lib/harmony';
import { gradientFromHarmony, gradientFromHarmonyVivid, gradientFromPair, type GradientResult } from '../../src/lib/gradient';
import { buildUsageMatrix, contrastRatio, ratioGrade } from '../../src/lib/contrast';
import { formatFullExport, EXPORT_FORMATS, NAMING_PRESETS, type ExportFormat, type NamingPreset } from '../../src/lib/export';
import type { SerializedPalette, SerializedRole, NotifyMsg } from './messages';

/* ── App State ── */

type AppState = {
  colorInput: string;
  shadeMode: ShadeMode;
  harmonyType: HarmonyType;
  anchorBehavior: AnchorBehavior;
  neutralMode: NeutralMode;
  activeTab: 'palette' | 'preview' | 'contrast' | 'export';
  exportFormat: ExportFormat;
  namingPreset: NamingPreset;
  toast: { message: string; error: boolean } | null;
  localL: number;
  localC: number;
  localH: number;
};

let state: AppState = {
  colorInput: '#d9ff00',
  shadeMode: 'natural',
  harmonyType: 'complementary',
  anchorBehavior: 'preserve-input',
  neutralMode: 'keep-hue',
  activeTab: 'palette',
  exportFormat: 'css',
  namingPreset: 'numeric',
  toast: null,
  localL: 0.5,
  localC: 0.15,
  localH: 180,
};

let toastTimer: ReturnType<typeof setTimeout> | null = null;

function setState(patch: Partial<AppState>) {
  Object.assign(state, patch);
  rerender();
}

function showToast(message: string, error = false) {
  if (toastTimer) clearTimeout(toastTimer);
  setState({ toast: { message, error } });
  toastTimer = setTimeout(() => {
    setState({ toast: null });
    toastTimer = null;
  }, 2500);
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

  const colorError = parsedRgb
    ? ''
    : state.colorInput.trim() ? 'Invalid color. Try #3b82f6, rgb(59,130,246), hsl(217,91%,60%), oklch(0.62 0.19 259).' : '';

  const usageRows = palette ? buildUsageMatrix(palette.primary.scale) : [];

  const exportCode = palette
    ? formatFullExport(state.exportFormat, palette, state.namingPreset)
    : '/* Enter a color to generate a palette */';

  return { parsedRgb, primaryOklch, anchorStep, palette, harmony, gradients, colorError, usageRows, exportCode };
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

/* ── Copy helper ── */

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(
    () => showToast('Copied!'),
    () => showToast('Copy failed', true),
  );
}

/* ── Post message to plugin code ── */

function postToPlugin(msg: any) {
  parent.postMessage({ pluginMessage: msg }, '*');
}

/* ── Components ── */

function ColorInputSection(d: ReturnType<typeof computeDerived>) {
  const previewHex = d.palette ? d.palette.primary.baseHex : state.colorInput;
  return h('div', { class: 'color-input-section' },
    h('div', { class: 'color-swatch-wrap', style: { background: previewHex } },
      h('input', {
        type: 'color',
        value: previewHex,
        onInput: (e: Event) => {
          const val = (e.target as HTMLInputElement).value;
          const rgb = parseColorInput(val);
          if (rgb) {
            const lch = rgbToOklch(rgb);
            setState({ colorInput: val, localL: lch.l, localC: lch.c, localH: lch.h });
          } else {
            setState({ colorInput: val });
          }
        },
      }),
    ),
    h('input', {
      class: 'hex-input',
      value: state.colorInput,
      placeholder: '#d9ff00',
      spellcheck: 'false',
      onInput: (e: Event) => {
        const val = (e.target as HTMLInputElement).value;
        const rgb = parseColorInput(val);
        if (rgb) {
          const lch = rgbToOklch(rgb);
          setState({ colorInput: val, localL: lch.l, localC: lch.c, localH: lch.h });
        } else {
          setState({ colorInput: val });
        }
      },
    }),
  );
}

function LCHSliders() {
  function applyLCH(l: number, c: number, hue: number) {
    const hex = rgbToHex(oklchToRgb({ l, c, h: hue }));
    setState({ colorInput: hex, localL: l, localC: c, localH: hue });
  }

  return h('div', { class: 'lch-sliders' },
    // L
    h('div', { class: 'lch-row' },
      h('div', { class: 'lch-label-row' }, h('span', null, 'L'), h('span', null, (state.localL * 100).toFixed(1))),
      h('input', { class: 'lch-slider', type: 'range', min: '0', max: '1', step: '0.001', value: String(state.localL),
        onInput: (e: Event) => { const v = parseFloat((e.target as HTMLInputElement).value); applyLCH(v, state.localC, state.localH); },
      }),
    ),
    // C
    h('div', { class: 'lch-row' },
      h('div', { class: 'lch-label-row' }, h('span', null, 'C'), h('span', null, (state.localC * 100).toFixed(1))),
      h('input', { class: 'lch-slider', type: 'range', min: '0', max: '0.4', step: '0.001', value: String(state.localC),
        onInput: (e: Event) => { const v = parseFloat((e.target as HTMLInputElement).value); applyLCH(state.localL, v, state.localH); },
      }),
    ),
    // H
    h('div', { class: 'lch-row' },
      h('div', { class: 'lch-label-row' }, h('span', null, 'H'), h('span', null, state.localH.toFixed(1))),
      h('input', { class: 'lch-slider', type: 'range', min: '0', max: '360', step: '0.1', value: String(state.localH),
        onInput: (e: Event) => { const v = parseFloat((e.target as HTMLInputElement).value); applyLCH(state.localL, state.localC, v); },
      }),
    ),
  );
}

function OptionsSection() {
  return h('div', { class: 'flex-col gap-md' },
    // Shade Mode
    h('div', { class: 'options-section' },
      h('div', { class: 'section-label' }, 'Shade Mode'),
      h('div', { class: 'options-row' },
        ...SHADE_MODES.map((m) =>
          h('button', {
            class: 'chip-btn' + (state.shadeMode === m.id ? ' active' : ''),
            onClick: () => setState({ shadeMode: m.id }),
          }, m.label),
        ),
      ),
    ),
    // Harmony
    h('div', { class: 'options-section' },
      h('div', { class: 'section-label' }, 'Harmony'),
      h('div', { class: 'options-row' },
        ...HARMONY_TYPES.map((t) =>
          h('button', {
            class: 'chip-btn' + (state.harmonyType === t.id ? ' active' : ''),
            onClick: () => setState({ harmonyType: t.id }),
          }, t.label),
        ),
      ),
    ),
    // Anchor + Neutral
    h('div', { style: { display: 'flex', gap: '16px' } },
      h('div', { class: 'options-section', style: { flex: '1' } },
        h('div', { class: 'section-label' }, 'Anchor'),
        h('div', { class: 'radio-row' },
          h('button', { class: 'radio-btn' + (state.anchorBehavior === 'preserve-input' ? ' active' : ''), onClick: () => setState({ anchorBehavior: 'preserve-input' }) },
            h('span', { class: 'radio-mark' }, state.anchorBehavior === 'preserve-input' ? '[*]' : '[ ]'), 'Keep input'),
          h('button', { class: 'radio-btn' + (state.anchorBehavior === 'auto-gamut' ? ' active' : ''), onClick: () => setState({ anchorBehavior: 'auto-gamut' }) },
            h('span', { class: 'radio-mark' }, state.anchorBehavior === 'auto-gamut' ? '[*]' : '[ ]'), 'Auto gamut'),
        ),
      ),
      h('div', { class: 'options-section', style: { flex: '1' } },
        h('div', { class: 'section-label' }, 'Neutral'),
        h('div', { class: 'radio-row' },
          h('button', { class: 'radio-btn' + (state.neutralMode === 'keep-hue' ? ' active' : ''), onClick: () => setState({ neutralMode: 'keep-hue' }) },
            h('span', { class: 'radio-mark' }, state.neutralMode === 'keep-hue' ? '[*]' : '[ ]'), 'Tinted'),
          h('button', { class: 'radio-btn' + (state.neutralMode === 'absolute-gray' ? ' active' : ''), onClick: () => setState({ neutralMode: 'absolute-gray' }) },
            h('span', { class: 'radio-mark' }, state.neutralMode === 'absolute-gray' ? '[*]' : '[ ]'), 'Gray'),
        ),
      ),
    ),
  );
}

function ScaleStrip(props: { label: string; baseHex: string; scale: ScaleColor[] }) {
  return h('div', { class: 'flex-col gap-xs' },
    h('div', { class: 'scale-role-header' },
      h('span', { class: 'scale-role-label' }, props.label),
      h('span', { class: 'scale-base-hex text-mono' }, props.baseHex),
    ),
    h('div', { class: 'scale-strip' },
      ...props.scale.map((s) =>
        h('div', {
          class: 'scale-chip',
          style: { background: s.hex },
          title: s.step + ': ' + s.hex,
          onClick: () => copyToClipboard(s.hex),
        },
          h('span', { class: 'scale-chip-label' }, String(s.step)),
        ),
      ),
    ),
  );
}

function PaletteTab(d: ReturnType<typeof computeDerived>) {
  if (!d.palette) return h('div', { class: 'text-muted' }, 'Enter a valid color to generate a palette.');

  const p = d.palette;
  return h('div', { class: 'flex-col gap-md' },
    // Scales
    h('div', { class: 'scale-section' },
      ScaleStrip({ label: 'Primary', baseHex: p.primary.baseHex, scale: p.primary.scale }),
      ScaleStrip({ label: 'Secondary', baseHex: p.secondary.baseHex, scale: p.secondary.scale }),
      ScaleStrip({ label: 'Accent', baseHex: p.accent.baseHex, scale: p.accent.scale }),
      ScaleStrip({ label: 'Neutral', baseHex: p.neutral.baseHex, scale: p.neutral.scale }),
    ),
    // Harmony
    d.harmony ? h('div', { class: 'harmony-section' },
      h('div', { class: 'section-label' }, 'Harmony'),
      h('div', { class: 'harmony-circles' },
        ...d.harmony.colors.map((c) =>
          h('div', {
            class: 'harmony-circle',
            style: { background: c.hex },
            title: c.label + ': ' + c.hex,
            onClick: () => copyToClipboard(c.hex),
          }),
        ),
      ),
    ) : null,
    // Gradients
    d.gradients.length > 0 ? h('div', { class: 'gradient-section' },
      h('div', { class: 'section-label' }, 'Gradients'),
      ...d.gradients.map((g, i) =>
        h('div', {
          class: 'gradient-bar',
          style: { background: g.css },
          title: 'Click to copy CSS',
          onClick: () => copyToClipboard(g.css),
        }),
      ),
    ) : null,
  );
}

function PreviewTab(d: ReturnType<typeof computeDerived>) {
  if (!d.palette) return h('div', { class: 'text-muted' }, 'Enter a valid color to see previews.');

  const p = d.palette;
  function sc(entry: FullPalette[keyof FullPalette], step: number, fallback: string): string {
    const item = entry.scale.find((s) => s.step === step);
    return item ? item.hex : fallback;
  }

  // Light surface preview
  const lightBg = sc(p.neutral, 50, '#fafafa');
  const lightBorder = sc(p.neutral, 200, '#e0e0e0');
  const lightText = sc(p.neutral, 950, '#111');
  const lightMuted = sc(p.neutral, 600, '#666');
  const brandBg = sc(p.primary, 500, '#606060');
  const brandFg = sc(p.primary, 50, '#fff');
  const badgeBg = sc(p.secondary, 100, '#f0f0f0');
  const badgeBorder = sc(p.secondary, 300, '#c0c0c0');
  const badgeText = sc(p.secondary, 700, '#333');
  const btnPrimaryBg = sc(p.primary, 600, '#404040');
  const btnPrimaryFg = sc(p.primary, 50, '#fff');
  const btnSecBorder = sc(p.primary, 400, '#909090');
  const btnSecText = sc(p.primary, 700, '#303030');

  // Dark surface preview
  const darkBg = sc(p.neutral, 950, '#111');
  const darkBorder = sc(p.neutral, 800, '#333');
  const darkText = sc(p.neutral, 50, '#fafafa');
  const darkMuted = sc(p.neutral, 400, '#999');
  const darkBadgeBg = sc(p.secondary, 900, '#141414');
  const darkBadgeBorder = sc(p.secondary, 700, '#303030');
  const darkBadgeText = sc(p.secondary, 200, '#e0e0e0');

  return h('div', { class: 'flex-col gap-md' },
    // Light surface
    h('div', { class: 'preview-card', style: { background: lightBg, borderColor: lightBorder } },
      h('div', { class: 'preview-head' },
        h('span', { style: { fontWeight: '600', fontSize: '13px', color: lightText } }, 'Light Surface'),
        h('span', { class: 'preview-badge', style: { background: badgeBg, border: '1px solid ' + badgeBorder, color: badgeText, fontSize: '10px' } }, 'Badge'),
      ),
      h('p', { style: { fontSize: '11px', color: lightMuted, lineHeight: '1.5' } },
        'Body text on a light neutral background with secondary badge.'),
      h('div', { class: 'preview-actions' },
        h('span', { class: 'preview-btn-primary', style: { background: btnPrimaryBg, color: btnPrimaryFg } }, 'Primary'),
        h('span', { class: 'preview-btn-secondary', style: { background: 'transparent', borderColor: btnSecBorder, color: btnSecText } }, 'Secondary'),
      ),
    ),
    // Dark surface
    h('div', { class: 'preview-card', style: { background: darkBg, borderColor: darkBorder } },
      h('div', { class: 'preview-head' },
        h('span', { style: { fontWeight: '600', fontSize: '13px', color: darkText } }, 'Dark Surface'),
        h('span', { class: 'preview-badge', style: { background: darkBadgeBg, border: '1px solid ' + darkBadgeBorder, color: darkBadgeText, fontSize: '10px' } }, 'Badge'),
      ),
      h('p', { style: { fontSize: '11px', color: darkMuted, lineHeight: '1.5' } },
        'Body text on a dark neutral background with secondary badge.'),
    ),
    // Brand surface
    h('div', { class: 'preview-card', style: { background: brandBg, borderColor: 'transparent' } },
      h('div', { class: 'preview-head' },
        h('span', { style: { fontWeight: '600', fontSize: '13px', color: brandFg } }, 'Brand Surface'),
      ),
      h('p', { style: { fontSize: '11px', color: brandFg, opacity: '0.85', lineHeight: '1.5' } },
        'Text rendered on the primary brand color.'),
    ),
  );
}

function ContrastTab(d: ReturnType<typeof computeDerived>) {
  if (!d.palette) return h('div', { class: 'text-muted' }, 'Enter a valid color to see contrast data.');

  return h('div', { class: 'contrast-section' },
    h('div', { class: 'section-label' }, 'WCAG 2.0 Contrast Recommendations'),
    ...d.usageRows.map((row) =>
      h('div', { class: 'contrast-row' },
        h('span', { class: 'contrast-label' }, row.label),
        h('span', { class: 'contrast-ratio' }, row.ratio.toFixed(2) + ':1'),
        h('span', { class: 'contrast-badge ' + (row.pass ? 'pass' : 'fail') }, ratioGrade(row.ratio)),
      ),
    ),
    // Full matrix
    d.palette ? FullContrastMatrix(d.palette.primary.scale) : null,
  );
}

function FullContrastMatrix(scale: ScaleColor[]) {
  // Show a compact grid of step vs step contrast
  const lightSteps = scale.filter((s) => s.step <= 200);
  const darkSteps = scale.filter((s) => s.step >= 700);

  return h('div', { class: 'flex-col gap-sm', style: { marginTop: '8px' } },
    h('div', { class: 'section-label' }, 'Text on Background'),
    h('div', { style: { display: 'grid', gridTemplateColumns: '50px ' + lightSteps.map(() => '1fr').join(' '), gap: '3px', fontSize: '9px', fontFamily: "'JetBrains Mono', monospace" } },
      // Header row
      h('div', null, ''),
      ...lightSteps.map((bg) => h('div', { style: { textAlign: 'center', color: 'var(--color-text-secondary)' } }, String(bg.step))),
      // Data rows
      ...darkSteps.flatMap((text) => [
        h('div', { style: { color: 'var(--color-text-secondary)' } }, String(text.step)),
        ...lightSteps.map((bg) => {
          const ratio = contrastRatio(text.hex, bg.hex);
          const grade = ratioGrade(ratio);
          const bgColor = grade === 'Fail' ? '#ffebee' : grade === 'AAA' ? '#e8f5e9' : '#fff8e1';
          return h('div', { style: { background: bgColor, textAlign: 'center', borderRadius: '3px', padding: '2px', fontSize: '8px' } },
            ratio.toFixed(1));
        }),
      ]),
    ),
  );
}

function ExportTab(d: ReturnType<typeof computeDerived>) {
  return h('div', { class: 'export-section' },
    // Format selection
    h('div', { class: 'section-label' }, 'Format'),
    h('div', { class: 'export-format-bar' },
      ...(EXPORT_FORMATS as readonly string[]).map((fmt) =>
        h('button', {
          class: 'chip-btn' + (state.exportFormat === fmt ? ' active' : ''),
          onClick: () => setState({ exportFormat: fmt as ExportFormat }),
        }, fmtLabel(fmt)),
      ),
    ),
    // Naming
    h('div', { class: 'section-label', style: { marginTop: '4px' } }, 'Naming'),
    h('div', { class: 'options-row' },
      ...(NAMING_PRESETS as readonly string[]).map((preset) =>
        h('button', {
          class: 'chip-btn' + (state.namingPreset === preset ? ' active' : ''),
          onClick: () => setState({ namingPreset: preset as NamingPreset }),
        }, preset === 'semantic' ? 'Semantic' : 'Numeric'),
      ),
    ),
    // Code preview
    h('pre', { class: 'code-preview' }, d.exportCode.length > 1200 ? d.exportCode.slice(0, 1200) + '\n...' : d.exportCode),
    // Actions
    h('div', { class: 'action-bar' },
      h('button', { class: 'btn btn-primary btn-full', onClick: () => copyToClipboard(d.exportCode) }, 'Copy Code'),
    ),
  );
}

function fmtLabel(fmt: string): string {
  if (fmt === 'css') return 'CSS';
  if (fmt === 'tailwind') return 'Tailwind';
  if (fmt === 'tokens') return 'Tokens';
  if (fmt === 'figma') return 'Figma JSON';
  if (fmt === 'scss') return 'SCSS';
  return fmt;
}

function FigmaApplySection(d: ReturnType<typeof computeDerived>) {
  if (!d.palette) return null;
  const serialized = serializePalette(d.palette);
  return h('div', { class: 'figma-apply-section' },
    h('div', { class: 'figma-apply-title' }, 'Apply to Figma'),
    h('div', { class: 'figma-apply-desc' }, 'Push the generated palette directly into your Figma file.'),
    h('div', { class: 'action-bar', style: { marginTop: '4px' } },
      h('button', {
        class: 'btn btn-primary btn-full',
        onClick: () => postToPlugin({ type: 'apply-styles', palette: serialized }),
      }, 'Create Color Styles'),
      h('button', {
        class: 'btn btn-secondary btn-full',
        onClick: () => postToPlugin({ type: 'apply-variables', palette: serialized }),
      }, 'Create Variables'),
    ),
  );
}

/* ── Main App ── */

function App() {
  const d = computeDerived();
  const tabs: Array<{ id: AppState['activeTab']; label: string }> = [
    { id: 'palette', label: 'Palette' },
    { id: 'preview', label: 'Preview' },
    { id: 'contrast', label: 'Contrast' },
    { id: 'export', label: 'Export' },
  ];

  return h('div', { class: 'plugin-root' },
    // Header
    h('header', { class: 'plugin-header' },
      h('span', { class: 'plugin-logo' }, 'OKScale'),
      h('button', {
        class: 'btn btn-secondary',
        style: { padding: '4px 10px', fontSize: '10px' },
        onClick: () => setState({
          colorInput: '#d9ff00',
          shadeMode: 'natural',
          harmonyType: 'complementary',
          anchorBehavior: 'preserve-input',
          neutralMode: 'keep-hue',
          localL: 0.94, localC: 0.23, localH: 110,
        }),
      }, 'Reset'),
    ),

    // Body
    h('div', { class: 'plugin-body' },
      // Color input
      ColorInputSection(d),
      d.colorError ? h('div', { class: 'color-error' }, d.colorError) : null,

      // LCH sliders
      LCHSliders(),

      h('div', { class: 'divider' }),

      // Options
      OptionsSection(),

      h('div', { class: 'divider' }),

      // Figma apply
      FigmaApplySection(d),

      // Tabs
      h('div', { class: 'tab-bar' },
        ...tabs.map((t) =>
          h('button', {
            class: 'tab-btn' + (state.activeTab === t.id ? ' active' : ''),
            onClick: () => setState({ activeTab: t.id }),
          }, t.label),
        ),
      ),

      // Tab content
      state.activeTab === 'palette' ? PaletteTab(d) :
      state.activeTab === 'preview' ? PreviewTab(d) :
      state.activeTab === 'contrast' ? ContrastTab(d) :
      ExportTab(d),
    ),

    // Toast
    state.toast ? h('div', { class: 'toast ' + (state.toast.error ? 'error' : 'success') }, state.toast.message) : null,
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
    if (app) render(App(), app);
  });
}

/* ── Listen for messages from plugin code ── */
window.addEventListener('message', (event) => {
  const msg = event.data?.pluginMessage as NotifyMsg | undefined;
  if (!msg) return;
  if (msg.type === 'notify') {
    showToast(msg.message, msg.error);
  }
});

/* ── Initial render ── */
// Sync LCH sliders from initial color
const initialRgb = parseColorInput(state.colorInput);
if (initialRgb) {
  const lch = rgbToOklch(initialRgb);
  state.localL = lch.l;
  state.localC = lch.c;
  state.localH = lch.h;
}

rerender();
