import { useMemo, useState } from 'preact/hooks';
import { HARMONY_TYPES, type HarmonyResult, type HarmonyType } from '../lib/harmony';
import type { GradientResult } from '../lib/gradient';
import type { FullPalette } from '../lib/palette';
import { SHADE_MODES, type ShadeMode } from '../lib/shades';
import { extractThemeFromImageFile } from '../lib/image-theme';
import type { Oklch } from '../lib/color';
import { buildUsageMatrix, contrastRatio, ratioGrade } from '../lib/contrast';
import type { AnchorBehavior } from '../lib/scale';

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
};

function formatHarmonyLabel(label: string): string {
  if (label === 'Split Complementary') return 'Split-Comp';
  return label;
}

function formatOklch(value: Oklch | null): string {
  if (!value) return 'L: -, C: -, H: -';
  return 'L: ' + value.l.toFixed(3) + '   C: ' + value.c.toFixed(3) + '   H: ' + value.h.toFixed(1) + 'deg';
}

function scaleHex(entry: FullPalette[keyof FullPalette], step: number, fallback: string): string {
  var item = entry.scale.find(function (token) {
    return token.step === step;
  });
  return item ? item.hex : fallback;
}

export function Generator(props: GeneratorProps) {
  var previewHex = props.palette ? props.palette.primary.baseHex : '#3b82f6';

  var advancedState = useState(false);
  var showAdvanced = advancedState[0];
  var setShowAdvanced = advancedState[1];

  var imageThemeState = useState<string[]>([]);
  var imageTheme = imageThemeState[0];
  var setImageTheme = imageThemeState[1];

  var imageExtractingState = useState(false);
  var imageExtracting = imageExtractingState[0];
  var setImageExtracting = imageExtractingState[1];

  var imageStatusState = useState('');
  var imageStatus = imageStatusState[0];
  var setImageStatus = imageStatusState[1];

  var usageRows = useMemo(function () {
    if (!props.palette) return [];
    return buildUsageMatrix(props.palette.primary.scale);
  }, [props.palette]);

  async function onImageSelected(event: Event) {
    var input = event.currentTarget as HTMLInputElement;
    var file = input.files && input.files[0];
    if (!file) return;

    setImageExtracting(true);
    setImageStatus('Extracting theme...');

    try {
      var colors = await extractThemeFromImageFile(file, 6);
      if (!colors.length) {
        setImageStatus('No usable colors found in image.');
        setImageTheme([]);
        return;
      }
      setImageTheme(colors);
      props.onColorChange(colors[0]);
      setImageStatus('Extracted ' + colors.length + ' colors. Applied first color.');
    } catch (_err) {
      setImageStatus('Failed to extract theme from image.');
      setImageTheme([]);
    } finally {
      setImageExtracting(false);
      input.value = '';
    }
  }

  return (
    <section class="section workspace-generator">
      <div class="section-inner flex flex-col gap-lg">
        <div class="card quick-start-card" id="quick-start">
          <div class="quick-start-head">
            <h2 class="text-body-lg">Quick Start</h2>
            <span class="text-code text-small">{'Input -> Generate -> Export'}</span>
          </div>
          <div class="color-input-area">
            <input
              class="text-code color-hex-input"
              value={props.colorInput}
              onInput={function (event) {
                props.onColorChange((event.currentTarget as HTMLInputElement).value);
              }}
              placeholder="#3b82f6"
              spellcheck={false}
              aria-invalid={props.colorError ? 'true' : 'false'}
              aria-describedby="generator-color-error"
            />
            <input
              class="color-native-input"
              type="color"
              value={previewHex}
              onInput={function (event) {
                props.onColorChange((event.currentTarget as HTMLInputElement).value);
              }}
            />
            <div class="color-preview-swatch" style={{ backgroundColor: previewHex }} title={previewHex} />
          </div>

          {props.recentColors.length ? (
            <div class="recent-color-wrap">
              <p class="text-code text-small text-muted">Recent colors</p>
              <div class="recent-color-row">
                {props.recentColors.map(function (hex) {
                  var active = props.colorInput.toLowerCase() === hex.toLowerCase();
                  return (
                    <button
                      type="button"
                      key={hex}
                      class={active ? 'recent-color-chip active' : 'recent-color-chip'}
                      onClick={function () {
                        props.onSelectRecentColor(hex);
                      }}
                      title={hex}
                    >
                      <span class="recent-color-dot" style={{ backgroundColor: hex }} />
                      <span class="text-code text-small">{hex}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div class="image-theme-wrap">
            <div class="image-theme-head">
              <p class="text-code text-small text-muted">Image theme extractor</p>
              <label class="image-upload-btn" aria-disabled={imageExtracting ? 'true' : 'false'}>
                {imageExtracting ? 'Extracting...' : 'Upload image'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={onImageSelected}
                  disabled={imageExtracting}
                  class="image-upload-input"
                />
              </label>
            </div>
            {imageTheme.length ? (
              <div class="image-theme-row">
                {imageTheme.map(function (hex) {
                  return (
                    <button
                      key={hex}
                      type="button"
                      class="image-theme-chip"
                      onClick={function () {
                        props.onColorChange(hex);
                      }}
                      title={'Apply ' + hex}
                    >
                      <span class="recent-color-dot" style={{ backgroundColor: hex }} />
                      <span class="text-code text-small">{hex}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
            {imageStatus ? <p class="text-code text-small text-muted">{imageStatus}</p> : null}
          </div>

          <p class="text-code text-muted">{formatOklch(props.primaryOklch)}</p>
          {props.colorError ? (
            <p id="generator-color-error" class="text-body" style={{ color: '#b91c1c' }}>
              {props.colorError}
            </p>
          ) : (
            <p class="text-body text-muted">Looks good. Scroll right panel to copy your preferred format.</p>
          )}
        </div>

        <div class="card flex flex-col gap-md">
          <h3 class="text-body-lg">Shade Mode</h3>
          <div class="shade-mode-row">
            {SHADE_MODES.map(function (mode) {
              var active = mode.id === props.shadeMode;
              return (
                <button
                  type="button"
                  key={mode.id}
                  class={active ? 'btn btn-primary' : 'btn btn-secondary'}
                  aria-pressed={active ? 'true' : 'false'}
                  onClick={function () {
                    props.onShadeModeChange(mode.id);
                  }}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>

        <div class="card flex flex-col gap-sm">
          <h3 class="text-body-lg">Input Anchor Behavior</h3>
          <div class="shade-mode-row">
            <button
              type="button"
              class={props.anchorBehavior === 'preserve-input' ? 'btn btn-primary' : 'btn btn-secondary'}
              aria-pressed={props.anchorBehavior === 'preserve-input' ? 'true' : 'false'}
              onClick={function () {
                props.onAnchorBehaviorChange('preserve-input');
              }}
            >
              Keep input color
            </button>
            <button
              type="button"
              class={props.anchorBehavior === 'auto-gamut' ? 'btn btn-primary' : 'btn btn-secondary'}
              aria-pressed={props.anchorBehavior === 'auto-gamut' ? 'true' : 'false'}
              onClick={function () {
                props.onAnchorBehaviorChange('auto-gamut');
              }}
            >
              Auto gamut anchor
            </button>
          </div>
          <p class="text-body text-muted">
            Input color anchors at <span class="text-code">primary-{props.anchorStep}</span>. Current mode:{' '}
            {props.anchorBehavior === 'preserve-input' ? 'exact input preserved' : 'auto gamut-optimized tone'}.
          </p>
        </div>

        <div class="card flex flex-col gap-sm">
          <button
            type="button"
            class="advanced-toggle"
            aria-expanded={showAdvanced ? 'true' : 'false'}
            onClick={function () {
              setShowAdvanced(!showAdvanced);
            }}
          >
            <span class="text-body-lg">Advanced controls</span>
            <span class="text-code">{showAdvanced ? 'Hide' : 'Show'}</span>
          </button>
          {showAdvanced ? (
            <div class="flex flex-col gap-md">
              <div class="flex flex-col gap-sm">
                <h3 class="text-body">Harmony</h3>
                <div class="harmony-row">
                  {HARMONY_TYPES.map(function (item) {
                    var active = item.id === props.harmonyType;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        class={active ? 'btn btn-primary' : 'btn btn-secondary'}
                        aria-pressed={active ? 'true' : 'false'}
                        onClick={function () {
                          props.onHarmonyTypeChange(item.id);
                        }}
                      >
                        {formatHarmonyLabel(item.label)}
                      </button>
                    );
                  })}
                </div>
                <div class="swatch-row">
                  {props.harmony
                    ? props.harmony.colors.map(function (color, index) {
                        return <div key={color.hex + '-' + index} class="harmony-swatch" style={{ backgroundColor: color.hex }} />;
                      })
                    : null}
                </div>
              </div>

              <div class="flex flex-col gap-sm">
                <h3 class="text-body">Gradient Suggestions</h3>
                {props.gradients.map(function (gradient, index) {
                  var label = 'Complement';
                  if (index === 1) label = 'Light -> Dark';
                  if (index === 2) label = 'Analogous';
                  if (index === 3) label = 'Triadic';

                  return (
                    <div key={'gradient-' + index} class="flex flex-col gap-sm">
                      <p class="text-body text-muted">{label}</p>
                      <div class="gradient-bar" style={{ background: gradient.css }} />
                      <p class="gradient-css text-code">{gradient.css}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p class="text-body text-muted">Harmony and gradient exploration are available when you need deeper tuning.</p>
          )}
        </div>

        {props.palette ? (
          <div class="grid-2 gap-md palette-grid" id="palette-preview">
            {[
              props.palette.primary,
              props.palette.secondary,
              props.palette.accent,
              props.palette.neutral
            ].map(function (entry) {
              return (
                <article key={entry.role} class="card palette-section flex flex-col gap-sm">
                  <div class="flex items-center gap-sm">
                    <h4 class="text-body-lg">{entry.label}</h4>
                    <div class="mini-swatch" style={{ backgroundColor: entry.baseHex }} />
                    <span class="text-code text-small">{entry.baseHex}</span>
                  </div>
                  <div class="scale-row">
                    {entry.scale.map(function (step) {
                      var textColor = step.step > 500 ? '#ffffff' : '#000000';
                      return (
                        <div key={step.step} class="scale-card" style={{ backgroundColor: step.hex, color: textColor }}>
                          <span class="text-code text-small">{step.step}</span>
                          <span class="text-code text-small">{step.hex}</span>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}

        {props.palette ? (
          <article class="card flex flex-col gap-md" id="ui-preview">
            <h3 class="text-body-lg">Live UI Preview</h3>
            <p class="text-body text-muted">A quick component mock powered by your generated tokens.</p>
            <div
              class="preview-surface"
              style={{
                backgroundColor: scaleHex(props.palette.neutral, 50, '#f8fafc'),
                borderColor: scaleHex(props.palette.neutral, 200, '#e2e8f0'),
                color: scaleHex(props.palette.neutral, 900, '#0f172a')
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
                    color: scaleHex(props.palette.accent, 700, '#0c4a6e')
                  }}
                >
                  Accent Tag
                </span>
              </div>
              <p class="text-body text-muted">Use this as a sanity check before exporting tokens to your real app.</p>
              <div class="preview-actions">
                <button
                  type="button"
                  class="preview-button-primary"
                  style={{
                    backgroundColor: scaleHex(props.palette.primary, 600, '#2563eb'),
                    color: scaleHex(props.palette.primary, 50, '#eff6ff')
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
                    borderColor: scaleHex(props.palette.neutral, 300, '#cbd5e1')
                  }}
                >
                  Secondary action
                </button>
              </div>
            </div>
          </article>
        ) : null}

        {props.palette ? (
          <div class="card flex flex-col gap-sm" id="contrast-matrix">
            <h3 class="text-body-lg">Contrast Usage Matrix</h3>
            <p class="text-body text-muted">Recommended step pairs for common UI use cases using the primary scale.</p>
            <div class="contrast-matrix-head text-code text-small">
              <span>Use case</span>
              <span>Pair</span>
              <span>Ratio</span>
              <span>Status</span>
            </div>
            {usageRows.map(function (row) {
              return (
                <div key={row.label} class="contrast-matrix-row text-code text-small">
                  <span>{row.label}</span>
                  <span>
                    text-{row.textStep} on bg-{row.backgroundStep}
                  </span>
                  <span>{row.ratio.toFixed(2)}</span>
                  <span>{row.pass ? ratioGrade(row.ratio) : 'Improve'}</span>
                </div>
              );
            })}

            <details class="contrast-raw">
              <summary class="text-body">Raw step ratios</summary>
              <div class="contrast-grid-head text-code text-small">
                <span>Step</span>
                <span>White</span>
                <span>Black</span>
              </div>
              {props.palette.primary.scale.map(function (step) {
                var whiteRatio = contrastRatio('#ffffff', step.hex);
                var blackRatio = contrastRatio('#000000', step.hex);
                return (
                  <div key={step.step} class="contrast-grid-row text-code text-small">
                    <span>{step.step}</span>
                    <span>
                      {whiteRatio.toFixed(2)} {ratioGrade(whiteRatio)}
                    </span>
                    <span>
                      {blackRatio.toFixed(2)} {ratioGrade(blackRatio)}
                    </span>
                  </div>
                );
              })}
            </details>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export type { GeneratorProps };
