const DECIMAL_UNITS: Record<string, number> = {
  b: 1,
  kb: 1000,
  mb: 1000 ** 2,
  gb: 1000 ** 3,
  tb: 1000 ** 4,
  pb: 1000 ** 5,
};

const BINARY_UNITS: Record<string, number> = {
  b: 1,
  kib: 1024,
  mib: 1024 ** 2,
  gib: 1024 ** 3,
  tib: 1024 ** 4,
  pib: 1024 ** 5,
};

const ALL_UNITS: Record<string, number> = { ...DECIMAL_UNITS, ...BINARY_UNITS };

// "1.5GiB", "2048", "3 MB" -> byte count. Bare numbers are already bytes.
export function parseByteSize(input: string): number {
  const trimmed = input.trim();
  const match = trimmed.match(/^([0-9]*\.?[0-9]+)\s*([a-zA-Z]*)$/);
  if (!match) {
    throw new Error(`not a byte size: "${input}"`);
  }
  const [, numberPart, unitPart] = match;
  const unit = unitPart.toLowerCase() || 'b';
  const multiplier = ALL_UNITS[unit];
  if (multiplier === undefined) {
    throw new Error(`unknown byte unit "${unitPart}" in "${input}"`);
  }
  return Math.round(Number(numberPart) * multiplier);
}

export function formatByteSize(bytes: number, options: { binary?: boolean } = {}): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    throw new Error(`not a valid byte count: ${bytes}`);
  }
  const units = options.binary
    ? ([
        ['PiB', 1024 ** 5],
        ['TiB', 1024 ** 4],
        ['GiB', 1024 ** 3],
        ['MiB', 1024 ** 2],
        ['KiB', 1024],
      ] as const)
    : ([
        ['PB', 1000 ** 5],
        ['TB', 1000 ** 4],
        ['GB', 1000 ** 3],
        ['MB', 1000 ** 2],
        ['KB', 1000],
      ] as const);

  for (const [suffix, size] of units) {
    if (bytes >= size) {
      return `${trimTrailingZeros(bytes / size)}${suffix}`;
    }
  }
  return `${bytes}B`;
}

function trimTrailingZeros(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/, '');
}
