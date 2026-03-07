import { useState } from 'preact/hooks';
import { generateScale, generateHslScale, type ScaleColor } from '../lib/scale';
import { type Oklch } from '../lib/color';

export function ScaleComparisonInteractive() {
  const [baseL, setBaseL] = useState(0.65);
  const [baseC, setBaseC] = useState(0.25);
  const [baseH, setBaseH] = useState(250);

  const demoBase: Oklch = { l: baseL, c: baseC, h: baseH };
  const hslScale = generateHslScale(demoBase);
  const oklchScale = generateScale(demoBase);

  // Calculate perceived brightness variance
  function calculateVariance(scale: ScaleColor[]): number {
    if (scale.length < 2) return 0;
    const gaps: number[] = [];
    for (let i = 1; i < scale.length; i++) {
      gaps.push(Math.abs(scale[i].lch.l - scale[i - 1].lch.l));
    }
    const mean = gaps.reduce((acc, val) => acc + val, 0) / gaps.length;
    const variance = gaps.reduce((acc, val) => {
      const diff = val - mean;
      return acc + diff * diff;
    }, 0) / gaps.length;
    return variance;
  }

  const hslVariance = calculateVariance(hslScale);
  const oklchVariance = calculateVariance(oklchScale);
  const improvement = ((hslVariance - oklchVariance) / hslVariance * 100).toFixed(1);

  return (
    <article class="card scale-comparison-interactive flex flex-col gap-md">
      <div class="flex flex-col gap-sm">
        <h3 class="text-body-lg">Scale Uniformity: HSL vs OKLCH</h3>
        <p class="text-body text-muted">
          Adjust the base color and watch how HSL produces uneven visual steps while OKLCH maintains consistent perceived brightness differences. Lower variance = more uniform scale.
        </p>
      </div>

      <div class="scale-controls-grid">
        <div class="scale-control-item">
          <label class="text-body text-small">
            <strong>Lightness</strong>
          </label>
          <input
            type="range"
            min="0.3"
            max="0.8"
            step="0.01"
            value={baseL}
            onInput={(e) => setBaseL(parseFloat((e.target as HTMLInputElement).value))}
            class="lch-slider"
          />
          <span class="text-code text-small">{baseL.toFixed(2)}</span>
        </div>

        <div class="scale-control-item">
          <label class="text-body text-small">
            <strong>Chroma</strong>
          </label>
          <input
            type="range"
            min="0.05"
            max="0.35"
            step="0.01"
            value={baseC}
            onInput={(e) => setBaseC(parseFloat((e.target as HTMLInputElement).value))}
            class="lch-slider"
          />
          <span class="text-code text-small">{baseC.toFixed(2)}</span>
        </div>

        <div class="scale-control-item">
          <label class="text-body text-small">
            <strong>Hue</strong>
          </label>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={baseH}
            onInput={(e) => setBaseH(parseFloat((e.target as HTMLInputElement).value))}
            class="lch-slider"
          />
          <span class="text-code text-small">{baseH.toFixed(0)}°</span>
        </div>
      </div>

      <div class="scale-comparison-results">
        <div class="scale-result-row">
          <div class="scale-result-header">
            <span class="text-code text-small text-muted">HSL Scale</span>
            <div class="scale-variance-badge scale-variance-badge--warning">
              <span class="text-code text-small">Variance: {hslVariance.toFixed(5)}</span>
            </div>
          </div>
          <div class="scale-swatches">
            {hslScale.map((item, i) => (
              <div
                key={`hsl-${i}`}
                class="scale-swatch"
                style={{ backgroundColor: item.hex }}
                title={`${item.step}: ${item.hex}`}
              >
                <span class="scale-step-label text-code">{item.step}</span>
              </div>
            ))}
          </div>
        </div>

        <div class="scale-result-row">
          <div class="scale-result-header">
            <span class="text-code text-small text-muted">OKLCH Scale</span>
            <div class="scale-variance-badge scale-variance-badge--success">
              <span class="text-code text-small">Variance: {oklchVariance.toFixed(5)}</span>
            </div>
          </div>
          <div class="scale-swatches">
            {oklchScale.map((item, i) => (
              <div
                key={`oklch-${i}`}
                class="scale-swatch"
                style={{ backgroundColor: item.hex }}
                title={`${item.step}: ${item.hex}`}
              >
                <span class="scale-step-label text-code">{item.step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div class="scale-metrics-summary">
        <div class="metric-card">
          <span class="metric-value text-body-lg">{improvement}%</span>
          <span class="metric-label text-code text-small">More uniform</span>
        </div>
        <div class="metric-card">
          <span class="metric-value text-body-lg">{oklchScale.length}</span>
          <span class="metric-label text-code text-small">Steps</span>
        </div>
        <div class="metric-card">
          <span class="metric-value text-body-lg">
            {(hslVariance / oklchVariance).toFixed(1)}x
          </span>
          <span class="metric-label text-code text-small">Variance reduction</span>
        </div>
      </div>

      <div class="scale-insight-box">
        <p class="text-body text-small">
          <strong>Visual test:</strong> Squint your eyes and look at both scales. The HSL scale will show uneven "jumps" between some steps, while the OKLCH scale appears smoothly graduated. This consistency is crucial for UI design where predictable color relationships matter.
        </p>
      </div>
    </article>
  );
}
