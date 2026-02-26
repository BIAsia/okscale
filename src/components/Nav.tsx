type Props = {
  palettes: { id: string; name: string }[];
  activePaletteId: string;
  onPaletteChange: (id: string) => void;
};

export function Nav(props: Props) {
  return (
    <header class="site-nav">
      <a class="brand" href="#hero">
        OKSCALE
      </a>
      <nav class="nav-links" aria-label="Primary">
        <a href="#why">Why Oklch</a>
        <a href="#generator">Generator</a>
        <a href="#export">Export</a>
        <a href="#how">How it works</a>
      </nav>
      <label class="nav-palette">
        <span>Palette</span>
        <select
          value={props.activePaletteId}
          onChange={function (event) {
            var target = event.currentTarget as HTMLSelectElement;
            props.onPaletteChange(target.value);
          }}
        >
          {props.palettes.map(function (palette) {
            return (
              <option value={palette.id} key={palette.id}>
                {palette.name}
              </option>
            );
          })}
        </select>
      </label>
    </header>
  );
}
