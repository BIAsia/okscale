import { useState } from 'preact/hooks';
import { oklchToRgb, rgbToHex, type Oklch, type RGB } from '../lib/color';

function normalizeHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

function interpolateHue(a: number, b: number, t: number): number {
  const delta = ((b - a + 540) % 360) - 180;
  return normalizeHue(a + delta * t);
}

function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t
  };
}

export function GradientComparison() {
  const [startHue, setStartHue] = useState(330);
  const [endHue, setEndHue] = useState(200);

  const gradientStart: Oklch = { l: 0.65, c: 0.2, h: startHue };
  const gradientEnd: Oklch = { l: 0.7, c: 0.24, h: endHue };
  
  const rgbStart = oklchToRgb(gradientStart);
  const rgbEnd = oklchToRgb(gradientEnd);

  const steps = 15;

  // RGB interpolation (linear in RGB space)
  const rgbGradient = Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1);
    return rgbToHex(mixRgb(rgbStart, rgbEnd, t));
  });

  // OKLCH interpolation (perceptual)
  const oklchGradient = Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1);
    return rgbToHex(oklchToRgb({
      l: gradientStart.l + (gradientEnd.l - gradientStart.l) * t,
      c: gradientStart.c + (gradientEnd.c - gradientStart.c) * t,
      h: interpolateHue(gradientStart.h, gradientEnd.h, t)
    }));
  });

  const startHex = rgbToHex(rgbStart);
  const endHex = rgbToHex(rgbEnd);

  return (
    <article class="card gradient-comparison flex flex-col gap-md">
      <div class="flex flex-col gap-sm">
        <h3 class="text-body-lg">Gradient Interpolation: RGB vs OKLCH</h3>
        <p class="text-body text-muted">
          When creating gradients between two colors, RGB interpolation often produces muddy, desaturated middle tones. OKLCH interpolation maintains vibrancy throughout the gradient by interpolating in perceptual space.
        </p>
      </div>

      <div class="gradient-controls flex gap-md">
        <div class="gradient-control-group flex-1">
          <label class="text-body text-small">
            <strong>Start Hue</strong>
          </label>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={startHue}
            onInput={(e) => setStartHue(parseFloat((e.target as HTMLInputElement).value))}
            class="lch-slider"
          />
          <div class="gradient-color-preview" style={{ backgroundColor: startHex }}>
            <span class="text-code text-small">{startHue}°</span>
          </div>
        </div>

        <div class="gradient-control-group flex-1">
          <label class="text-body text-small">
            <strong>End Hue</strong>
          </label>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={endHue}
            onInput={(e) => setEndHue(parseFloat((e.target as HTMLInputElement).value))}
            class="lch-slider"
          />
          <div class="gradient-color-preview" style={{ backgroundColor: endHex }}>
            <span class="text-code text-small">{endHue}°</span>
          </div>
        </div>
      </div>

      <div class="gradient-comparison-grid">
        <div class="gradient-row">
          <div class="gradient-label">
            <span class="text-code text-small text-muted">RGB interpolation</span>
            <span class="gradient-badge gradient-badge--warning">Muddy middle</span>
          </div>
          <div class="gradient-strip">
            {rgbGradient.map((hex, i) => (
              <div
                key={`rgb-${i}`}
                class="gradient-step"
                style={{ backgroundColor: hex }}
                title={hex}
              />
            ))}
          </div>
        </div>

        <div class="gradient-row">
          <div class="gradient-label">
            <span class="text-code text-small text-muted">OKLCH interpolation</span>
            <span class="gradient-badge gradient-badge--success">Vibrant throughout</span>
          </div>
          <div class="gradient-strip">
            {oklchGradient.map((hex, i) => (
              <div
                key={`oklch-${i}`}
                class="gradient-step"
                style={{ backgroundColor: hex }}
                title={hex}
              />
            ))}
          </div>
        </div>
      </div>

      <div class="gradient-insight-box">
        <p class="text-body text-small">
          <strong>Why this matters:</strong> RGB gradients lose saturation in the middle because they interpolate through a non-perceptual color space. OKLCH maintains consistent chroma and brightness, producing gradients that feel natural and vibrant. This is especially important for UI backgrounds, illustrations, and data visualizations.
        </p>
      </div>
    </article>
  );
}
