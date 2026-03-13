/* ── Minimal vdom for Figma plugin (no dependencies) ── */

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
    if (typeof val === 'boolean') { if (val) el.setAttribute(key, ''); }
    else el.setAttribute(key, String(val));
  }
  children.forEach((c: Child) => { const n = createElement(c); if (n) el.appendChild(n); });
  return el;
}

/* ── Import color generation libs from parent src/lib ── */

import { parseColorInput, rgbToHex, rgbToOklch, oklchToRgb, gamutMapOklch, type Oklch } from '../../src/lib/color';
import { generateFullPalette, type FullPalette, type NeutralMode } from '../../src/lib/palette';
import { nearestScaleStepForLightness, type AnchorBehavior, type ScaleColor } from '../../src/lib/scale';
import { type ShadeMode, SHADE_MODES } from '../../src/lib/shades';
import { type HarmonyType, HARMONY_TYPES, generateHarmony, type HarmonyResult } from '../../src/lib/harmony';
import { gradientFromHarmony, gradientFromHarmonyVivid, gradientFromPair, suggestGradients, type GradientResult } from '../../src/lib/gradient';
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
  lchOpen: boolean;
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
  lchOpen: false,
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

  // Build rich gradients — matching the web version
  let gradients: Array<GradientResult & { name: string }> = [];
  if (harmony && palette && primaryOklch) {
    const n50 = palette.neutral.scale.find((s) => s.step === 50);
    const n50Lch = n50 ? n50.lch : { l: 0.97, c: 0.005, h: palette.neutral.base.h };
    const n950 = palette.neutral.scale.find((s) => s.step === 950);
    const n950Lch = n950 ? n950.lch : { l: 0.15, c: 0.005, h: palette.neutral.base.h };

    // Suggested harmony-based gradients
    const harmGrad = gradientFromHarmony(harmony);
    const harmVivid = gradientFromHarmonyVivid(harmony);
    const toLight = gradientFromPair(primaryOklch, n50Lch);
    const toDark = gradientFromPair(primaryOklch, n950Lch);

    // suggestGradients gives complement, lightToDark, analogous, triadic
    const suggested = suggestGradients(primaryOklch);

    gradients = [
      { ...harmGrad, name: 'Harmony' },
      { ...harmVivid, name: 'Harmony Vivid' },
      { ...toLight, name: 'Primary → Light' },
      { ...toDark, name: 'Primary → Dark' },
      { ...suggested[0], name: 'Complement' },
      { ...suggested[2], name: 'Analogous' },
      { ...suggested[3], name: 'Triadic' },
    ];
  }

  const colorError = parsedRgb
    ? ''
    : state.colorInput.trim() ? 'Invalid color format.' : '';

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

/* ── Helpers ── */

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(
    () => showToast('Copied!'),
    () => showToast('Copy failed', true),
  );
}

function postToPlugin(msg: any) {
  parent.postMessage({ pluginMessage: msg }, '*');
}

/** Click a color: apply fill to selected Figma node AND copy hex */
function onColorClick(hex: string) {
  // Copy hex to clipboard
  navigator.clipboard.writeText(hex).catch(() => {});
  // Send apply-fill to plugin sandbox — if there's a selection it applies, else notifies
  postToPlugin({ type: 'apply-fill', hex });
}

