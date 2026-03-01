import test from 'node:test';
import assert from 'node:assert/strict';
import { exportPaletteResponse, generatePaletteResponse, MachineInputError } from './service';

test('generatePaletteResponse returns four roles with 11-step scales', function () {
  var result = generatePaletteResponse({
    colorInput: '#3b82f6',
    shadeMode: 'natural',
    harmonyType: 'complementary',
    anchorBehavior: 'preserve-input'
  });

  assert.equal(result.schemaVersion, '1.0');
  assert.equal(result.palette.primary.scale.length, 11);
  assert.equal(result.palette.secondary.scale.length, 11);
  assert.equal(result.palette.accent.scale.length, 11);
  assert.equal(result.palette.neutral.scale.length, 11);
});

test('preserve-input anchors exact normalized color at computed anchor step', function () {
  var result = generatePaletteResponse({
    colorInput: 'rgb(59,130,246)',
    shadeMode: 'natural',
    harmonyType: 'complementary',
    anchorBehavior: 'preserve-input'
  });

  var anchorHex = '';
  for (var i = 0; i < result.palette.primary.scale.length; i++) {
    var item = result.palette.primary.scale[i];
    if (item.step === result.request.anchorStep) {
      anchorHex = item.hex;
      break;
    }
  }

  assert.equal(anchorHex.toLowerCase(), result.request.normalizedHex.toLowerCase());
  assert.ok(result.warnings.length >= 1);
});

test('exportPaletteResponse returns content and metadata for tokens format', function () {
  var result = exportPaletteResponse({
    colorInput: '#3b82f6',
    shadeMode: 'natural',
    harmonyType: 'complementary',
    format: 'tokens',
    namingPreset: 'numeric'
  });

  assert.equal(result.format, 'tokens');
  assert.equal(result.filename, 'okscale-tokens-numeric.json');
  assert.equal(result.mediaType, 'application/json; charset=utf-8');
  assert.ok(result.content.indexOf('$schema') >= 0);
});

test('invalid color input throws machine error with stable code', function () {
  assert.throws(
    function () {
      generatePaletteResponse({
        colorInput: 'not-a-color',
        shadeMode: 'natural',
        harmonyType: 'complementary'
      });
    },
    function (err: unknown) {
      if (!(err instanceof MachineInputError)) return false;
      return err.code === 'INVALID_COLOR_INPUT';
    }
  );
});
