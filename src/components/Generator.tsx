import { hexToRgb, parseColorInput } from '../lib/color';
import type { ScaleColor } from '../lib/scale';

export type PaletteItem = {
  id: string;
  name: string;
  color: string;
};

type Props = {
  palettes: PaletteItem[];
  activePaletteId: string;
  activeHex: string;
  colorError: string;
  scale: ScaleColor[];
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onColorChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
};

function ratioGrade(ratio: number): string {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  return 'Fail';
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

export function Generator(props: Props) {
  return (
    <section id="generator" class="section">
      <h2>Generator</h2>
      <div class="generator-layout">
        <aside class="generator-sidebar panel">
          <div class="panel-head"><h3>Palette names</h3><button type="button" onClick={props.onAdd}>Add</button></div>
          <div class="palette-list">
            {props.palettes.map(function (palette) {
              var active = palette.id === props.activePaletteId;
              return (
                <div key={palette.id} class={active ? 'palette-row active' : 'palette-row'}>
                  <button type="button" onClick={function () { props.onSelect(palette.id); }}>{palette.name}</button>
                  <input
                    value={palette.name}
                    onInput={function (event) {
                      props.onRename(palette.id, (event.currentTarget as HTMLInputElement).value);
                    }}
                  />
                  {props.palettes.length > 1 ? (
                    <button type="button" class="remove" onClick={function () { props.onRemove(palette.id); }}>x</button>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div class="input-row">
            <label>Brand color</label>
            <input value={props.activeHex} onInput={function (event) { props.onColorChange((event.currentTarget as HTMLInputElement).value); }} />
          </div>
          <div class="picker-row">
            <input
              type="color"
              value={parseColorInput(props.activeHex) ? props.activeHex : '#4f46e5'}
              onInput={function (event) {
                props.onColorChange((event.currentTarget as HTMLInputElement).value);
              }}
            />
          </div>
          {props.colorError ? <p class="error">{props.colorError}</p> : null}
        </aside>
        <div class="generator-main">
          <div class="scale-grid panel">
            {props.scale.map(function (item) {
              var textColor = item.step > 500 ? '#ffffff' : '#000000';
              return (
                <article key={item.step} class="scale-card" style={{ backgroundColor: item.hex, color: textColor }}>
                  <span>{item.step}</span>
                  <code>{item.hex}</code>
                </article>
              );
            })}
          </div>
          <div class="panel contrast-wrap">
            <h3>Contrast checker (WCAG)</h3>
            <div class="contrast-head"><span>Step</span><span>White text</span><span>Black text</span></div>
            {props.scale.map(function (item) {
              var w = contrastRatio(item.hex, true);
              var b = contrastRatio(item.hex, false);
              return (
                <div key={item.step} class="contrast-row">
                  <span>{item.step}</span>
                  <span>{w.toFixed(2)} {ratioGrade(w)}</span>
                  <span>{b.toFixed(2)} {ratioGrade(b)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
