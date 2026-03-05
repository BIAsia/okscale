import type { NamingPreset } from '../src/lib/export';
import { generatePluginData, type PluginSettings } from './shared';

declare var figma: any;
declare var __html__: string;

type UiInbound =
  | { type: 'ui-ready' }
  | { type: 'generate'; payload: PluginSettings }
  | { type: 'apply-variables'; payload: { settings: PluginSettings; namingPreset: NamingPreset } }
  | { type: 'close' };

var ROLES = ['primary', 'secondary', 'accent', 'neutral'];

var SEMANTIC_STEP_NAMES: Record<number, string> = {
  50: 'bg-soft',
  100: 'bg',
  200: 'surface',
  300: 'border-soft',
  400: 'border',
  500: 'base',
  600: 'strong',
  700: 'stronger',
  800: 'text-soft',
  900: 'text',
  950: 'text-strong',
};

function tokenName(step: number, preset: NamingPreset): string {
  if (preset === 'semantic') {
    return SEMANTIC_STEP_NAMES[step] || String(step);
  }
  return String(step);
}

function toFigmaRgb(hex: string): { r: number; g: number; b: number } {
  var clean = hex.replace('#', '');
  var value = parseInt(clean, 16);
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
  };
}

function getOrCreateCollection(name: string): any {
  var collections = figma.variables.getLocalVariableCollections();
  for (var i = 0; i < collections.length; i++) {
    if (collections[i].name === name) return collections[i];
  }
  return figma.variables.createVariableCollection(name);
}

function getDefaultModeId(collection: any): string {
  if (collection.modes && collection.modes.length > 0) {
    return collection.modes[0].modeId;
  }
  return collection.defaultModeId;
}

function findOrCreateColorVariable(collection: any, variableName: string): any {
  var variables = figma.variables.getLocalVariables('COLOR');
  for (var i = 0; i < variables.length; i++) {
    var v = variables[i];
    if (v.variableCollectionId === collection.id && v.name === variableName) {
      return v;
    }
  }
  return figma.variables.createVariable(variableName, collection.id, 'COLOR');
}

function applyVariables(
  generated: ReturnType<typeof generatePluginData>,
  namingPreset: NamingPreset,
): {
  collectionName: string;
  updatedCount: number;
} {
  var collection = getOrCreateCollection('OKScale');
  var modeId = getDefaultModeId(collection);
  var updatedCount = 0;

  for (var r = 0; r < ROLES.length; r++) {
    var role = ROLES[r] as 'primary' | 'secondary' | 'accent' | 'neutral';
    var roleEntry = generated.palette[role];
    for (var i = 0; i < roleEntry.scale.length; i++) {
      var stepItem = roleEntry.scale[i];
      var variableName = role + '/' + tokenName(stepItem.step, namingPreset);
      var variable = findOrCreateColorVariable(collection, variableName);
      variable.setValueForMode(modeId, toFigmaRgb(stepItem.hex));
      updatedCount += 1;
    }
  }

  return {
    collectionName: collection.name,
    updatedCount: updatedCount,
  };
}

function toMachineError(err: unknown): {
  code: string;
  message: string;
} {
  if (err instanceof Error) {
    return {
      code: 'INTERNAL_ERROR',
      message: err.message,
    };
  }

  return {
    code: 'INTERNAL_ERROR',
    message: 'Unknown plugin runtime error.',
  };
}

figma.showUI(__html__, { width: 460, height: 700 });

var bootTimeout = setTimeout(function () {
  figma.notify('OKScale UI failed to boot. Please rebuild plugin and relaunch.');
}, 1500);

figma.ui.onmessage = function (msg: UiInbound) {
  if (!msg || !msg.type) return;

  if (msg.type === 'ui-ready') {
    clearTimeout(bootTimeout);
    return;
  }

  if (msg.type === 'close') {
    clearTimeout(bootTimeout);
    figma.closePlugin();
    return;
  }

  try {
    if (msg.type === 'generate') {
      var generated = generatePluginData(msg.payload);
      figma.ui.postMessage({
        type: 'generated',
        payload: generated,
      });
      return;
    }

    if (msg.type === 'apply-variables') {
      var generatedForApply = generatePluginData(msg.payload.settings);
      var result = applyVariables(generatedForApply, msg.payload.namingPreset || 'numeric');
      figma.notify('OKScale: ' + result.updatedCount + ' variables updated.');
      figma.ui.postMessage({
        type: 'applied',
        payload: result,
      });
      return;
    }
  } catch (err) {
    var shape = toMachineError(err);
    figma.ui.postMessage({
      type: 'error',
      payload: shape,
    });
  }
};
