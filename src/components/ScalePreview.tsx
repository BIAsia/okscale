import type { ScaleColor } from '../lib/scale';

type Props = {
  scale: ScaleColor[];
};

export function ScalePreview(props: Props) {
  return (
    <section class="panel">
      <div class="panel-head">
        <h2>Scale preview</h2>
      </div>
      <div class="scale-grid">
        {props.scale.map(function (item) {
          return (
            <article key={item.step} class="color-card" style={{ backgroundColor: item.hex }}>
              <div class="chip">{item.step}</div>
              <code>{item.hex}</code>
            </article>
          );
        })}
      </div>
    </section>
  );
}
