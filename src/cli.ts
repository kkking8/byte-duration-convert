#!/usr/bin/env node
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseByteSize, formatByteSize } from './sizes.js';
import { parseDuration, formatDuration } from './durations.js';

type Kind = 'size' | 'duration';
type Direction = 'raw' | 'human';

interface Options {
  kind?: Kind;
  to: Direction;
  binary: boolean;
  files: string[];
}

// Size and duration unit suffixes never overlap (b/kb/mb/... vs ns/us/ms/s/m/h/d),
// so a value with a unit can only parse as one of the two. A bare number has no
// unit to go on, so it stays ambiguous and needs an explicit --kind.
function detectKind(value: string): Kind {
  if (/^[0-9]*\.?[0-9]+$/.test(value)) {
    throw new Error(`cannot tell if "${value}" is a size or a duration without a unit; use --kind to specify`);
  }
  try {
    parseByteSize(value);
    return 'size';
  } catch {
    // not a recognized byte size; fall through to try duration
  }
  try {
    parseDuration(value);
    return 'duration';
  } catch {
    // fall through to the generic error below
  }
  throw new Error(`cannot tell if "${value}" is a size or a duration; use --kind to specify`);
}

function convertLine(line: string, opts: Options): string {
  const trimmed = line.trim();
  if (trimmed === '' || trimmed.startsWith('#')) {
    return line;
  }
  const kind = opts.kind ?? detectKind(trimmed);
  if (kind === 'size') {
    return opts.to === 'raw'
      ? String(parseByteSize(trimmed))
      : formatByteSize(Number(trimmed), { binary: opts.binary });
  }
  return opts.to === 'raw' ? String(parseDuration(trimmed)) : formatDuration(Number(trimmed));
}

async function processSource(source: NodeJS.ReadableStream, label: string, opts: Options): Promise<void> {
  const rl = createInterface({ input: source, crlfDelay: Infinity });
  let lineNumber = 0;
  for await (const line of rl) {
    lineNumber += 1;
    try {
      console.log(convertLine(line, opts));
    } catch (err) {
      process.exitCode = 1;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`unitconv: ${label}:${lineNumber}: ${message}`);
    }
  }
}

function printHelp(): void {
  console.log(`usage: unitconv [--kind=size|duration] [--to=raw|human] [--binary] [file...]

Converts byte-size or duration values between human-readable notation and
raw numeric form (bytes for sizes, seconds for durations). Reads from the
given files, or from stdin if no files are given. One value per line;
blank lines and lines starting with # pass through unchanged.

--kind is optional when converting human notation to raw numbers: each
line is inspected for a size or duration unit and classified on its own.
It's required for --to=human, since a raw number alone doesn't say
whether it's a byte count or a second count.

Examples:
  echo "1.5GiB" | unitconv
  echo "1h30m" | unitconv
  unitconv --kind=duration --to=human durations.txt
  unitconv --kind=size --to=human --binary < sizes.txt`);
}

function parseArgs(argv: string[]): Options {
  let kind: Kind | undefined;
  let to: Direction = 'raw';
  let binary = false;
  const files: string[] = [];

  for (const arg of argv) {
    if (arg === '-h' || arg === '--help') {
      printHelp();
      process.exit(0);
    } else if (arg === '--binary') {
      binary = true;
    } else if (arg.startsWith('--kind=')) {
      const value = arg.slice('--kind='.length);
      if (value !== 'size' && value !== 'duration') {
        throw new Error(`invalid --kind value "${value}", expected size or duration`);
      }
      kind = value;
    } else if (arg.startsWith('--to=')) {
      const value = arg.slice('--to='.length);
      if (value !== 'raw' && value !== 'human') {
        throw new Error(`invalid --to value "${value}", expected raw or human`);
      }
      to = value;
    } else if (arg.startsWith('--')) {
      throw new Error(`unknown flag "${arg}"`);
    } else {
      files.push(arg);
    }
  }

  return { kind, to, binary, files };
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.files.length === 0) {
    await processSource(process.stdin, 'stdin', opts);
  } else {
    for (const file of opts.files) {
      await processSource(createReadStream(file, 'utf8'), file, opts);
    }
  }
}

main().catch((err) => {
  console.error(`unitconv: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
