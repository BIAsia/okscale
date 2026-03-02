import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { type HarmonyResult, type HarmonyType, HARMONY_TYPES } from '../lib/harmony';
import type { GradientResult } from '../lib/gradient';
import type { FullPalette } from '../lib/palette';
import { SHADE_MODES, type ShadeMode } from '../lib/shades';
import { extractThemeFromImageFile } from '../lib/image-theme';
import type { Oklch } from '../lib/color';
import { oklchToRgb, rgbToHex } from '../lib/color';
import { buildUsageMatrix, contrastRatio, ratioGrade } from '../lib/contrast';
import type { AnchorBehavior } from '../lib/scale';
import {
  EXPORT_FORMATS,
  NAMING_PRESETS,
  type ExportFormat,
  type NamingPreset,
  formatFullExport,
} from '../lib/export';
import { GenSelect } from './GenSelect';

type GeneratorProps = {
  colorInput: string;
  colorError: string;
  primaryOklch: Oklch | null;
  palette: FullPalette | null;
  harmony: HarmonyResult | null;
  gradients: GradientResult[];
  shadeMode: ShadeMode;
  harmonyType: HarmonyType;
  onColorChange: (value: string) => void;
  onShadeModeChange: (mode: ShadeMode) => void;
  onHarmonyTypeChange: (type: HarmonyType) => void;
  anchorBehavior: AnchorBehavior;
  anchorStep: number;
  onAnchorBehaviorChange: (value: AnchorBehavior) => void;
  recentColors: string[];
  onSelectRecentColor: (value: string) => void;
  onRemoveRecentColor: (value: string) => void;
  onClearHistory: () => void;
  neutralMode: import('../lib/palette').NeutralMode;
  onNeutralModeChange: (mode: import('../lib/palette').NeutralMode) => void;
  onNavigate?: (to: string) => void;
};

type ActiveTab = 'palette' | 'ui-preview' | 'contrast';

var TAB_LABELS: Record<ActiveTab, string> = {
  palette: 'Palette',
  'ui-preview': 'UI Preview',
  contrast: 'Contrast',
};

function scaleHex(
  entry: FullPalette[keyof FullPalette],
  step: number,
  fallback: string,
): string {
  var item = entry.scale.find(function (t) {
    return t.step === step;
  });
  return item ? item.hex : fallback;
}

function ScaleCircles({ scale }: { scale: { step: number; hex: string }[] }) {
  const [copiedKey, setCopiedKey] = useState<number | null>(null);

  function handleCopy(step: number, hex: string) {
    navigator.clipboard.writeText(hex).catch(() => {});
    setCopiedKey(step);
    setTimeout(() => setCopiedKey(null), 1200);
  }

  return (
    <div class="gen-scale-circles">
      {scale.map(function (s) {
        const isLight = s.step <= 400;
        const labelColor = isLight
          ? (scale[scale.length - 1] ? scale[scale.length - 1].hex : '#000')
          : (scale[0] ? scale[0].hex : '#fff');
        const isCopied = copiedKey === s.step;
        return (
          <div
            key={s.step}
            class={'gen-scale-circle' + (isCopied ? ' gen-scale-circle--copied' : '') + (s.step < 200 ? ' gen-scale-circle--subtle' : '')}
            style={{ background: s.hex }}
            title={s.step + ': ' + s.hex}
            onClick={() => handleCopy(s.step, s.hex)}
          >
            <span class="gen-scale-step" style={{ color: labelColor }}>{s.step}</span>
            <span class="gen-scale-hex" style={{ color: labelColor }}>{isCopied ? '✓' : s.hex.replace('#', '')}</span>
          </div>
        );
      })}
    </div>
  );
}

function CopyableGradientBar({ css, stops }: { css: string; stops?: import('../lib/gradient').GradientResult['stops'] }) {
  var copiedState = useState(false);
  var copied = copiedState[0];
  var setCopied = copiedState[1];

  function handleClick() {
    navigator.clipboard.writeText(css).catch(function () {});
    setCopied(true);
    setTimeout(function () { setCopied(false); }, 1400);
  }

  return (
    <div
      class={'gen-gradient-row' + (copied ? ' gen-gradient-row--copied' : '')}
      onClick={handleClick}
      title="Click to copy CSS"
    >
      <div class="gen-gradient-bar" style={{ background: css }} />
      {stops && stops.length > 0 && (
        <div class="gen-gradient-chips">
          {stops.map(function (stop) {
            return (
              <div
                key={stop.hex}
                class="gen-gradient-chip"
                style={{ background: stop.hex, left: `calc(${stop.position * 100}% - 14px)` }}
              />
            );
          })}
        </div>
      )}
      {copied && <div class="gen-gradient-copied">✓ Copied</div>}
    </div>
  );
}

