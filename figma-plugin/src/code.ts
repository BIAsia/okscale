import type { PluginMessage, SerializedPalette, SerializedRole, SerializedScaleColor } from './messages';

figma.showUI(__html__, { width: 772, height: 624, themeColors: true });

function hexToFigmaRgb(hex: string): RGB {
  const clean = hex.replace(/^#/, '');
  const val = parseInt(clean, 16);
  return {
    r: ((val >> 16) & 255) / 255,
    g: ((val >> 8) & 255) / 255,
    b: (val & 255) / 255,
  };
}

function styleName(role: string, step: number): string {
  return 'OKScale/' + capitalize(role) + '/' + step;
}

function variableName(role: string, step: number): string {
  return capitalize(role) + '/' + step;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Apply as Paint Styles ──

async function applyStyles(palette: SerializedPalette) {
  const roles: SerializedRole[] = [palette.primary, palette.secondary, palette.accent, palette.neutral];
  const existingStyles = await figma.getLocalPaintStylesAsync();
  const styleMap = new Map<string, PaintStyle>();
  for (const s of existingStyles) {
    styleMap.set(s.name, s);
  }

  let created = 0;
  let updated = 0;

  for (const role of roles) {
    for (const sc of role.scale) {
      const name = styleName(role.role, sc.step);
      let style = styleMap.get(name);
      if (style) {
        updated++;
      } else {
        style = figma.createPaintStyle();
        style.name = name;
        created++;
      }
      const rgb = hexToFigmaRgb(sc.hex);
      style.paints = [{ type: 'SOLID', color: rgb }];
    }
  }

  figma.notify(`Color styles applied: ${created} created, ${updated} updated.`);
}

// ── Apply as Variables ──

async function applyVariables(palette: SerializedPalette) {
  const roles: SerializedRole[] = [palette.primary, palette.secondary, palette.accent, palette.neutral];

  // Find or create the OKScale collection
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  let collection = collections.find((c) => c.name === 'OKScale');
  if (!collection) {
    collection = figma.variables.createVariableCollection('OKScale');
  }

  const modeId = collection.modes[0].modeId;

  // Index existing variables by name
  const existingVars = new Map<string, Variable>();
  for (const id of collection.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id);
    if (v) existingVars.set(v.name, v);
  }

  let created = 0;
  let updated = 0;

  for (const role of roles) {
    for (const sc of role.scale) {
      const name = variableName(role.role, sc.step);
      let variable = existingVars.get(name);
      if (variable) {
        updated++;
      } else {
        variable = figma.variables.createVariable(name, collection, 'COLOR');
        created++;
      }
      const rgb = hexToFigmaRgb(sc.hex);
      variable.setValueForMode(modeId, { r: rgb.r, g: rgb.g, b: rgb.b, a: 1 });
    }
  }

  figma.notify(`Variables applied: ${created} created, ${updated} updated.`);
}

// ── Export palette to canvas ──

async function exportToCanvas(palette: SerializedPalette) {
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });

  // Layout constants
  const SW = 64;         // swatch width
  const CH = 56;         // color area height
  const LH = 38;         // label area height below the color
  const SH = CH + LH;   // total swatch height
  const GAP = 3;         // gap between swatches
  const OUTER_PAD = 40;  // main frame padding
  const ROLE_GAP = 40;   // vertical gap between role sections
  const LABEL_GAP = 12;  // gap between role header and swatch row

  const roles: SerializedRole[] = [palette.primary, palette.secondary, palette.accent, palette.neutral];

  // ── Main container ──
  const main = figma.createFrame();
  main.name = 'OKScale Color System';
  main.layoutMode = 'VERTICAL';
  main.primaryAxisSizingMode = 'AUTO';
  main.counterAxisSizingMode = 'AUTO';
  main.paddingTop = OUTER_PAD;
  main.paddingBottom = OUTER_PAD;
  main.paddingLeft = OUTER_PAD;
  main.paddingRight = OUTER_PAD;
  main.itemSpacing = ROLE_GAP;
  main.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  main.cornerRadius = 16;

  for (const role of roles) {
    // ── Role section (vertical: label + swatches row) ──
    const section = figma.createFrame();
    section.name = capitalize(role.role);
    section.layoutMode = 'VERTICAL';
    section.primaryAxisSizingMode = 'AUTO';
    section.counterAxisSizingMode = 'AUTO';
    section.itemSpacing = LABEL_GAP;
    section.fills = [];

    // Role label
    const label = figma.createText();
    label.fontName = { family: 'Inter', style: 'Medium' };
    label.fontSize = 13;
    label.characters = capitalize(role.role);
    label.fills = [{ type: 'SOLID', color: hexToFigmaRgb('#181818') }];
    label.textAutoResize = 'WIDTH_AND_HEIGHT';

    // Base hex (inline, muted)
    const baseLabel = figma.createText();
    baseLabel.fontName = { family: 'Inter', style: 'Regular' };
    baseLabel.fontSize = 12;
    baseLabel.characters = role.baseHex;
    baseLabel.fills = [{ type: 'SOLID', color: hexToFigmaRgb('#888888') }];
    baseLabel.textAutoResize = 'WIDTH_AND_HEIGHT';
    baseLabel.x = label.width + 8;

    // Header row (horizontal: role name + base hex)
    const header = figma.createFrame();
    header.name = 'header';
    header.layoutMode = 'HORIZONTAL';
    header.primaryAxisSizingMode = 'AUTO';
    header.counterAxisSizingMode = 'AUTO';
    header.counterAxisAlignItems = 'CENTER';
    header.itemSpacing = 8;
    header.fills = [];
    header.appendChild(label);
    header.appendChild(baseLabel);

    // ── Swatches row ──
    const row = figma.createFrame();
    row.name = 'Scale';
    row.layoutMode = 'HORIZONTAL';
    row.primaryAxisSizingMode = 'AUTO';
    row.counterAxisSizingMode = 'AUTO';
    row.itemSpacing = GAP;
    row.fills = [];

    for (const sc of role.scale) {
      // Each swatch is a fixed-size frame (no auto-layout) with manually placed children
      const swatch = figma.createFrame();
      swatch.name = String(sc.step);
      swatch.resize(SW, SH);
      swatch.cornerRadius = 8;
      swatch.fills = [{ type: 'SOLID', color: { r: 0.97, g: 0.97, b: 0.97 } }];
      swatch.clipsContent = true;

      // Color rectangle (top portion)
      const colorRect = figma.createRectangle();
      colorRect.name = sc.hex;
      colorRect.resize(SW, CH);
      colorRect.x = 0;
      colorRect.y = 0;
      colorRect.fills = [{ type: 'SOLID', color: hexToFigmaRgb(sc.hex) }];

      // Step label
      const stepText = figma.createText();
      stepText.fontName = { family: 'Inter', style: 'Medium' };
      stepText.fontSize = 11;
      stepText.characters = String(sc.step);
      stepText.fills = [{ type: 'SOLID', color: hexToFigmaRgb('#303030') }];
      stepText.textAutoResize = 'WIDTH_AND_HEIGHT';
      stepText.x = 6;
      stepText.y = CH + 7;

      // Hex label
      const hexText = figma.createText();
      hexText.fontName = { family: 'Inter', style: 'Regular' };
      hexText.fontSize = 10;
      hexText.characters = sc.hex;
      hexText.fills = [{ type: 'SOLID', color: hexToFigmaRgb('#888888') }];
      hexText.textAutoResize = 'WIDTH_AND_HEIGHT';
      hexText.x = 6;
      hexText.y = CH + 7 + 14;

      swatch.appendChild(colorRect);
      swatch.appendChild(stepText);
      swatch.appendChild(hexText);

      row.appendChild(swatch);
    }

    section.appendChild(header);
    section.appendChild(row);
    main.appendChild(section);
  }

  // Center on viewport
  const center = figma.viewport.center;
  main.x = Math.round(center.x - main.width / 2);
  main.y = Math.round(center.y - main.height / 2);

  figma.currentPage.selection = [main];
  figma.viewport.scrollAndZoomIntoView([main]);
  figma.notify('Color palette exported to canvas.');
}

