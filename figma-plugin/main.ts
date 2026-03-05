import { emit, on, once, showUI } from '@create-figma-plugin/utilities';
import type { NamingPreset } from '../src/lib/export';
import { generatePluginData, type PluginSettings } from './shared';

interface GenerateHandler {
  name: 'GENERATE';
  handler: (settings: PluginSettings) => void;
}

interface ApplyVariablesHandler {
  name: 'APPLY_VARIABLES';
  handler: (settings: PluginSettings, namingPreset: NamingPreset) => void;
}

interface CloseHandler {
  name: 'CLOSE';
  handler: () => void;
}

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

function getOrCreateCollection(name: string): VariableCollection {
  var collections = figma.variables.getLocalVariableCollections();
  for (var i = 0; i < collections.length; i++) {
    if (collections[i].name === name) return collections[i];
  }
  return figma.variables.createVariableCollection(name);
}

function getDefaultModeId(collection: VariableCollection): string {
  if (collection.modes && collection.modes.length > 0) {
    return collection.modes[0].modeId;
  }
  return collection.defaultModeId;
}

function findOrCreateColorVariable(collection: VariableCollection, variableName: string): Variable {
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

export default function () {
  on<GenerateHandler>('GENERATE', function (settings) {
    try {
      var generated = generatePluginData(settings);
      emit('GENERATED', generated);
    } catch (err) {
      var shape = toMachineError(err);
      emit('ERROR', shape);
    }
  });

  on<ApplyVariablesHandler>('APPLY_VARIABLES', function (settings, namingPreset) {
    try {
      var generated = generatePluginData(settings);
      var result = applyVariables(generated, namingPreset || 'numeric');
      figma.notify('OKScale: ' + result.updatedCount + ' variables updated.');
      emit('APPLIED', result);
    } catch (err) {
      var shape = toMachineError(err);
      emit('ERROR', shape);
    }
  });

  on<CloseHandler>('CLOSE', function () {
    figma.closePlugin();
  });

  once('CLOSE', function () {
    figma.closePlugin();
  });

  showUI({ width: 460, height: 700 });
}
