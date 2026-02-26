export type PaletteItem = {
  id: string;
  name: string;
  color: string;
};

type Props = {
  palettes: PaletteItem[];
  activePaletteId: string;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
};

export function PaletteManager(props: Props) {
  return (
    <section class="panel">
      <div class="panel-head">
        <h2>Palettes</h2>
        <button type="button" class="small" onClick={props.onAdd}>
          Add palette
        </button>
      </div>
      <div class="palette-list">
        {props.palettes.map(function (palette) {
          var selected = palette.id === props.activePaletteId;
          return (
            <div key={palette.id} class={selected ? 'palette-item active' : 'palette-item'}>
              <button type="button" class="palette-select" onClick={function () { props.onSelect(palette.id); }}>
                {palette.name}
              </button>
              <input
                type="text"
                value={palette.name}
                onInput={function (event) {
                  var target = event.currentTarget as HTMLInputElement;
                  props.onRename(palette.id, target.value);
                }}
                aria-label={'Rename ' + palette.name}
              />
              {props.palettes.length > 1 ? (
                <button type="button" class="small danger" onClick={function () { props.onRemove(palette.id); }}>
                  Remove
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
