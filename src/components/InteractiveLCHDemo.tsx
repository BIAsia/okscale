import { useState } from 'preact/hooks';
import { oklchToRgb, rgbToHex, type Oklch } from '../lib/color';

export function InteractiveLCHDemo() {
  const [lightness, setLightness] = useState(0.65);
  const [chroma, setChroma] = useState(0.15);
  const [hue, setHue] = useState(250);

  const currentColor: Oklch = { l: lightness, c: chroma, h: hue };
  const currentHex = rgbToHex(oklchToRgb(currentColor));

  // Generate strips for each dimension
  const lightnessStrip = Array.from({ length: 11 }, (_, i) => {
    const l = i / 10;
    return {
      hex: rgbToHex(oklchToRgb({ l, c: chroma, h: hue })),
      value: l,
      active: Math.abs(l - lightness) < 0.05
    };
  });

  const chromaStrip = Array.from({ length: 11 }, (_, i) => {
    const c = (i / 10) * 0.4;
    return {
      hex: rgbToHex(oklchToRgb({ l: lightness, c, h: hue })),
      value: c,
      active: Math.abs(c - chroma) < 0.02
    };
  });

  const hueStrip = Array.from({ length: 12 }, (_, i) => {
    const h = i * 30;
    return {
      hex: rgbToHex(oklchToRgb({ l: lightness, c: chroma, h })),
      value: h,
      active: Math.abs(h - hue) < 15 || Math.abs(h - hue) > 345
    };
  });

  return (
    <article class="card interactive-lch-demo flex flex-col gap-md">
      <div class="flex flex-col gap-sm">
        <h3 class="text-body-lg">Interactive OKLCH Control</h3>
        <p class="text-body text-muted">
          Adjust each dimension independently and see how they affect the final color. Notice how L controls brightness without affecting saturation, C controls intensity without affecting brightness, and H rotates through the color wheel.
        </p>
      </div>

      <div class="lch-demo-grid">
        <div class="lch-current-color" style={{ backgroundColor: currentHex }}>
          <div class="lch-color-label">
            <span class="text-code">{currentHex}</span>
            <span class="text-code text-small">
              L: {lightness.toFixed(2)} C: {chroma.toFixed(2)} H: {hue.toFixed(0)}°
            </span>
          </div>
        </div>

        <div class="lch-controls flex flex-col gap-md">
          <div class="lch-control-group">
            <div class="lch-control-header">
              <label class="text-body">
                <strong>L</strong> — Lightness
              </label>
              <span class="text-code text-small">{lightness.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={lightness}
              onInput={(e) => setLightness(parseFloat((e.target as HTMLInputElement).value))}
              class="lch-slider"
            />
            <div class="lch-strip">
              {lightnessStrip.map((item, i) => (
                <button
                  key={`l-${i}`}
                  class={`lch-strip-item ${item.active ? 'active' : ''}`}
                  style={{ backgroundColor: item.hex }}
                  onClick={() => setLightness(item.value)}
                  title={`L: ${item.value.toFixed(2)}`}
                />
              ))}
            </div>
          </div>

          <div class="lch-control-group">
            <div class="lch-control-header">
              <label class="text-body">
                <strong>C</strong> — Chroma
              </label>
              <span class="text-code text-small">{chroma.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.4"
              step="0.01"
              value={chroma}
              onInput={(e) => setChroma(parseFloat((e.target as HTMLInputElement).value))}
              class="lch-slider"
            />
            <div class="lch-strip">
              {chromaStrip.map((item, i) => (
                <button
                  key={`c-${i}`}
                  class={`lch-strip-item ${item.active ? 'active' : ''}`}
                  style={{ backgroundColor: item.hex }}
                  onClick={() => setChroma(item.value)}
                  title={`C: ${item.value.toFixed(2)}`}
                />
              ))}
            </div>
          </div>

          <div class="lch-control-group">
            <div class="lch-control-header">
              <label class="text-body">
                <strong>H</strong> — Hue
              </label>
              <span class="text-code text-small">{hue.toFixed(0)}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              step="1"
              value={hue}
              onInput={(e) => setHue(parseFloat((e.target as HTMLInputElement).value))}
              class="lch-slider"
            />
            <div class="lch-strip lch-strip--hue">
              {hueStrip.map((item, i) => (
                <button
                  key={`h-${i}`}
                  class={`lch-strip-item ${item.active ? 'active' : ''}`}
                  style={{ backgroundColor: item.hex }}
                  onClick={() => setHue(item.value)}
                  title={`H: ${item.value}°`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div class="lch-insight-box">
        <p class="text-body text-small">
          <strong>Key insight:</strong> In HSL, changing "L" affects both brightness AND saturation. In OKLCH, L only affects brightness, C only affects saturation, and H only affects hue. This independence makes color manipulation predictable and intuitive.
        </p>
      </div>
    </article>
  );
}
