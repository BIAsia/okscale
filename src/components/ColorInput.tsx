type Props = {
  value: string;
  onChange: (value: string) => void;
  previewHex: string;
  error?: string;
};

export function ColorInput(props: Props) {
  var pickerValue = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(props.value.trim()) ? props.value.trim() : props.previewHex;

  return (
    <section class="panel">
      <div class="panel-head">
        <h2>Brand color</h2>
      </div>
      <div class="input-grid">
        <label class="field">
          <span>Input (hex, rgb, hsl, oklch)</span>
          <input
            type="text"
            value={props.value}
            onInput={function (event) {
              var target = event.currentTarget as HTMLInputElement;
              props.onChange(target.value);
            }}
            placeholder="#3b82f6"
          />
        </label>
        <label class="field field-picker">
          <span>Picker</span>
          <input
            type="color"
            value={pickerValue}
            onInput={function (event) {
              var target = event.currentTarget as HTMLInputElement;
              props.onChange(target.value);
            }}
          />
        </label>
        <div class="swatch-wrap">
          <span>Preview</span>
          <div class="swatch" style={{ backgroundColor: props.previewHex }} />
          <code>{props.previewHex}</code>
        </div>
      </div>
      {props.error ? <p class="error">{props.error}</p> : null}
    </section>
  );
}
