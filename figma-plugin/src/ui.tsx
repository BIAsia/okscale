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
  lchExpanded: boolean;
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
  lchExpanded: false,
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
      gradientFromPair(palette.secondary.base, n50Lch),
      gradientFromPair(palette.accent.base, n50Lch),
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

/* ── Color helpers ── */

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(
    () => showToast('Copied!'),
    () => showToast('Copy failed', true),
  );
}

function postToPlugin(msg: any) {
  parent.postMessage({ pluginMessage: msg }, '*');
}

/** Apply color: if Figma node is selected, apply fill; otherwise copy CSS */
function applyColor(hex: string) {
  postToPlugin({ type: 'apply-fill', hex });
  copyToClipboard(hex);
}

/** Compute a contrasting text color (black or white) for a given background hex */
function contrastTextColor(hex: string): string {
  const rgb = parseColorInput(hex);
  if (!rgb) return '#000000';
  // Relative luminance calculation
  const lum = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
  return lum > 0.45 ? '#000000' : '#ffffff';
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

  return h('div', { class: 'lch-collapse-section' },
    h('button', {
      class: 'lch-toggle-btn',
      onClick: () => setState({ lchExpanded: !state.lchExpanded }),
    },
      h('span', null, 'LCH Fine-tune'),
      h('span', { class: 'lch-toggle-arrow' }, state.lchExpanded ? '\u25B2' : '\u25BC'),
    ),
    state.lchExpanded ? h('div', { class: 'lch-sliders' },
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
    ) : null,
  );
}

function DropdownSelect(props: {
  label: string;
  options: Array<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
  prefix?: VNode | null;
}) {
  return h('div', { class: 'option-row' },
    h('span', { class: 'option-row-label' }, props.label),
    h('div', { class: 'option-row-control' },
      props.prefix || null,
      h('select', {
        class: 'dropdown-select',
        value: props.value,
        onChange: (e: Event) => props.onChange((e.target as HTMLSelectElement).value),
      },
        ...props.options.map((o) =>
          h('option', { value: o.id, selected: o.id === props.value ? true : undefined }, o.label),
        ),
      ),
    ),
  );
}

function HarmonyPreviewCircles(d: ReturnType<typeof computeDerived>) {
  const colors = d.harmony ? d.harmony.colors.slice(0, 3).map((c) => c.hex) : ['#ccc', '#ccc', '#ccc'];
  return h('div', { class: 'harmony-preview-dots' },
    ...colors.map((hex) =>
      h('div', { class: 'harmony-preview-dot', style: { background: hex } }),
    ),
  );
}

