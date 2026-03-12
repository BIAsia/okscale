import { useState } from 'preact/hooks';
import { oklchToRgb, rgbToHex, type Oklch } from '../lib/color';
import { generateScale } from '../lib/scale';

function normalizeHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

export function HueShiftDemo() {
  const [baseHue, setBaseHue] = useState(220);
  const [shiftAmount, setShiftAmount] = useState(2.5);

  const baseColor: Oklch = { l: 0.65, c: 0.2, h: baseHue };
  const scale = generateScale(baseColor);

  // Generate hue-shifted scale
  const hueShiftedScale = scale.map((item, index) => {
    const shift = (5 - index) * shiftAmount;
    const shiftedHue = normalizeHue(item.lch.h + shift);
    return {
      ...item,
      hex: rgbToHex(oklchToRgb({ l: item.lch.l, c: item.lch.c, h: shiftedHue })),
      hue: shiftedHue,
      shift: shift
    };
  });

  // No shift version for comparison
  const noShiftScale = scale.map(item => ({
    ...item,
    hue: item.lch.h,
    shift: 0
  }));

  return (
    <article class="hue-shift-demo flex flex-col gap-md">
      <div class="flex flex-col gap-sm">
        <h3 class="text-body-lg">Natural Hue Shift</h3>
        <p class="text-body text-muted">
          In nature, colors don't just get lighter or darker—they shift in hue. Lighter tones tend warmer, darker tones cooler. This subtle shift makes color scales feel more organic and natural. Adjust the shift amount to see the effect.
        </p>
      </div>

      <div class="hue-shift-controls">
        <div class="hue-shift-control-group">
          <label class="text-body text-small">
            <strong>Base Hue</strong>
          </label>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={baseHue}
            onInput={(e) => setBaseHue(parseFloat((e.target as HTMLInputElement).value))}
            class="lch-slider"
          />
          <span class="text-code text-small">{baseHue}°</span>
        </div>

        <div class="hue-shift-control-group">
          <label class="text-body text-small">
            <strong>Shift Amount</strong>
          </label>
          <input
            type="range"
            min="0"
            max="8"
            step="0.5"
            value={shiftAmount}
            onInput={(e) => setShiftAmount(parseFloat((e.target as HTMLInputElement).value))}
            class="lch-slider"
          />
          <span class="text-code text-small">±{shiftAmount.toFixed(1)}° per step</span>
        </div>
      </div>

      <div class="hue-shift-comparison">
        <div class="hue-shift-row">
          <div class="hue-shift-label">
            <span class="text-code text-small text-muted">No hue shift</span>
            <span class="hue-shift-badge hue-shift-badge--neutral">Flat</span>
          </div>
          <div class="hue-shift-scale">
            {noShiftScale.map((item, i) => (
              <div
                key={`no-shift-${i}`}
                class="hue-shift-swatch"
                style={{ backgroundColor: item.hex }}
                title={`${item.step}: ${item.hex} (${item.hue.toFixed(0)}°)`}
              >
                <span class="hue-shift-step-label text-code">{item.step}</span>
              </div>
            ))}
          </div>
        </div>

        <div class="hue-shift-row">
          <div class="hue-shift-label">
            <span class="text-code text-small text-muted">With hue shift</span>
            <span class="hue-shift-badge hue-shift-badge--natural">Natural</span>
          </div>
          <div class="hue-shift-scale">
            {hueShiftedScale.map((item, i) => (
              <div
                key={`shift-${i}`}
                class="hue-shift-swatch"
                style={{ backgroundColor: item.hex }}
                title={`${item.step}: ${item.hex} (${item.hue.toFixed(0)}°, shift: ${item.shift > 0 ? '+' : ''}${item.shift.toFixed(1)}°)`}
              >
                <span class="hue-shift-step-label text-code">{item.step}</span>
                <span class="hue-shift-indicator text-code">
                  {item.shift > 0 ? '+' : ''}{item.shift.toFixed(1)}°
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div class="hue-shift-visualization">
        <div class="hue-shift-viz-header">
          <span class="text-body text-small"><strong>Hue progression</strong></span>
        </div>
        <div class="hue-shift-chart">
          <svg viewBox="0 0 400 120" class="hue-shift-svg">
            {/* Grid lines */}
            <line x1="40" y1="20" x2="40" y2="100" stroke="var(--ok-neutral-300)" stroke-width="1" />
            <line x1="40" y1="100" x2="380" y2="100" stroke="var(--ok-neutral-300)" stroke-width="1" />
            
            {/* No shift line */}
            <polyline
              points={noShiftScale.map((item, i) => {
                const x = 40 + (i / (noShiftScale.length - 1)) * 340;
                const y = 100;
                return `${x},${y}`;
              }).join(' ')}
              fill="none"
              stroke="var(--ok-neutral-400)"
              stroke-width="2"
              stroke-dasharray="4,4"
            />

            {/* Shifted line */}
            <polyline
              points={hueShiftedScale.map((item, i) => {
                const x = 40 + (i / (hueShiftedScale.length - 1)) * 340;
                const normalizedShift = (item.shift / (shiftAmount * 10)) * 40;
                const y = 100 - normalizedShift;
                return `${x},${y}`;
              }).join(' ')}
              fill="none"
              stroke="var(--ok-neutral-900)"
              stroke-width="2.5"
            />

            {/* Points */}
            {hueShiftedScale.map((item, i) => {
              const x = 40 + (i / (hueShiftedScale.length - 1)) * 340;
              const normalizedShift = (item.shift / (shiftAmount * 10)) * 40;
              const y = 100 - normalizedShift;
              return (
                <circle
                  key={`point-${i}`}
                  cx={x}
                  cy={y}
                  r="4"
                  fill={item.hex}
                  stroke="var(--ok-neutral-950)"
                  stroke-width="1.5"
                />
              );
            })}

            {/* Labels */}
            <text x="10" y="60" class="hue-shift-axis-label" fill="var(--ok-neutral-600)">Warmer</text>
            <text x="10" y="105" class="hue-shift-axis-label" fill="var(--ok-neutral-600)">Cooler</text>
          </svg>
        </div>
      </div>

      <div class="hue-shift-insight-box">
        <p class="text-body text-small">
          <strong>Why it works:</strong> Natural light sources (sun, fire, sky) create this hue shift pattern. Lighter tones shift toward warm (yellow/orange), darker tones toward cool (blue/purple). This mimics how our eyes perceive color in the real world, making digital interfaces feel more natural and less "computer-generated."
        </p>
      </div>
    </article>
  );
}