/** Choose text color with good contrast against a background hex */
function autoTextColor(bgHex: string): string {
  const r1 = contrastRatio('#ffffff', bgHex);
  const r2 = contrastRatio('#000000', bgHex);
  return r1 > r2 ? '#ffffff' : '#000000';
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

function LCHCollapsible() {
  function applyLCH(l: number, c: number, hue: number) {
    const hex = rgbToHex(oklchToRgb({ l, c, h: hue }));
    setState({ colorInput: hex, localL: l, localC: c, localH: hue });
  }

  return h('div', null,
    h('button', {
      class: 'collapsible-toggle',
      onClick: () => setState({ lchOpen: !state.lchOpen }),
    },
      h('span', null, 'LCH Fine-tune'),
      h('span', { class: 'collapsible-chevron' + (state.lchOpen ? ' open' : '') }, '\u25BC'),
    ),
    state.lchOpen ? h('div', { class: 'collapsible-body' },
      h('div', { class: 'lch-sliders' },
        h('div', { class: 'lch-row' },
          h('div', { class: 'lch-label-row' }, h('span', null, 'Lightness'), h('span', null, (state.localL * 100).toFixed(1))),
          h('input', { class: 'lch-slider', type: 'range', min: '0', max: '1', step: '0.001', value: String(state.localL),
            onInput: (e: Event) => { const v = parseFloat((e.target as HTMLInputElement).value); applyLCH(v, state.localC, state.localH); },
          }),
        ),
        h('div', { class: 'lch-row' },
          h('div', { class: 'lch-label-row' }, h('span', null, 'Chroma'), h('span', null, (state.localC * 100).toFixed(1))),
          h('input', { class: 'lch-slider', type: 'range', min: '0', max: '0.4', step: '0.001', value: String(state.localC),
            onInput: (e: Event) => { const v = parseFloat((e.target as HTMLInputElement).value); applyLCH(state.localL, v, state.localH); },
          }),
        ),
        h('div', { class: 'lch-row' },
          h('div', { class: 'lch-label-row' }, h('span', null, 'Hue'), h('span', null, state.localH.toFixed(1) + '\u00B0')),
          h('input', { class: 'lch-slider', type: 'range', min: '0', max: '360', step: '0.1', value: String(state.localH),
            onInput: (e: Event) => { const v = parseFloat((e.target as HTMLInputElement).value); applyLCH(state.localL, state.localC, v); },
          }),
        ),
      ),
    ) : null,
  );
}

function RadioButton(props: { checked: boolean; label: string; onClick: () => void }) {
  return h('label', { class: 'radio-label', onClick: props.onClick },
    h('span', { class: 'radio-dot' + (props.checked ? ' checked' : '') },
      h('span', { class: 'radio-dot-inner' }),
    ),
    props.label,
  );
}

function OptionsSection(d: ReturnType<typeof computeDerived>) {
  return h('div', { class: 'flex-col gap-sm' },
    // Shade Mode — dropdown
    h('div', { class: 'option-row' },
      h('span', { class: 'option-label' }, 'Shade'),
      h('select', {
        class: 'dropdown',
        onChange: (e: Event) => setState({ shadeMode: (e.target as HTMLSelectElement).value as ShadeMode }),
      },
        ...SHADE_MODES.map((m) =>
          h('option', { value: m.id, selected: state.shadeMode === m.id ? true : undefined }, m.label),
        ),
      ),
    ),
    // Harmony — dropdown with color preview
    h('div', { class: 'option-row' },
      h('span', { class: 'option-label' }, 'Harmony'),
      h('div', { class: 'option-control' },
        d.harmony ? h('div', { style: { display: 'flex', gap: '3px', marginRight: '6px' } },
          ...d.harmony.colors.slice(0, 4).map((c) =>
            h('div', {
              style: { width: '12px', height: '12px', borderRadius: '50%', background: c.hex, border: '1px solid rgba(0,0,0,0.1)' },
            }),
          ),
        ) : null,
        h('select', {
          class: 'dropdown',
          onChange: (e: Event) => setState({ harmonyType: (e.target as HTMLSelectElement).value as HarmonyType }),
        },
          ...HARMONY_TYPES.map((t) =>
            h('option', { value: t.id, selected: state.harmonyType === t.id ? true : undefined }, t.label),
          ),
        ),
      ),
    ),
    // Anchor — left label, right radio
    h('div', { class: 'option-row' },
      h('span', { class: 'option-label' }, 'Anchor'),
      h('div', { class: 'radio-group' },
        RadioButton({ checked: state.anchorBehavior === 'preserve-input', label: 'Keep input', onClick: () => setState({ anchorBehavior: 'preserve-input' }) }),
        RadioButton({ checked: state.anchorBehavior === 'auto-gamut', label: 'Auto gamut', onClick: () => setState({ anchorBehavior: 'auto-gamut' }) }),
      ),
    ),
    // Neutral — left label, right radio
    h('div', { class: 'option-row' },
      h('span', { class: 'option-label' }, 'Neutral'),
      h('div', { class: 'radio-group' },
        RadioButton({ checked: state.neutralMode === 'keep-hue', label: 'Tinted', onClick: () => setState({ neutralMode: 'keep-hue' }) }),
        RadioButton({ checked: state.neutralMode === 'absolute-gray', label: 'Gray', onClick: () => setState({ neutralMode: 'absolute-gray' }) }),
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
      ...props.scale.map((s) => {
        const txtColor = autoTextColor(s.hex);
        return h('div', {
          class: 'scale-chip',
          style: { background: s.hex },
          title: s.step + ': ' + s.hex + ' (click to apply)',
          onClick: () => onColorClick(s.hex),
        },
          h('span', { class: 'scale-chip-label', style: { color: txtColor } }, String(s.step)),
        );
      }),
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
    // Harmony — rich preview with label + hex + color dot
    d.harmony ? h('div', { class: 'harmony-section' },
      h('div', { class: 'section-label' }, 'Harmony — ' + HARMONY_TYPES.find((t) => t.id === state.harmonyType)?.label),
      h('div', { class: 'harmony-grid' },
        ...d.harmony.colors.map((c) =>
          h('div', {
            class: 'harmony-item',
            title: 'Click to apply ' + c.hex,
            onClick: () => onColorClick(c.hex),
          },
            h('div', { class: 'harmony-dot', style: { background: c.hex } }),
            h('div', { class: 'harmony-info' },
              h('span', { class: 'harmony-item-label' }, c.label),
              h('span', { class: 'harmony-item-hex' }, c.hex),
            ),
          ),
        ),
      ),
    ) : null,
    // Gradients — richer set with labels
    d.gradients.length > 0 ? h('div', { class: 'gradient-section' },
      h('div', { class: 'section-label' }, 'Gradients'),
      ...d.gradients.map((g) =>
        h('div', { class: 'gradient-row' },
          h('div', { class: 'gradient-meta' },
            h('span', { class: 'gradient-name' }, g.name),
          ),
          h('div', {
            class: 'gradient-bar',
            style: { background: g.css },
            title: 'Click to copy CSS gradient',
            onClick: () => copyToClipboard(g.css),
          }),
        ),
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

  const darkBg = sc(p.neutral, 950, '#111');
  const darkBorder = sc(p.neutral, 800, '#333');
  const darkText = sc(p.neutral, 50, '#fafafa');
  const darkMuted = sc(p.neutral, 400, '#999');
  const darkBadgeBg = sc(p.secondary, 900, '#141414');
  const darkBadgeBorder = sc(p.secondary, 700, '#303030');
  const darkBadgeText = sc(p.secondary, 200, '#e0e0e0');

  return h('div', { class: 'flex-col gap-md' },
    h('div', { class: 'preview-card', style: { background: lightBg, borderColor: lightBorder } },
      h('div', { class: 'preview-head' },
        h('span', { style: { fontWeight: '600', fontSize: '13px', color: lightText } }, 'Light Surface'),
        h('span', { class: 'preview-badge', style: { background: badgeBg, border: '1px solid ' + badgeBorder, color: badgeText } }, 'Badge'),
      ),
      h('p', { style: { fontSize: '11px', color: lightMuted, lineHeight: '1.5' } },
        'Body text on a light neutral background with secondary badge.'),
      h('div', { class: 'preview-actions' },
        h('span', { class: 'preview-btn-primary', style: { background: btnPrimaryBg, color: btnPrimaryFg } }, 'Primary'),
        h('span', { class: 'preview-btn-secondary', style: { background: 'transparent', borderColor: btnSecBorder, color: btnSecText } }, 'Secondary'),
      ),
    ),
    h('div', { class: 'preview-card', style: { background: darkBg, borderColor: darkBorder } },
      h('div', { class: 'preview-head' },
        h('span', { style: { fontWeight: '600', fontSize: '13px', color: darkText } }, 'Dark Surface'),
        h('span', { class: 'preview-badge', style: { background: darkBadgeBg, border: '1px solid ' + darkBadgeBorder, color: darkBadgeText } }, 'Badge'),
      ),
      h('p', { style: { fontSize: '11px', color: darkMuted, lineHeight: '1.5' } },
        'Body text on a dark neutral background with secondary badge.'),
    ),
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
    h('div', { class: 'section-label' }, 'WCAG 2.0 Contrast'),
    ...d.usageRows.map((row) =>
      h('div', { class: 'contrast-row' },
        h('span', { class: 'contrast-label' }, row.label),
        h('span', { class: 'contrast-ratio' }, row.ratio.toFixed(2) + ':1'),
        h('span', { class: 'contrast-badge ' + (row.pass ? 'pass' : 'fail') }, ratioGrade(row.ratio)),
      ),
    ),
    d.palette ? FullContrastMatrix(d.palette.primary.scale) : null,
  );
}

function FullContrastMatrix(scale: ScaleColor[]) {
  const lightSteps = scale.filter((s) => s.step <= 200);
  const darkSteps = scale.filter((s) => s.step >= 700);

  return h('div', { class: 'flex-col gap-sm', style: { marginTop: '8px' } },
    h('div', { class: 'section-label' }, 'Text on Background'),
    h('div', { style: { display: 'grid', gridTemplateColumns: '40px ' + lightSteps.map(() => '1fr').join(' '), gap: '2px', fontSize: '9px', fontFamily: "'JetBrains Mono', monospace" } },
      h('div', null, ''),
      ...lightSteps.map((bg) => h('div', { style: { textAlign: 'center', color: 'var(--color-text-secondary)' } }, String(bg.step))),
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
    h('div', { class: 'section-label' }, 'Format'),
    h('div', { class: 'export-format-bar' },
      ...(EXPORT_FORMATS as readonly string[]).map((fmt) =>
        h('button', {
          class: 'chip-btn' + (state.exportFormat === fmt ? ' active' : ''),
          onClick: () => setState({ exportFormat: fmt as ExportFormat }),
        }, fmtLabel(fmt)),
      ),
    ),
    h('div', { class: 'section-label', style: { marginTop: '4px' } }, 'Naming'),
    h('div', { class: 'export-format-bar' },
      ...(NAMING_PRESETS as readonly string[]).map((preset) =>
        h('button', {
          class: 'chip-btn' + (state.namingPreset === preset ? ' active' : ''),
          onClick: () => setState({ namingPreset: preset as NamingPreset }),
        }, preset === 'semantic' ? 'Semantic' : 'Numeric'),
      ),
    ),
    h('pre', { class: 'code-preview' }, d.exportCode.length > 1500 ? d.exportCode.slice(0, 1500) + '\n...' : d.exportCode),
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

/* ── Main App ── */

function App() {
  const d = computeDerived();
  const tabs: Array<{ id: AppState['activeTab']; label: string }> = [
    { id: 'palette', label: 'Palette' },
    { id: 'preview', label: 'Preview' },
    { id: 'contrast', label: 'Contrast' },
    { id: 'export', label: 'Export' },
  ];

  const hasPalette = !!d.palette;
  const serialized = hasPalette ? serializePalette(d.palette!) : null;

  return h('div', { class: 'plugin-root' },
    // Body (scrollable area)
    h('div', { class: 'plugin-body' },
      // Color input
      ColorInputSection(d),
      d.colorError ? h('div', { class: 'color-error' }, d.colorError) : null,

      // LCH sliders — collapsible
      LCHCollapsible(),

      h('div', { class: 'divider' }),

      // Options (dropdowns + radios)
      OptionsSection(d),

      h('div', { class: 'divider' }),

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

    // Fixed bottom bar: Create Styles | Create Variables | Reset
    h('div', { class: 'bottom-bar' },
      h('button', {
        class: 'btn btn-primary btn-full',
        style: { opacity: hasPalette ? '1' : '0.4' },
        onClick: () => { if (serialized) postToPlugin({ type: 'apply-styles', palette: serialized }); },
      }, 'Styles'),
      h('button', {
        class: 'btn btn-primary btn-full',
        style: { opacity: hasPalette ? '1' : '0.4' },
        onClick: () => { if (serialized) postToPlugin({ type: 'apply-variables', palette: serialized }); },
      }, 'Variables'),
      h('button', {
        class: 'btn btn-secondary',
        onClick: () => {
          const rgb = parseColorInput('#d9ff00');
          const lch = rgb ? rgbToOklch(rgb) : { l: 0.94, c: 0.23, h: 110 };
          setState({
            colorInput: '#d9ff00',
            shadeMode: 'natural',
            harmonyType: 'complementary',
            anchorBehavior: 'preserve-input',
            neutralMode: 'keep-hue',
            localL: lch.l, localC: lch.c, localH: lch.h,
            lchOpen: false,
          });
        },
      }, 'Reset'),
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
const initialRgb = parseColorInput(state.colorInput);
if (initialRgb) {
  const lch = rgbToOklch(initialRgb);
  state.localL = lch.l;
  state.localC = lch.c;
  state.localH = lch.h;
}

rerender();