function OptionsSection(d: ReturnType<typeof computeDerived>) {
  return h('div', { class: 'flex-col gap-sm' },
    // Shade Mode dropdown
    DropdownSelect({
      label: 'Shade Mode',
      options: SHADE_MODES as unknown as Array<{ id: string; label: string }>,
      value: state.shadeMode,
      onChange: (id) => setState({ shadeMode: id as ShadeMode }),
    }),
    // Harmony dropdown with preview circles
    DropdownSelect({
      label: 'Harmony',
      options: HARMONY_TYPES as unknown as Array<{ id: string; label: string }>,
      value: state.harmonyType,
      onChange: (id) => setState({ harmonyType: id as HarmonyType }),
      prefix: HarmonyPreviewCircles(d),
    }),
    // Anchor - left/right layout with radio
    h('div', { class: 'option-row' },
      h('span', { class: 'option-row-label' }, 'Anchor'),
      h('div', { class: 'option-row-control radio-group' },
        h('label', { class: 'radio-label', onClick: () => setState({ anchorBehavior: 'preserve-input' }) },
          h('input', { type: 'radio', name: 'anchor', checked: state.anchorBehavior === 'preserve-input' }),
          h('span', null, 'Keep input'),
        ),
        h('label', { class: 'radio-label', onClick: () => setState({ anchorBehavior: 'auto-gamut' }) },
          h('input', { type: 'radio', name: 'anchor', checked: state.anchorBehavior === 'auto-gamut' }),
          h('span', null, 'Auto gamut'),
        ),
      ),
    ),
    // Neutral - left/right layout with radio
    h('div', { class: 'option-row' },
      h('span', { class: 'option-row-label' }, 'Neutral'),
      h('div', { class: 'option-row-control radio-group' },
        h('label', { class: 'radio-label', onClick: () => setState({ neutralMode: 'keep-hue' }) },
          h('input', { type: 'radio', name: 'neutral', checked: state.neutralMode === 'keep-hue' }),
          h('span', null, 'Tinted'),
        ),
        h('label', { class: 'radio-label', onClick: () => setState({ neutralMode: 'absolute-gray' }) },
          h('input', { type: 'radio', name: 'neutral', checked: state.neutralMode === 'absolute-gray' }),
          h('span', null, 'Gray'),
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
      ...props.scale.map((s) => {
        const textColor = contrastTextColor(s.hex);
        return h('div', {
          class: 'scale-chip',
          style: { background: s.hex },
          title: s.step + ': ' + s.hex,
          onClick: () => applyColor(s.hex),
        },
          h('span', { class: 'scale-chip-label', style: { color: textColor } }, String(s.step)),
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
    // Harmony
    d.harmony ? h('div', { class: 'harmony-section' },
      h('div', { class: 'section-label' }, 'Harmony'),
      h('div', { class: 'harmony-circles' },
        ...d.harmony.colors.map((c) =>
          h('div', {
            class: 'harmony-circle',
            style: { background: c.hex },
            title: c.label + ': ' + c.hex,
            onClick: () => applyColor(c.hex),
          }),
        ),
      ),
    ) : null,
    // Gradients (synced with website: 5 gradients)
    d.gradients.length > 0 ? h('div', { class: 'gradient-section' },
      // Harmony gradient
      h('div', { class: 'section-label' }, 'Gradient'),
      h('div', {
        class: 'gradient-bar',
        style: { background: d.gradients[0].css },
        title: 'Click to copy CSS',
        onClick: () => copyToClipboard(d.gradients[0].css),
      }),
      // Vivid gradient
      d.gradients[1] ? [
        h('div', { class: 'section-label', style: { marginTop: '6px' } }, 'Vivid'),
        h('div', {
          class: 'gradient-bar',
          style: { background: d.gradients[1].css },
          title: 'Click to copy CSS',
          onClick: () => copyToClipboard(d.gradients[1].css),
        }),
      ] : null,
      // Role x Neutral 50 trio
      d.gradients[2] && d.gradients[3] && d.gradients[4] ? [
        h('div', { class: 'section-label', style: { marginTop: '6px' } }, '\u00D7 Neutral 50'),
        h('div', { class: 'gradient-trio' },
          ...([
            { label: 'Primary', g: d.gradients[2] },
            { label: 'Secondary', g: d.gradients[3] },
            { label: 'Accent', g: d.gradients[4] },
          ]).map((item) =>
            h('div', { class: 'gradient-trio-item' },
              h('div', {
                class: 'gradient-bar-small',
                style: { background: item.g.css },
                title: 'Click to copy CSS',
                onClick: () => copyToClipboard(item.g.css),
              }),
              h('span', { class: 'gradient-trio-label' }, item.label),
            ),
          ),
        ),
      ] : null,
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
        h('span', { class: 'preview-badge', style: { background: badgeBg, border: '1px solid ' + badgeBorder, color: badgeText, fontSize: '10px' } }, 'Badge'),
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
        h('span', { class: 'preview-badge', style: { background: darkBadgeBg, border: '1px solid ' + darkBadgeBorder, color: darkBadgeText, fontSize: '10px' } }, 'Badge'),
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
    h('div', { class: 'section-label' }, 'WCAG 2.0 Contrast Recommendations'),
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
    h('div', { style: { display: 'grid', gridTemplateColumns: '50px ' + lightSteps.map(() => '1fr').join(' '), gap: '3px', fontSize: '9px', fontFamily: "'JetBrains Mono', monospace" } },
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
    h('div', { class: 'options-row' },
      ...(NAMING_PRESETS as readonly string[]).map((preset) =>
        h('button', {
          class: 'chip-btn' + (state.namingPreset === preset ? ' active' : ''),
          onClick: () => setState({ namingPreset: preset as NamingPreset }),
        }, preset === 'semantic' ? 'Semantic' : 'Numeric'),
      ),
    ),
    h('pre', { class: 'code-preview' }, d.exportCode.length > 1200 ? d.exportCode.slice(0, 1200) + '\n...' : d.exportCode),
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

  const serialized = d.palette ? serializePalette(d.palette) : null;

  return h('div', { class: 'plugin-root' },
    // Body (scrollable)
    h('div', { class: 'plugin-body' },
      // Color input
      ColorInputSection(d),
      d.colorError ? h('div', { class: 'color-error' }, d.colorError) : null,

      // LCH sliders (collapsible)
      LCHSliders(),

      h('div', { class: 'divider' }),

      // Options
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

    // Fixed bottom bar
    h('div', { class: 'plugin-footer' },
      h('button', {
        class: 'btn btn-primary btn-full',
        disabled: !serialized,
        onClick: () => serialized && postToPlugin({ type: 'apply-styles', palette: serialized }),
      }, 'Color Styles'),
      h('button', {
        class: 'btn btn-primary btn-full',
        disabled: !serialized,
        onClick: () => serialized && postToPlugin({ type: 'apply-variables', palette: serialized }),
      }, 'Variables'),
      h('button', {
        class: 'btn btn-secondary btn-full',
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
