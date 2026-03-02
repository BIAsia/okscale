import test from 'node:test';
import assert from 'node:assert/strict';
import { runDecodeShareUrl, runExportTokens, runGeneratePalette, runValidateColor } from './tools';

test('runValidateColor normalizes valid color input', function () {
  var result = runValidateColor('rgb(59,130,246)');

  assert.equal(result.valid, true);
  assert.equal(result.normalizedHex, '#3b82f6');
  assert.ok(typeof result.anchorStep === 'number');
});

test('runValidateColor returns invalid result for unknown format', function () {
  var result = runValidateColor('not-a-color');

  assert.equal(result.valid, false);
  assert.ok(result.reason && result.reason.length > 0);
});

test('runDecodeShareUrl decodes workspace query state', function () {
  var result = runDecodeShareUrl(
    '/app?color=%233b82f6&shade=natural&harmony=complementary&anchor=preserve-input'
  );

  assert.equal(result.valid, true);
  assert.equal(result.state?.colorInput, '#3b82f6');
  assert.equal(result.state?.shadeMode, 'natural');
  assert.equal(result.state?.harmonyType, 'complementary');
});

test('runGeneratePalette returns machine response shape', function () {
  var result = runGeneratePalette({
    colorInput: '#3b82f6',
    shadeMode: 'natural',
    harmonyType: 'complementary'
  });

  assert.equal(result.schemaVersion, '1.0');
  assert.equal(result.palette.primary.scale.length, 11);
});

test('runExportTokens always exports tokens format', function () {
  var result = runExportTokens({
    colorInput: '#3b82f6',
    shadeMode: 'natural',
    harmonyType: 'complementary'
  });

  assert.equal(result.format, 'tokens');
  assert.ok(result.content.indexOf('$schema') >= 0);
});
