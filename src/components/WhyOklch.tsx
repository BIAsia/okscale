import { parseColorInput, rgbToHex, rgbToOklch, oklchToRgb, type Oklch, type RGB } from '../lib/color';
import { generateHslScale, generateScale, SCALE_STEPS } from '../lib/scale';

type WhyOklchProps = {
  baseHex: string;
};

function normalizeHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

function oklchHex(lch: Oklch): string {
  return rgbToHex(oklchToRgb(lch));
}

function clampChroma(c: number): number {
  return Math.max(0, Math.min(0.4, c));
}

function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t
  };
}

function interpolateHue(a: number, b: number, t: number): number {
  var delta = ((b - a + 540) % 360) - 180;
  return normalizeHue(a + delta * t);
}

export function WhyOklch(props: WhyOklchProps) {
  var parsed = parseColorInput(props.baseHex);
  var fallback = parseColorInput('#3b82f6');
  var safeRgb = parsed || fallback || { r: 59, g: 130, b: 246 };
  var base = rgbToOklch(safeRgb);

  var demoBase = { l: 0.65, c: 0.25, h: 250 };
  var hslScale = generateHslScale(demoBase);
  var oklchScale = generateScale(demoBase);

  var lightnessStrip = Array.from({ length: 10 }, function (_, i) {
    var t = i / 9;
    return oklchHex({ l: t, c: 0, h: base.h });
  });

  var chromaStrip = Array.from({ length: 10 }, function (_, i) {
    var t = i / 9;
    return oklchHex({ l: 0.65, c: 0.4 * t, h: 250 });
  });

  var hueStrip = Array.from({ length: 12 }, function (_, i) {
    return oklchHex({ l: 0.65, c: 0.2, h: i * 30 });
  });

  var complement = oklchHex({ l: base.l, c: base.c, h: normalizeHue(base.h + 180) });
  var analogous = [
    oklchHex({ l: base.l, c: base.c, h: normalizeHue(base.h - 30) }),
    oklchHex({ l: base.l, c: base.c, h: normalizeHue(base.h) }),
    oklchHex({ l: base.l, c: base.c, h: normalizeHue(base.h + 30) })
  ];

  var hueShiftedShades = generateScale(base).map(function (item, index) {
    var shift = (5 - index) * 2.5;
    return oklchHex({ l: item.lch.l, c: clampChroma(item.lch.c), h: normalizeHue(item.lch.h - shift) });
  });

  var gradientStart = { l: 0.65, c: 0.2, h: normalizeHue(base.h - 35) };
  var gradientEnd = { l: 0.7, c: 0.24, h: normalizeHue(base.h + 145) };
  var rgbStart = oklchToRgb(gradientStart);
  var rgbEnd = oklchToRgb(gradientEnd);

  var rgbGradient = Array.from({ length: 9 }, function (_, i) {
    return rgbToHex(mixRgb(rgbStart, rgbEnd, i / 8));
  });

  var oklchGradient = Array.from({ length: 9 }, function (_, i) {
    var t = i / 8;
    return oklchHex({
      l: gradientStart.l + (gradientEnd.l - gradientStart.l) * t,
      c: gradientStart.c + (gradientEnd.c - gradientStart.c) * t,
      h: interpolateHue(gradientStart.h, gradientEnd.h, t)
    });
  });

  function renderSwatches(colors: string[]) {
    return (
      <div class="swatch-row">
        {colors.map(function (hex, index) {
          return <div key={hex + '-' + index} class="swatch" style={{ backgroundColor: hex }} title={hex} />;
        })}
      </div>
    );
  }

  return (
    <section id="why-oklch" class="section">
      <div class="section-inner flex flex-col gap-lg">
        <h2 class="text-section">Why Oklch?</h2>

        <div class="grid-2 gap-md">
          <article class="card flex flex-col gap-sm">
            <h3 class="text-body-lg">HSL Scale</h3>
            {renderSwatches(
              hslScale.map(function (item) {
                return item.hex;
              })
            )}
            <div class="swatch-row">
              {SCALE_STEPS.map(function (step) {
                return (
                  <span key={'hsl-step-' + step} class="text-code text-small text-muted">
                    {step}
                  </span>
                );
              })}
            </div>
          </article>

          <article class="card flex flex-col gap-sm">
            <h3 class="text-body-lg">Oklch Scale</h3>
            {renderSwatches(
              oklchScale.map(function (item) {
                return item.hex;
              })
            )}
            <div class="swatch-row">
              {SCALE_STEPS.map(function (step) {
                return (
                  <span key={'oklch-step-' + step} class="text-code text-small text-muted">
                    {step}
                  </span>
                );
              })}
            </div>
          </article>
        </div>

        <p class="text-body text-muted">
          Traditional HSL scales produce uneven perceived brightness — some steps look nearly identical while others jump
          dramatically. Oklch ensures each step is perceptually equidistant, creating scales that look and feel uniform to
          the human eye.
        </p>

        <div class="grid-3 gap-md">
          <article class="card flex flex-col gap-sm">
            <h3 class="text-body-lg">L — Lightness</h3>
            <p class="text-body text-muted">
              Perceptual lightness from 0 (black) to 1 (white). Unlike HSL, equal L steps produce equal perceived
              brightness changes.
            </p>
            {renderSwatches(lightnessStrip)}
          </article>

          <article class="card flex flex-col gap-sm">
            <h3 class="text-body-lg">C — Chroma</h3>
            <p class="text-body text-muted">
              Color intensity from 0 (gray) to ~0.4 (most vivid). Controls saturation without affecting perceived
              brightness.
            </p>
            {renderSwatches(chromaStrip)}
          </article>

          <article class="card flex flex-col gap-sm">
            <h3 class="text-body-lg">H — Hue</h3>
            <p class="text-body text-muted">
              Hue angle from 0° to 360°. Rotating hue in Oklch preserves perceived brightness — unlike HSL where
              "yellow" appears brighter than "blue" at the same lightness.
            </p>
            {renderSwatches(hueStrip)}
          </article>
        </div>

        <div class="flex flex-col gap-md">
          <h3 class="text-sub">How Oklch powers your color system</h3>

          <article class="card flex flex-col gap-sm">
            <p class="text-body">
              <strong>Complementary colors:</strong> Rotate hue by 180° for a perfect complement that matches perceived
              brightness.
            </p>
            {renderSwatches([rgbToHex(safeRgb), complement])}
          </article>

          <article class="card flex flex-col gap-sm">
            <p class="text-body">
              <strong>Analogous colors:</strong> Shift hue by ±30° for harmonious neighbors.
            </p>
            {renderSwatches(analogous)}
          </article>

          <article class="card flex flex-col gap-sm">
            <p class="text-body">
              <strong>Hue-shifted shades:</strong> Micro-rotate hue across lightness steps for natural, organic-feeling
              scales — lights shift warm, darks shift cool.
            </p>
            {renderSwatches(hueShiftedShades)}
          </article>

          <article class="card flex flex-col gap-sm">
            <p class="text-body">
              <strong>Vibrant gradients:</strong> Interpolate in Oklch space to avoid the muddy middle that RGB gradients
              produce.
            </p>
            <p class="text-code text-small text-muted">RGB interpolation</p>
            {renderSwatches(rgbGradient)}
            <p class="text-code text-small text-muted">Oklch interpolation</p>
            {renderSwatches(oklchGradient)}
          </article>
        </div>
      </div>
    </section>
  );
}
