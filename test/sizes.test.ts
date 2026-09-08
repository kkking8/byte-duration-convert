import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseByteSize, formatByteSize } from '../src/sizes.js';

test('parseByteSize: bare numbers are already bytes', () => {
  assert.equal(parseByteSize('2048'), 2048);
  assert.equal(parseByteSize('0'), 0);
  assert.equal(parseByteSize('1.5'), 2); // rounds
});

test('parseByteSize: decimal units', () => {
  assert.equal(parseByteSize('1KB'), 1000);
  assert.equal(parseByteSize('2.5MB'), 2_500_000);
  assert.equal(parseByteSize('1GB'), 1_000_000_000);
});

test('parseByteSize: binary units', () => {
  assert.equal(parseByteSize('1KiB'), 1024);
  assert.equal(parseByteSize('1.5GiB'), Math.round(1.5 * 1024 ** 3));
});

test('parseByteSize: case insensitive and tolerates internal whitespace', () => {
  assert.equal(parseByteSize('1kib'), 1024);
  assert.equal(parseByteSize('3 MB'), 3_000_000);
  assert.equal(parseByteSize('  4GB  '), 4_000_000_000);
});

test('parseByteSize: rejects unknown units and malformed input', () => {
  assert.throws(() => parseByteSize('5XB'), /unknown byte unit/);
  assert.throws(() => parseByteSize('abc'), /not a byte size/);
  assert.throws(() => parseByteSize(''), /not a byte size/);
});

test('formatByteSize: decimal notation picks the largest unit that fits', () => {
  assert.equal(formatByteSize(500), '500B');
  assert.equal(formatByteSize(1_610_000_000), '1.61GB');
  assert.equal(formatByteSize(1_000_000_000_000), '1TB');
});

test('formatByteSize: binary notation', () => {
  assert.equal(formatByteSize(1024, { binary: true }), '1KiB');
  assert.equal(formatByteSize(1024 ** 3 * 1.5, { binary: true }), '1.5GiB');
});

test('formatByteSize: rejects negative or non-finite input', () => {
  assert.throws(() => formatByteSize(-1), /not a valid byte count/);
  assert.throws(() => formatByteSize(NaN), /not a valid byte count/);
  assert.throws(() => formatByteSize(Infinity), /not a valid byte count/);
});

test('round trip: decimal human notation survives parse -> format', () => {
  for (const value of ['1KB', '2.5MB', '1GB', '3TB']) {
    const bytes = parseByteSize(value);
    assert.equal(formatByteSize(bytes), value);
  }
});

test('round trip: binary human notation survives parse -> format', () => {
  for (const value of ['1KiB', '1.5GiB', '2TiB']) {
    const bytes = parseByteSize(value);
    assert.equal(formatByteSize(bytes, { binary: true }), value);
  }
});

test('round trip: raw byte counts survive format -> parse for exact unit boundaries', () => {
  for (const bytes of [0, 500, 1024, 1_000_000, 1024 ** 3]) {
    assert.equal(parseByteSize(String(bytes)), bytes);
  }
});
