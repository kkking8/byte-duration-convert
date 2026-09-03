// Seconds per unit. µs and us both parse; output only ever uses us (plain ASCII).
const DURATION_UNIT_SECONDS: Record<string, number> = {
  ns: 1e-9,
  us: 1e-6,
  'µs': 1e-6,
  ms: 1e-3,
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

// "1h30m", "90s", "500ms", "45" (bare seconds) -> total seconds.
// Units must be contiguous, no spaces, matching Go's time.Duration style.
export function parseDuration(input: string): number {
  const trimmed = input.trim();
  if (trimmed === '') {
    throw new Error('empty duration');
  }
  if (/^[0-9]*\.?[0-9]+$/.test(trimmed)) {
    return Number(trimmed);
  }

  const pattern = /([0-9]*\.?[0-9]+)(ns|µs|us|ms|s|m|h|d)/g;
  let total = 0;
  let matchedLength = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(trimmed)) !== null) {
    const [full, numberPart, unit] = match;
    total += Number(numberPart) * DURATION_UNIT_SECONDS[unit];
    matchedLength += full.length;
  }
  if (matchedLength !== trimmed.length) {
    throw new Error(`not a duration: "${input}"`);
  }
  return total;
}

export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    throw new Error(`not a valid duration: ${totalSeconds}`);
  }
  if (totalSeconds === 0) {
    return '0s';
  }
  if (totalSeconds < 1) {
    return formatSubSecond(totalSeconds);
  }

  let remainder = Math.round(totalSeconds);
  const days = Math.floor(remainder / 86400);
  remainder -= days * 86400;
  const hours = Math.floor(remainder / 3600);
  remainder -= hours * 3600;
  const minutes = Math.floor(remainder / 60);
  remainder -= minutes * 60;
  const seconds = remainder;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join('');
}

function formatSubSecond(seconds: number): string {
  const ms = seconds * 1e3;
  if (ms >= 1) {
    return `${trimTrailingZeros(ms)}ms`;
  }
  const us = seconds * 1e6;
  if (us >= 1) {
    return `${trimTrailingZeros(us)}us`;
  }
  return `${trimTrailingZeros(seconds * 1e9)}ns`;
}

function trimTrailingZeros(value: number): string {
  return value.toFixed(3).replace(/\.?0+$/, '');
}
