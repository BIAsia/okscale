import { HARMONY_TYPES, type HarmonyResult, type HarmonyType } from '../lib/harmony';
import type { GradientResult } from '../lib/gradient';
import type { FullPalette } from '../lib/palette';
import { SHADE_MODES, type ShadeMode } from '../lib/shades';
import type { Oklch } from '../lib/color';

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
};

function ratioGrade(ratio: number): string {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA Large';
  return 'Fail';
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  var clean = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  var value = parseInt(clean, 16);
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255
  };
}

function contrastRatio(hex: string, againstWhite: boolean): number {
  var rgb = hexToRgb(hex);
  if (!rgb) return 0;

  function linear(v: number): number {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }

  var luminance = 0.2126 * linear(rgb.r) + 0.7152 * linear(rgb.g) + 0.0722 * linear(rgb.b);
  var other = againstWhite ? 1 : 0;
  var light = Math.max(luminance, other);
  var dark = Math.min(luminance, other);
  return (light + 0.05) / (dark + 0.05);
}

function formatHarmonyLabel(label: string): string {
  if (label === 'Split Complementary') return 'Split-Comp';
  return label;
}

function formatOklch(value: Oklch | null): string {
  if (!value) return 'L: -, C: -, H: -';
  return 'L: ' + value.l.toFixed(3) + '   C: ' + value.c.toFixed(3) + '   H: ' + value.h.toFixed(1) + 'deg';
}

export function Generator(props: GeneratorProps) {
  var previewHex = props.palette ? props.palette.primary.baseHex : '#3b82f6';

  return (
    <section class="section">
      <div class="section-inner flex flex-col gap-lg">
        <h2 class="text-section">Generator</h2>

        <div class="card flex flex-col gap-md">
          <h3 class="text-body-lg">Base Color</h3>
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
          <p class="text-code text-muted">{formatOklch(props.primaryOklch)}</p>
          {props.colorError ? (
            <p id="generator-color-error" class="text-body" style={{ color: '#b91c1c' }}>
              {props.colorError}
            </p>
          ) : null}
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

        <div class="card flex flex-col gap-md">
          <h3 class="text-body-lg">Harmony</h3>
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

        {props.palette ? (
          <div class="grid-2 gap-md">
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
          <div class="card flex flex-col gap-sm">
            <h3 class="text-body-lg">Contrast Checker</h3>
            <div class="contrast-grid-head text-code text-small">
              <span>Step</span>
              <span>White</span>
              <span>Black</span>
            </div>
            {props.palette.primary.scale.map(function (step) {
              var whiteRatio = contrastRatio(step.hex, true);
              var blackRatio = contrastRatio(step.hex, false);
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
          </div>
        ) : null}

        <div class="card flex flex-col gap-md">
          <h3 class="text-body-lg">Gradient Suggestions</h3>
          {props.gradients.map(function (gradient, index) {
            var label = 'Complement';
            if (index === 1) label = 'Light -> Dark';
            if (index === 2) label = 'Analogous';
            if (index === 3) label = 'Triadic';

            return (
              <div key={'gradient-' + index} class="flex flex-col gap-sm">
                <p class="text-body">{label}</p>
                <div class="gradient-bar" style={{ background: gradient.css }} />
                <p class="gradient-css text-code">{gradient.css}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export type { GeneratorProps };