// ── Apply fill to selected node ──

function applyFillToSelection(hex: string) {
  const selection = figma.currentPage.selection;
  if (selection.length === 0) return;
  const rgb = hexToFigmaRgb(hex);
  let applied = 0;
  for (const node of selection) {
    if ('fills' in node) {
      (node as GeometryMixin).fills = [{ type: 'SOLID', color: rgb }];
      applied++;
    }
  }
  if (applied > 0) {
    figma.notify(`Fill applied to ${applied} node${applied > 1 ? 's' : ''}.`);
  }
}

// ── Message handler ──

figma.ui.onmessage = async (msg: PluginMessage) => {
  if (msg.type === 'apply-styles') {
    try {
      await applyStyles(msg.palette);
    } catch (err: any) {
      figma.notify('Failed to apply styles: ' + err.message, { error: true });
    }
  } else if (msg.type === 'apply-variables') {
    try {
      await applyVariables(msg.palette);
    } catch (err: any) {
      figma.notify('Failed to apply variables: ' + err.message, { error: true });
    }
  } else if (msg.type === 'apply-fill') {
    try {
      applyFillToSelection(msg.hex);
    } catch (err: any) {
      figma.notify('Failed to apply fill: ' + err.message, { error: true });
    }
  } else if (msg.type === 'export-to-canvas') {
    try {
      await exportToCanvas(msg.palette);
    } catch (err: any) {
      figma.notify('Failed to export to canvas: ' + err.message, { error: true });
    }
  } else if (msg.type === 'notify-user') {
    figma.notify(msg.message, msg.error ? { error: true } : undefined);
  } else if (msg.type === 'resize') {
    figma.ui.resize(msg.width, msg.height);
  }
};
