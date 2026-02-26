import type { ScaleColor } from '../lib/scale';
import { hexToRgb } from '../lib/color';

type Props = {
  scale: ScaleColor[];
};

function luminance(hex: string): number {
  var rgb = hexToRgb(hex);
  if (!rgb) return 0;

  function linear(v: number): number {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }

  return 0.2126 * linear(rgb.r) + 0.7152 * linear(rgb.g) + 0.0722 * linear(rgb.b);
}

function ratio(a: number, b: number): number {
  var light = Math.max(a, b);
  var dark = Math.min(a, b);
  return (light + 0.05) / (dark + 0.05);
}

function grade(value: number): string {
  if (value >= 7) return 'AAA';
  if (value >= 4.5) return 'AA';
  return 'Fail';
}

export function ContrastCheck(props: Props) {
  return (
    <section class="panel">
      <div class="panel-head">
        <h2>Contrast check</h2>
      </div>
      <div class="contrast-table">
        <div class="row head">
          <span>Step</span>
          <span>White text</span>
          <span>Black text</span>
        </div>
        {props.scale.map(function (item) {
          var lum = luminance(item.hex);
          var whiteRatio = ratio(lum, 1);
          var blackRatio = ratio(lum, 0);
          return (
            <div class="row" key={item.step}>
              <span>{item.step}</span>
              <span>{whiteRatio.toFixed(2)} ({grade(whiteRatio)})</span>
              <span>{blackRatio.toFixed(2)} ({grade(blackRatio)})</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
