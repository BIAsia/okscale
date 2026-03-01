import test from 'node:test';
import assert from 'node:assert/strict';
import { MachineInputError } from '../core/service';
import { getQueryParam, statusForError } from './http';

test('statusForError maps machine input validation to 422', function () {
  var err = new MachineInputError('INVALID_COLOR_INPUT', 'bad color');
  assert.equal(statusForError(err), 422);
});

test('statusForError maps method errors to 405', function () {
  var err = new MachineInputError('METHOD_NOT_ALLOWED', 'wrong method');
  assert.equal(statusForError(err), 405);
});

test('statusForError maps unknown errors to 500', function () {
  assert.equal(statusForError(new Error('boom')), 500);
});

test('getQueryParam reads from req.query first', function () {
  var value = getQueryParam({ query: { name: 'generate-request' } }, 'name');
  assert.equal(value, 'generate-request');
});

test('getQueryParam falls back to URL search parsing', function () {
  var value = getQueryParam({ url: '/api/schema?name=export-request' }, 'name');
  assert.equal(value, 'export-request');
});
