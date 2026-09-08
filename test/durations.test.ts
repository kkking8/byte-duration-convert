import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDuration, formatDuration } from '../src/durations.js';

test('parseDuration: bare numbers are already seconds', () => {
  assert.equal(parseDuration('45'), 45);
  assert.equal(parseDuration('0'), 0);
  assert.equal(parseDuration('1.5'), 1.5);
});

test('parseDuration: single units', () => {
  assert.equal(parseDuration('90s'), 90);
  assert.equal(parseDuration('500ms'), 0.5);
  assert.equal(parseDuration('2h'), 7200);
  assert.equal(parseDuration('1d'), 86400);
});

test('parseDuration: compound expressions', () => {
  assert.equal(parseDuration('1h30m'), 5400);
  assert.equal(parseDuration('1h30m15s'), 5415);
});

test('parseDuration: microsecond spellings', () => {
  assert.equal(parseDuration('10us'), 10e-6);
  assert.equal(parseDuration('10µs'), 10e-6);
});

test('parseDuration: rejects malformed input', () => {
  assert.throws(() => parseDuration(''), /empty duration/);
  assert.throws(() => parseDuration('1h 30m'), /not a duration/);
  assert.throws(() => parseDuration('1x'), /not a duration/);
});

test('formatDuration: zero and sub-second values', () => {
  assert.equal(formatDuration(0), '0s');
  assert.equal(formatDuration(0.5), '500ms');
  assert.equal(formatDuration(10e-6), '10us');
  assert.equal(formatDuration(10e-9), '10ns');
});

test('formatDuration: whole units and compound values', () => {
  assert.equal(formatDuration(30), '30s');
  assert.equal(formatDuration(5400), '1h30m');
  assert.equal(formatDuration(90000), '1d1h');
});

test('formatDuration: rejects negative or non-finite input', () => {
  assert.throws(() => formatDuration(-1), /not a valid duration/);
  assert.throws(() => formatDuration(NaN), /not a valid duration/);
  assert.throws(() => formatDuration(Infinity), /not a valid duration/);
});

test('round trip: human notation survives parse -> format', () => {
  for (const value of ['30s', '1h30m', '1d1h', '500ms', '10us']) {
    assert.equal(formatDuration(parseDuration(value)), value);
  }
});

test('round trip: whole-second raw values survive format -> parse', () => {
  for (const seconds of [0, 30, 5400, 90000]) {
    assert.equal(parseDuration(String(seconds)), seconds);
  }
});
