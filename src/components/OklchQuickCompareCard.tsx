import { generateHslScale, generateScale } from '../lib/scale';

type OklchQuickCompareCardProps = {
  onNavigate: (to: string) => void;
};

export function OklchQuickCompareCard(props: OklchQuickCompareCardProps) {
  var demoBase = { l: 0.65, c: 0.25, h: 250 };
  var hslScale = generateHslScale(demoBase);
  var oklchScale = generateScale(demoBase);

  function strip(colors: string[]) {
    return (
      <div class="compact-strip">
        {colors.map(function (hex, index) {
          return <span key={hex + '-' + index} style={{ backgroundColor: hex }} class="compact-chip" />;
        })}
      </div>
    );
  }

  return (
    <section class="section">
      <div class="section-inner">
        <article class="card compact-compare-card flex flex-col gap-md">
          <div class="flex flex-col gap-sm">
            <h2 class="text-body-lg">HSL vs Oklch (quick proof)</h2>
            <p class="text-body text-muted">
              Same base color, same number of steps. HSL drifts in perceived brightness; Oklch stays visually even.
            </p>
          </div>

          <div class="compact-compare-grid">
            <div class="flex flex-col gap-sm">
              <p class="text-code text-small text-muted">HSL scale</p>
              {strip(
                hslScale.map(function (item) {
                  return item.hex;
                })
              )}
            </div>
            <div class="flex flex-col gap-sm">
              <p class="text-code text-small text-muted">Oklch scale</p>
              {strip(
                oklchScale.map(function (item) {
                  return item.hex;
                })
              )}
            </div>
          </div>

          <div class="compact-compare-actions">
            <button
              type="button"
              class="btn btn-accent"
              onClick={function () {
                props.onNavigate('/app');
              }}
            >
              Test it in Workspace
            </button>
            <a class="btn btn-secondary" href="#why-oklch">
              Deep dive
            </a>
          </div>
        </article>
      </div>
    </section>
  );
}
