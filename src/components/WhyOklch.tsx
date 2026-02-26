import type { ScaleColor } from '../lib/scale';

type Props = {
  oklchScale: ScaleColor[];
  hslScale: ScaleColor[];
};

function ScaleStrip(props: { title: string; scale: ScaleColor[]; tone: 'bad' | 'good' }) {
  return (
    <div class={props.tone === 'bad' ? 'compare-block bad' : 'compare-block good'}>
      <h3>{props.title}</h3>
      <div class="strip" aria-label={props.title + ' strip'}>
        {props.scale.map(function (item) {
          return <div key={item.step} title={item.step + ' ' + item.hex} style={{ backgroundColor: item.hex }} />;
        })}
      </div>
    </div>
  );
}

export function WhyOklch(props: Props) {
  return (
    <section id="why" class="section">
      <h2>Why Oklch?</h2>
      <p class="section-copy">
        Traditional HSL scales produce uneven perceived brightness. Oklch ensures each step looks equally spaced to the human eye.
      </p>
      <div class="compare-grid">
        <ScaleStrip title="HSL ramp (uneven)" scale={props.hslScale} tone="bad" />
        <ScaleStrip title="Oklch ramp (uniform)" scale={props.oklchScale} tone="good" />
      </div>
      <div class="axis-grid">
        <article>
          <h3>L</h3>
          <p>Lightness controls perceived brightness from near black to near white.</p>
        </article>
        <article>
          <h3>C</h3>
          <p>Chroma controls vividness while preserving visual structure across steps.</p>
        </article>
        <article>
          <h3>H</h3>
          <p>Hue controls color family, allowing stable ramps as you adjust brand direction.</p>
        </article>
      </div>
    </section>
  );
}
