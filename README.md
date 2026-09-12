# byte-duration-convert

Log files, config files, and APIs disagree about how to write byte sizes
and durations. Some want `1.5GiB`, some want `1610612736`. Some want
`1h30m`, some want `5400`. This is a small command-line tool for going
back and forth between the human-readable form and the raw numeric form,
one value per line.

It reads from files given on the command line, or from stdin if none are
given, so it drops into a pipeline the same way `sort` or `tr` does.

## Usage

```
unitconv [--kind=size|duration] [--to=raw|human] [--binary] [file...]
```

- `--kind` tells it whether each line is a byte size or a duration. It's
  optional when converting human notation to raw numbers: size units
  (`b`, `kb`, `mib`, ...) and duration units (`ns`, `s`, `h`, ...) never
  overlap, so each line can be classified on its own. A bare number with
  no unit is ambiguous and needs an explicit `--kind`, and so does
  `--to=human`, since a raw byte count and a raw second count look the
  same on the page.
- `--to` picks the output form. Default is `raw`.
- `--binary` uses KiB/MiB/GiB instead of KB/MB/GB when formatting sizes
  as human-readable (`--to=human`).
- Blank lines and lines starting with `#` pass through unchanged, so you
  can convert an annotated config file in place.
- Bad input on one line doesn't stop the rest: the error goes to stderr
  tagged with the source and line number (`stdin:3: ...` or
  `retries.txt:3: ...`), the exit code is set to 1, and processing
  continues with the next line.

### Examples

Convert human-readable sizes to bytes (no `--kind` needed, the `GiB`
suffix is unambiguous):

```
$ echo "1.5GiB" | unitconv
1610612736
```

Convert bytes back to human-readable, decimal units:

```
$ echo "1610612736" | unitconv --kind=size --to=human
1.61GB
```

Convert a duration string to seconds:

```
$ echo "1h30m15s" | unitconv
5415
```

Convert a file of raw second counts to human-readable durations:

```
$ cat retries.txt
30
5400
90000
$ unitconv --kind=duration --to=human retries.txt
30s
1h30m
1d1h
```

## Format notes

Sizes accept a bare number (bytes), or a number followed by a decimal
unit (`B`, `KB`, `MB`, `GB`, `TB`, `PB`, base 1000) or a binary unit
(`KiB`, `MiB`, `GiB`, `TiB`, `PiB`, base 1024). Units are case
insensitive.

Durations accept a bare number (seconds), or a compound expression like
`1h30m` made of `ns`, `us`, `ms`, `s`, `m`, `h`, `d` chunks written
next to each other with no spaces, the same style as Go's
`time.Duration` string.

## Building

No third-party dependencies at runtime; TypeScript itself is the only
devDependency, used to compile `src/` to `dist/`.

```
npm run build
node dist/cli.js --kind=size < sizes.txt
```

Tests use the built-in `node:test` runner, compiled separately from the
`dist/` build so test code never ships in the published package:

```
npm test
```

## Roadmap

See open items in the repository for what's planned next.
