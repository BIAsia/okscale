import { generatePaletteResponse, MachineInputError } from '../src/core/service';

declare var figma: any;
declare var __html__: string;

type GeneratePayload = {
  colorInput: string;
  shadeMode: 'none' | 'warm' | 'cool' | 'natural';
  harmonyType:
    | 'complementary'
    | 'analogous'
    | 'triadic'
    | 'split-complementary'
    | 'tetradic';
  anchorBehavior: 'preserve-input' | 'auto-gamut';
};

type UiInbound =
  | { type: 'generate'; payload: GeneratePayload }
  | { type: 'apply'; payload: GeneratePayload }
  | { type: 'close' };

var ROLES = ['primary', 'secondary', 'accent', 'neutral'];

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

function applyVariables(payload: ReturnType<typeof generatePaletteResponse>): {
  collectionName: string;
  updatedCount: number;
} {
  var collection = getOrCreateCollection('OKScale');
  var modeId = getDefaultModeId(collection);
  var updatedCount = 0;

  for (var r = 0; r < ROLES.length; r++) {
    var role = ROLES[r] as 'primary' | 'secondary' | 'accent' | 'neutral';
    var roleEntry = payload.palette[role];
    for (var i = 0; i < roleEntry.scale.length; i++) {
      var stepItem = roleEntry.scale[i];
      var variableName = role + '/' + stepItem.step;
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
  hint?: string;
} {
  if (err instanceof MachineInputError) {
    return {
      code: err.code,
      message: err.message,
      hint: err.hint,
    };
  }

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

figma.showUI(__html__, { width: 420, height: 660 });

figma.ui.onmessage = function (msg: UiInbound) {
  if (!msg || !msg.type) return;

  if (msg.type === 'close') {
    figma.closePlugin();
    return;
  }

  try {
    var generated = generatePaletteResponse(msg.payload);

    if (msg.type === 'generate') {
      figma.ui.postMessage({
        type: 'generated',
        payload: generated,
      });
      return;
    }

    if (msg.type === 'apply') {
      var result = applyVariables(generated);
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
