export type ShareState = {
  activePaletteId: string;
  palettes: Array<{ id: string; name: string; color: string }>;
};

export function encodeShareState(state: ShareState): string {
  var raw = JSON.stringify(state);
  return encodeURIComponent(raw);
}

export function decodeShareState(value: string): ShareState | null {
  try {
    var parsed = JSON.parse(decodeURIComponent(value)) as ShareState;
    if (!parsed || !Array.isArray(parsed.palettes)) return null;
    return parsed;
  } catch (_err) {
    return null;
  }
}
