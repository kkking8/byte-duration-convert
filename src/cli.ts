#!/usr/bin/env node
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseByteSize, formatByteSize } from './sizes.js';
import { parseDuration, formatDuration } from './durations.js';

type Kind = 'size' | 'duration';
type Direction = 'raw' | 'human';

interface Options {
  kind: Kind;
  to: Direction;
  binary: boolean;
  files: string[];
}

function convertLine(line: string, opts: Options): string {
  const trimmed = line.trim();
  if (trimmed === '' || trimmed.startsWith('#')) {
    return line;
  }
  if (opts.kind === 'size') {
    return opts.to === 'raw'
      ? String(parseByteSize(trimmed))
      : formatByteSize(Number(trimmed), { binary: opts.binary });
  }
  return opts.to === 'raw' ? String(parseDuration(trimmed)) : formatDuration(Number(trimmed));
}

async function processSource(source: NodeJS.ReadableStream, opts: Options): Promise<void> {
  const rl = createInterface({ input: source, crlfDelay: Infinity });
  for await (const line of rl) {
    try {
      console.log(convertLine(line, opts));
    } catch (err) {
      process.exitCode = 1;
      console.error(`unitconv: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

function printHelp(): void {
  console.log(`usage: unitconv --kind=size|duration [--to=raw|human] [--binary] [file...]

Converts byte-size or duration values between human-readable notation and
raw numeric form (bytes for sizes, seconds for durations). Reads from the
given files, or from stdin if no files are given. One value per line;
blank lines and lines starting with # pass through unchanged.

Examples:
  echo "1.5GiB" | unitconv --kind=size
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

  if (!kind) {
    throw new Error('missing required --kind=size|duration');
  }
  return { kind, to, binary, files };
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.files.length === 0) {
    await processSource(process.stdin, opts);
  } else {
    for (const file of opts.files) {
      await processSource(createReadStream(file, 'utf8'), opts);
    }
  }
}

main().catch((err) => {
  console.error(`unitconv: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
