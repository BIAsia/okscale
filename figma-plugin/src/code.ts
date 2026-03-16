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
  return role + '-' + step;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Apply as Paint Styles ──

async function applyStyles(palette: SerializedPalette) {
  const roles: SerializedRole[] = [palette.primary, palette.secondary, palette.accent, palette.neutral];
  const existingStyles = figma.getLocalPaintStyles();
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

  figma.ui.postMessage({
    type: 'notify',
    message: `Color styles applied: ${created} created, ${updated} updated.`,
  });
}

// ── Apply as Variables ──

async function applyVariables(palette: SerializedPalette) {
  const roles: SerializedRole[] = [palette.primary, palette.secondary, palette.accent, palette.neutral];

  // Find or create the OKScale collection
  const collections = figma.variables.getLocalVariableCollections();
  let collection = collections.find((c) => c.name === 'OKScale');
  if (!collection) {
    collection = figma.variables.createVariableCollection('OKScale');
  }

  const modeId = collection.modes[0].modeId;

  // Index existing variables by name
  const existingVars = new Map<string, Variable>();
  for (const id of collection.variableIds) {
    const v = figma.variables.getVariableById(id);
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

  figma.ui.postMessage({
    type: 'notify',
    message: `Variables applied: ${created} created, ${updated} updated.`,
  });
}

// ── Apply fill to selected node ──

function applyFillToSelection(hex: string) {
  const selection = figma.currentPage.selection;
  if (selection.length === 0) {
    figma.ui.postMessage({ type: 'notify', message: 'No node selected. Color copied to clipboard instead.', error: false });
    return;
  }
  const rgb = hexToFigmaRgb(hex);
  let applied = 0;
  for (const node of selection) {
    if ('fills' in node) {
      (node as GeometryMixin).fills = [{ type: 'SOLID', color: rgb }];
      applied++;
    }
  }
  if (applied > 0) {
    figma.ui.postMessage({ type: 'notify', message: `Fill applied to ${applied} node${applied > 1 ? 's' : ''}.` });
  } else {
    figma.ui.postMessage({ type: 'notify', message: 'Selected node does not support fills.', error: true });
  }
}

// ── Message handler ──

figma.ui.onmessage = async (msg: PluginMessage) => {
  if (msg.type === 'apply-styles') {
    try {
      await applyStyles(msg.palette);
    } catch (err: any) {
      figma.ui.postMessage({ type: 'notify', message: 'Failed to apply styles: ' + err.message, error: true });
    }
  } else if (msg.type === 'apply-variables') {
    try {
      await applyVariables(msg.palette);
    } catch (err: any) {
      figma.ui.postMessage({ type: 'notify', message: 'Failed to apply variables: ' + err.message, error: true });
    }
  } else if (msg.type === 'apply-fill') {
    try {
      applyFillToSelection(msg.hex);
    } catch (err: any) {
      figma.ui.postMessage({ type: 'notify', message: 'Failed to apply fill: ' + err.message, error: true });
    }
  } else if (msg.type === 'resize') {
    figma.ui.resize(msg.width, msg.height);
  }
};