export function Generator(props: GeneratorProps) {
  // ── LCH slider local state ──────────────────────────
  var sliderDirtyRef = useRef(false);
  var lState = useState(0.5);
  var localL = lState[0];
  var setLocalL = lState[1];
  var cState = useState(0.15);
  var localC = cState[0];
  var setLocalC = cState[1];
  var hState = useState(180);
  var localH = hState[0];
  var setLocalH = hState[1];

  // Sync LCH sliders from props when the primary color changes externally
  useEffect(
    function () {
      if (!sliderDirtyRef.current && props.primaryOklch) {
        setLocalL(props.primaryOklch.l);
        setLocalC(props.primaryOklch.c);
        setLocalH(props.primaryOklch.h);
      }
    },
    [props.primaryOklch],
  );

  function applyLCH(l: number, c: number, h: number) {
    sliderDirtyRef.current = true;
    var hex = rgbToHex(oklchToRgb({ l: l, c: c, h: h }));
    props.onColorChange(hex);
    window.setTimeout(function () {
      sliderDirtyRef.current = false;
    }, 400);
  }

  // ── Tab state ────────────────────────────────────────
  var tabState = useState<ActiveTab>('palette');
  var activeTab = tabState[0];
  var setActiveTab = tabState[1];

  // ── Export / naming state ────────────────────────────
  var namingState = useState<NamingPreset>('numeric');
  var namingPreset = namingState[0];
  var setNamingPreset = namingState[1];

  var formatState = useState<ExportFormat>('css');
  var activeFormat = formatState[0];
  var setActiveFormat = formatState[1];

  var copiedAgentState = useState(false);
  var copiedAgent = copiedAgentState[0];
  var setCopiedAgent = copiedAgentState[1];

  var copiedCodeState = useState(false);
  var copiedCode = copiedCodeState[0];
  var setCopiedCode = copiedCodeState[1];

  var exportDrawerState = useState(false);
  var exportDrawerOpen = exportDrawerState[0];
  var setExportDrawerOpen = exportDrawerState[1];

  // ── Image upload state ───────────────────────────────
  var extractingState = useState(false);
  var imageExtracting = extractingState[0];
  var setImageExtracting = extractingState[1];

  var imageThemeState = useState<string[]>([]);
  var imageTheme = imageThemeState[0];
  var setImageTheme = imageThemeState[1];

  // ── Computed export code ─────────────────────────────
  var code = useMemo(
    function () {
      if (!props.palette) return '/* Generate a palette to unlock export */';
      return formatFullExport(activeFormat, props.palette, namingPreset);
    },
    [activeFormat, namingPreset, props.palette],
  );

  // ── Contrast usage matrix ────────────────────────────
  var usageRows = useMemo(
    function () {
      if (!props.palette) return [];
      return buildUsageMatrix(props.palette.primary.scale);
    },
    [props.palette],
  );

  // ── Preview hex & harmony circles ────────────────────
  var previewHex = props.palette ? props.palette.primary.baseHex : props.colorInput;

  var harmonyCircles = props.harmony
    ? props.harmony.colors.slice(0, 3).map(function (c) { return c.hex; })
    : [previewHex, previewHex, previewHex];

  // ── Actions ──────────────────────────────────────────
  async function copyAsAgent() {
    var agentCode = props.palette
      ? formatFullExport('css', props.palette, namingPreset)
      : '';
    try {
      await navigator.clipboard.writeText(agentCode);
      setCopiedAgent(true);
      window.setTimeout(function () { setCopiedAgent(false); }, 1200);
    } catch (_err) {
      window.alert('Clipboard access failed.');
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      window.setTimeout(function () { setCopiedCode(false); }, 1200);
    } catch (_err) {
      window.alert('Clipboard access failed.');
    }
  }

  function downloadFigma() {
    var figmaCode = props.palette
      ? formatFullExport('figma', props.palette, namingPreset)
      : '';
    var blob = new Blob([figmaCode], { type: 'application/json' });
    var href = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = href;
    a.download = 'okscale-figma-variables.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(href);
  }

  async function onImageSelected(event: Event) {
    var input = event.currentTarget as HTMLInputElement;
    var file = input.files && input.files[0];
    if (!file) return;
    setImageExtracting(true);
    try {
      var colors = await extractThemeFromImageFile(file, 6);
      if (colors.length) {
        setImageTheme(colors);
        props.onColorChange(colors[0]);
      }
    } catch (_err) {
      /* ignore */
    } finally {
      setImageExtracting(false);
      input.value = '';
    }
  }

  var suggestColors = props.recentColors;

  function RightSidebarContent() {
    return (
      <>
        {/* Naming mode toggle */}
        <div class="gen-options-section">
          {NAMING_PRESETS.map(function (preset) {
            var label = preset === 'numeric' ? 'Numeric naming' : 'Semantic naming';
            return (
              <button
                key={preset}
                type="button"
                class="gen-checkbox-row"
                onClick={function () { setNamingPreset(preset); }}
              >
                <span class="gen-checkbox-mark">
                  {namingPreset === preset ? '[*]' : '[ ]'}
                </span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Format selector */}
        <div class="gen-options-section">
          {EXPORT_FORMATS.map(function (fmt) {
            return (
              <button
                key={fmt}
                type="button"
                class="gen-checkbox-row"
                onClick={function () { setActiveFormat(fmt); }}
              >
                <span class="gen-checkbox-mark">
                  {activeFormat === fmt ? '[*]' : '[ ]'}
                </span>
                <span>{fmt.toUpperCase()}</span>
              </button>
            );
          })}
        </div>

        {/* Code preview + export buttons */}
        <div class="gen-right-content">
          <pre class="gen-code-preview">
            <code>{code.length > 600 ? code.slice(0, 600) + '\n…' : code}</code>
          </pre>

          <div class="gen-export-actions">
            <button
              type="button"
              class="gen-sidebar-btn"
              onClick={copyAsAgent}
              aria-live="polite"
            >
              {copiedAgent ? 'Copied!' : 'Use in coding agent'}
            </button>
            <button
              type="button"
              class="gen-sidebar-btn"
              onClick={copyCode}
              aria-live="polite"
            >
              {copiedCode ? 'Copied!' : 'Export Code'}
            </button>
            <button type="button" class="gen-sidebar-btn" onClick={downloadFigma}>
              Export to Figma
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div class="gen-tool">
      {/* ── Top navigation bar ─────────────────────────── */}
      <header class="gen-topbar">
        <span class="gen-topbar-logo">OK-Scale Generator</span>
        <div class="gen-topbar-right">
          <button
            type="button"
            class="gen-topbar-back"
            onClick={function () {
              if (props.onNavigate) props.onNavigate('/');
            }}
          >
            Back to home
          </button>
          <button
            type="button"
            class="gen-topbar-export"
            onClick={function () { setExportDrawerOpen(true); }}
          >
            Export
          </button>
        </div>
      </header>

      {/* ── 3-column body ──────────────────────────────── */}
      <div class="gen-body">

        {/* ════ LEFT SIDEBAR ════ */}
        <aside class="gen-left">

          {/* Color swatch + hex input */}
          <div class="gen-color-section">
            <div class="gen-color-top">
              <div
                class="gen-color-swatch"
                style={{ background: previewHex }}
                title="Click to open color picker"
              >
                <input
                  type="color"
                  value={previewHex}
                  onInput={function (e) {
                    props.onColorChange((e.currentTarget as HTMLInputElement).value);
                  }}
                />
              </div>
              <input
                class="gen-hex-input"
                value={props.colorInput}
                onInput={function (e) {
                  props.onColorChange((e.currentTarget as HTMLInputElement).value);
                }}
                placeholder="#d9ff00"
                spellcheck={false}
                aria-label="Hex color input"
              />
            </div>
          </div>

          {/* L / C / H sliders */}
          <div class="gen-lch-sliders">
            <div class="gen-lch-row">
              <div class="gen-lch-label-row">
                <span>L</span>
                <span>{(localL * 100).toFixed(1)}</span>
              </div>
              <input
                class="gen-lch-slider"
                type="range"
                min="0"
                max="1"
                step="0.001"
                value={localL}
                onInput={function (e) {
                  var val = parseFloat((e.currentTarget as HTMLInputElement).value);
                  setLocalL(val);
                  applyLCH(val, localC, localH);
                }}
                aria-label="Lightness"
              />
            </div>
            <div class="gen-lch-row">
              <div class="gen-lch-label-row">
                <span>C</span>
                <span>{(localC * 100).toFixed(1)}</span>
              </div>
              <input
                class="gen-lch-slider"
                type="range"
                min="0"
                max="0.4"
                step="0.001"
                value={localC}
                onInput={function (e) {
                  var val = parseFloat((e.currentTarget as HTMLInputElement).value);
                  setLocalC(val);
                  applyLCH(localL, val, localH);
                }}
                aria-label="Chroma"
              />
            </div>
            <div class="gen-lch-row">
              <div class="gen-lch-label-row">
                <span>H</span>
                <span>{localH.toFixed(1)}</span>
              </div>
              <input
                class="gen-lch-slider"
                type="range"
                min="0"
                max="360"
                step="0.1"
                value={localH}
                onInput={function (e) {
                  var val = parseFloat((e.currentTarget as HTMLInputElement).value);
                  setLocalH(val);
                  applyLCH(localL, localC, val);
                }}
                aria-label="Hue"
              />
            </div>
          </div>

          {/* Keep input / Auto gamut */}
          <div class="gen-options-section">
            <button
              type="button"
              class="gen-checkbox-row"
              onClick={function () { props.onAnchorBehaviorChange('preserve-input'); }}
            >
              <span class="gen-checkbox-mark">
                {props.anchorBehavior === 'preserve-input' ? '[*]' : '[ ]'}
              </span>
              <span>Keep input color</span>
            </button>
            <button
              type="button"
              class="gen-checkbox-row"
              onClick={function () { props.onAnchorBehaviorChange('auto-gamut'); }}
            >
              <span class="gen-checkbox-mark">
                {props.anchorBehavior === 'auto-gamut' ? '[*]' : '[ ]'}
              </span>
              <span>Auto gamut</span>
            </button>
          </div>

          {/* Neutral options */}
          <div class="gen-options-section">
            <button
              type="button"
              class="gen-checkbox-row"
              onClick={function () { props.onNeutralModeChange('keep-hue'); }}
            >
              <span class="gen-checkbox-mark">
                {props.neutralMode === 'keep-hue' ? '[*]' : '[ ]'}
              </span>
              <span>Keep hue</span>
            </button>
            <button
              type="button"
              class="gen-checkbox-row"
              onClick={function () { props.onNeutralModeChange('absolute-gray'); }}
            >
              <span class="gen-checkbox-mark">
                {props.neutralMode === 'absolute-gray' ? '[*]' : '[ ]'}
              </span>
              <span>Absolute gray</span>
            </button>
          </div>

          {/* History */}
          <div class="gen-suggest-section">
            <div class="gen-suggest-title-row">
              <span class="gen-suggest-title">History</span>
              {suggestColors.length > 0 && (
                <button
                  type="button"
                  class="gen-suggest-clear"
                  onClick={props.onClearHistory}
                >
                  Clear
                </button>
              )}
            </div>
            <div class="gen-suggest-chips">
              {suggestColors.length ? (
                suggestColors.map(function (hex) {
                  var active = props.colorInput.toLowerCase() === hex.toLowerCase();
                  return (
                    <div
                      key={hex}
                      class={'gen-history-chip' + (active ? ' active' : '')}
                    >
                      <button
                        type="button"
                        class="gen-history-chip-apply"
                        onClick={function () { props.onSelectRecentColor(hex); }}
                        title={hex}
                      >
                        <span
                          class="gen-history-dot"
                          style={{ backgroundColor: hex }}
                        />
                        <span class="gen-history-hex">{hex}</span>
                      </button>
                      <button
                        type="button"
                        class="gen-history-delete"
                        onClick={function (e) {
                          e.stopPropagation();
                          props.onRemoveRecentColor(hex);
                        }}
                        aria-label={'Remove ' + hex}
                        tabIndex={-1}
                      >
                        ×
                      </button>
                    </div>
                  );
                })
              ) : (
                <span class="gen-empty-hint">No history yet</span>
              )}
            </div>
          </div>

          {/* Upload image + Reset */}
          <div class="gen-sidebar-actions">
            <label
              class="gen-sidebar-btn"
              aria-disabled={imageExtracting ? 'true' : 'false'}
            >
              {imageExtracting ? 'Extracting...' : 'Upload image'}
              <input
                type="file"
                accept="image/*"
                onChange={onImageSelected}
                disabled={imageExtracting}
                class="image-upload-input"
              />
            </label>
            <button
              type="button"
              class="gen-sidebar-btn"
              onClick={function () {
                props.onColorChange('#d9ff00');
                props.onShadeModeChange('natural');
              }}
            >
              Reset
            </button>
          </div>
        </aside>

        {/* ════ CENTER PANEL ════ */}
        <main class="gen-center">

          {/* Tab bar */}
          <div class="gen-tabs-bar">
            <div class="gen-tabs-left">
              {(['palette', 'ui-preview', 'contrast'] as ActiveTab[]).map(function (tab, i) {
                return (
                  <button
                    key={tab}
                    type="button"
                    class={
                      'gen-tab' +
                      (activeTab === tab ? ' active' : '') +
                      (i > 0 ? ' bordered-left' : '')
                    }
                    onClick={function () { setActiveTab(tab); }}
                  >
                    {TAB_LABELS[tab]}
                  </button>
                );
              })}
            </div>

            <div class="gen-tabs-right">
              {/* Harmony type dropdown */}
              <div class="gen-harmony-display">
                <GenSelect
                  options={HARMONY_TYPES}
                  value={props.harmonyType}
                  onChange={function (v) { props.onHarmonyTypeChange(v as HarmonyType); }}
                  hideLabel
                  prefix={
                    <div class="gen-harmony-circles">
                      {harmonyCircles.map(function (hex, i) {
                        return (
                          <div
                            key={i}
                            class="gen-harmony-circle"
                            style={{ background: hex }}
                          />
                        );
                      })}
                    </div>
                  }
                />
              </div>

              {/* Shade mode dropdown */}
              <div class="gen-shade-selector">
                <GenSelect
                  options={SHADE_MODES}
                  value={props.shadeMode}
                  onChange={function (v) { props.onShadeModeChange(v as ShadeMode); }}
                />
              </div>
            </div>
          </div>

          {/* Tab content */}
          <div class="gen-content">

            {/* PALETTE TAB */}
            {activeTab === 'palette' && (
              <div class="gen-palette-tab" key={'palette-' + props.harmonyType}>
                {props.palette ? (
                  <>
                    {[
                      { entry: props.palette.primary, name: 'Primary' },
                      { entry: props.palette.secondary, name: 'Secondary' },
                      { entry: props.palette.accent, name: 'Accent' },
                      { entry: props.palette.neutral, name: 'Neutral' },
                    ].map(function (item) {
                      var entry = item.entry;
                      var name = item.name;
                      return (
                        <div key={name} class="gen-palette-section">
                          <div class="gen-palette-role-header">
                            <span class="gen-palette-role-name">{name}</span>
                            <span class="gen-palette-role-hex">
                              <span class="gen-palette-role-dot" style={{ background: entry.baseHex }} />
                              {entry.baseHex}
                            </span>
                          </div>
<ScaleCircles scale={entry.scale} />
                        </div>
                      );
                    })}

                    {props.gradients.length > 0 && (
                      <>
                        {/* ── Harmony gradient ── */}
                        <div class="gen-palette-section">
                          <div class="gen-palette-role-header">
                            <span class="gen-palette-role-name">Gradient</span>
                          </div>
                          <CopyableGradientBar css={props.gradients[0].css} stops={props.gradients[0].stops} />
                          <p class="gen-gradient-css">{props.gradients[0].css}</p>
                        </div>

                        {/* ── Vivid ── */}
                        {props.gradients[1] && (
                          <div class="gen-palette-section">
                            <div class="gen-palette-role-header">
                              <span class="gen-palette-role-name">Vivid</span>
                            </div>
                            <CopyableGradientBar css={props.gradients[1].css} stops={props.gradients[1].stops} />
                            <p class="gen-gradient-css">{props.gradients[1].css}</p>
                          </div>
                        )}

                        {/* ── Role × Neutral 50 trio ── */}
                        {props.gradients[2] && props.gradients[3] && props.gradients[4] && (
                          <div class="gen-palette-section">
                            <div class="gen-palette-role-header">
                              <span class="gen-palette-role-name">× Neutral 50</span>
                            </div>
                            <div class="gen-gradient-trio">
                              {([
                                { label: 'Primary',   g: props.gradients[2] },
                                { label: 'Secondary', g: props.gradients[3] },
                                { label: 'Accent',    g: props.gradients[4] }
                              ] as Array<{ label: string; g: import('../lib/gradient').GradientResult }>).map(function (item) {
                                return (
                                  <div key={item.label} class="gen-gradient-trio-item">
                                    <CopyableGradientBar css={item.g.css} />
                                    <span class="gen-gradient-trio-label">{item.label}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <div class="gen-empty-state">
                    <p class="text-code text-muted">Enter a color to generate your palette.</p>
                  </div>
                )}
              </div>
            )}

            {/* UI PREVIEW TAB */}
            {activeTab === 'ui-preview' && (
              <div class="gen-ui-preview-tab">
                {props.palette ? (
                  <div
                    class="preview-surface"
                    style={{
                      backgroundColor: scaleHex(props.palette.neutral, 50, '#f8fafc'),
                      borderColor: scaleHex(props.palette.neutral, 200, '#e2e8f0'),
                      color: scaleHex(props.palette.neutral, 900, '#0f172a'),
                    }}
                  >
                    <div class="preview-head">
                      <div>
                        <p class="text-code text-small">Product Card</p>
                        <p class="text-body">Tokenized preview block</p>
                      </div>
                      <span
                        class="preview-badge text-code text-small"
                        style={{
                          backgroundColor: scaleHex(props.palette.accent, 100, '#e0f2fe'),
                          color: scaleHex(props.palette.accent, 700, '#0c4a6e'),
                        }}
                      >
                        Accent Tag
                      </span>
                    </div>
                    <p class="text-body text-muted">
                      Use this as a sanity check before exporting tokens to your real app.
                    </p>
                    <div class="preview-actions">
                      <button
                        type="button"
                        class="preview-button-primary"
                        style={{
                          backgroundColor: scaleHex(props.palette.primary, 600, '#2563eb'),
                          color: scaleHex(props.palette.primary, 50, '#eff6ff'),
                        }}
                      >
                        Primary action
                      </button>
                      <button
                        type="button"
                        class="preview-button-secondary"
                        style={{
                          backgroundColor: scaleHex(props.palette.neutral, 100, '#f1f5f9'),
                          color: scaleHex(props.palette.neutral, 900, '#0f172a'),
                          borderColor: scaleHex(props.palette.neutral, 300, '#cbd5e1'),
                        }}
                      >
                        Secondary action
                      </button>
                    </div>
                  </div>
                ) : (
                  <div class="gen-empty-state">
                    <p class="text-code text-muted">
                      Generate a palette to see the live UI preview.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* CONTRAST TAB */}
            {activeTab === 'contrast' && (
              <div class="gen-contrast-tab">
                {props.palette ? (
                  <>
                    {/* ── Use case header ── */}
                    <div class="gen-palette-role-header">
                      <span class="gen-palette-role-name">Use cases</span>
                      <span class="gen-palette-role-hex">Best-fit pairs from the primary scale</span>
                    </div>

                    {/* ── Use case cards ── */}
                    <div class="gen-contrast-use-cases">
                      {usageRows.map(function (row) {
                        var textHex = scaleHex(props.palette!.primary, row.textStep, '#000000');
                        var bgHex = scaleHex(props.palette!.primary, row.backgroundStep, '#ffffff');
                        var grade = row.pass ? ratioGrade(row.ratio) : 'Fail';
                        var gradeClass = grade === 'AAA' ? 'gcg-aaa' : grade === 'AA' ? 'gcg-aa' : grade === 'AA Large' ? 'gcg-aal' : 'gcg-fail';
                        var exampleText =
                          row.label === 'Body text on light surfaces' ? 'The quick brown fox jumps over the lazy dog.' :
                          row.label === 'Body text on brand surfaces' ? 'Get started →' :
                          row.label === 'Large headlines on brand surfaces' ? 'Hello.' :
                          'Last updated 2 hours ago';
                        var isLargeType = row.label === 'Large headlines on brand surfaces';
                        return (
                          <div key={row.label} class="gen-contrast-card">
                            {/* Preview swatch */}
                            <div class="gen-contrast-preview" style={{ background: bgHex }}>
                              <span
                                class="gen-contrast-preview-text"
                                style={{
                                  color: textHex,
                                  fontSize: isLargeType ? '32px' : '13px',
                                  fontWeight: isLargeType ? '800' : '400',
                                  fontFamily: isLargeType ? "'Hepta Slab', serif" : "'JetBrains Mono', monospace",
                                  lineHeight: isLargeType ? '1' : '1.5',
                                  maxWidth: '100%',
                                  wordBreak: 'break-word',
                                  textAlign: 'left',
                                }}
                              >
                                {exampleText}
                              </span>
                            </div>
                            {/* Meta */}
                            <div class="gen-contrast-card-meta">
                              <span class="gen-contrast-card-label">{row.label}</span>
                              <div class="gen-contrast-card-row">
                                <span class="gen-contrast-card-pair">
                                  <span class="gen-contrast-dot" style={{ background: textHex, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)' }} />
                                  {row.textStep}
                                  <span class="gen-contrast-on">on</span>
                                  <span class="gen-contrast-dot" style={{ background: bgHex, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)' }} />
                                  {row.backgroundStep}
                                </span>
                                <span class={'gen-contrast-grade ' + gradeClass}>
                                  {row.ratio.toFixed(1)}:1 · {grade}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* ── Raw step ratios ── */}
                    {(function () {
                      var scale = props.palette!.primary.scale;
                      // crossover: first step where white has >= contrast than black
                      var crossoverStep = 0;
                      for (var ci = 0; ci < scale.length; ci++) {
                        if (contrastRatio('#ffffff', scale[ci].hex) >= contrastRatio('#000000', scale[ci].hex)) {
                          crossoverStep = scale[ci].step;
                          break;
                        }
                      }
                      // only steps where the best ratio passes AA (>= 4.5)
                      var passing = scale.filter(function (s) {
                        return Math.max(contrastRatio('#ffffff', s.hex), contrastRatio('#000000', s.hex)) >= 4.5;
                      });
                      return (
                        <>
                          <div class="gen-palette-role-header">
                            <span class="gen-palette-role-name">Raw step ratios</span>
                            <span class="gen-palette-role-hex">
                              white on {crossoverStep}+ · black below {crossoverStep} · AA passing only
                            </span>
                          </div>
                          <div class="gen-contrast-raw-grid">
                            <div class="gen-contrast-raw-row gen-contrast-raw-row--head gen-contrast-raw-row--3col">
                              <span />
                              <span>Step</span>
                              <span>Ratio</span>
                            </div>
                            {passing.map(function (step) {
                              var wr = contrastRatio('#ffffff', step.hex);
                              var br = contrastRatio('#000000', step.hex);
                              var useWhite = wr >= br;
                              var ratio = useWhite ? wr : br;
                              var grade = ratioGrade(ratio);
                              var badgeClass = grade === 'AAA' ? 'gcg-pass-sm gcg-pass-aaa' : 'gcg-pass-sm';
                              return (
                                <div key={step.step} class="gen-contrast-raw-row gen-contrast-raw-row--3col">
                                  <div class="gen-contrast-raw-swatch" style={{ background: step.hex }} />
                                  <span class="gen-contrast-raw-step">
                                    {step.step}
                                    <span
                                      class="gen-contrast-fg-pill"
                                      style={{
                                        background: useWhite ? '#ffffff' : '#000000',
                                        color: useWhite ? '#000000' : '#ffffff',
                                        border: '1px solid rgba(0,0,0,0.12)',
                                      }}
                                    >
                                      {useWhite ? 'W' : 'B'}
                                    </span>
                                  </span>
                                  <span class="gen-contrast-raw-ratio">
                                    {ratio.toFixed(1)}:1 <span class={'gen-contrast-badge ' + badgeClass}>{grade}</span>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <div class="gen-empty-state">
                    <p class="text-code text-muted">
                      Generate a palette to see contrast data.
                    </p>
                  </div>
                )}
              </div>
            )}

          </div>
        </main>

        {/* ════ RIGHT SIDEBAR ════ */}
        <aside class="gen-right">
          <RightSidebarContent />
        </aside>
      </div>

      {/* ════ EXPORT DRAWER (small screens) ════ */}
      {exportDrawerOpen && (
        <div
          class="gen-drawer-overlay"
          onClick={function () { setExportDrawerOpen(false); }}
        >
          <aside
            class="gen-drawer"
            onClick={function (e) { e.stopPropagation(); }}
          >
            <div class="gen-drawer-header">
              <span class="gen-drawer-title">Export</span>
              <button
                type="button"
                class="gen-drawer-close"
                onClick={function () { setExportDrawerOpen(false); }}
              >
                ×
              </button>
            </div>
            <div class="gen-drawer-body">
              <RightSidebarContent />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export type { GeneratorProps };
