# Chord Grid Plugin for Obsidian

A plugin that displays chord charts with rhythmic notation using vector graphics (SVG).

## Installation

1. Create a `chord-grid` folder in `.obsidian/plugins/`
2. Copy the following files into this folder:
   - `main.ts` (plugin code)
   - `manifest.json`
3. Compile TypeScript: `npm run build` (see Development section)
4. Enable the plugin in Obsidian: Settings → Community plugins

## Usage

In your Obsidian notes, create a code block with the `chordgrid` language:

````markdown
```chordgrid
4/4 ||: Am[88 4 4 88] | C[88 4 4 88] :||
```
````

### Syntax

**Time signature:** `4/4`, `3/4`, `6/8`, etc.

**Bar lines:**
- `|` : Single bar
- `||` : Double bar end of grid
- `||:` : Start repeat
- `:||` : End repeat

**Chords:** Standard notation (e.g., `Am`, `C`, `Gmaj7`, `Dm`, `F#m`, `Bb7`)

**Rhythm in brackets:**
- `1` = Whole note
- `2` = Half note
- `4` = Quarter note
- `8` = Eighth note
- `16` = Sixteenth note
- `32` = Thirty tow note
- `64` = sixty four note

> Note: Rests are supported using `-` before a value (for example `-8` for an eighth-note rest).

**Rhythmic grouping:**
- Numbers grouped together represent one beat (e.g., `88` = 2 eighth notes in the same beat, with connected beams)
- Numbers separated by spaces represent different beaming groups
- Use a simple dot to create dotted notes. For example 4. is a quarter note dotted, 8. is a eight note dotted.
- Use underscore `_` result in adding tie for example [88_4] will add a tie between the last eight note of the first beat ant the quarter note on the second beat
- Create a link through measure lines will be written like C[2 4_88_] | [_8] which will link the last eight note of the first measure with the first eight note of the next measure.

Notes on syntax:
- Use `_` to indicate a tie. Underscores may appear at the end or start of a rhythm group to tie across measures/lines (e.g. `C[2 4_88_] | [_8]`).
- Rests: prefix a value with `-` (e.g. `-4` for a quarter rest). Rests break beam groups.
- Dotted notes use `.` immediately after the number (e.g. `4.`).
- Whitespace influences beaming: placing a space between numbers separates beam groups; a space before a chord token may break a beam group across the chord.

### Examples

**Simple 4/4 measure:**
```chordgrid
4/4 | G[4 4 4 4] |
```

**Chart with repeats:**
```chordgrid
4/4 ||: Am[88 4 4 88] | Dm[2 4 4] | G[4 4 2] | C[1] :||
```

**Mixed rhythms:**
```chordgrid
4/4 | C[8888 4 4] | G[4 88 4 8] |
```

**Multiple lines:**
```chordgrid
4/4 ||: C[4 4 4 4] | F[4 4 4 4] | G[4 4 4 4] | C[2 2] |
    Am[88 88 4 4] | Dm[4 4 2] | G7[16161616 4 4] | C[1] :||
```

**chords with dotted notes**
```chordgrid
4/4 | C[4. 8 4 4] | D[8.16 88 4. 8] | Em[168. 4 4 88] | C[16816 4 16168 81616]  |
```

**tied chords**
```chordgrid
4/4 | C[2 4_88_] | [_8] G[8 4 4 4] | Am[88_4 4 88_] | [_4] Dm[2.] | C[4 4 4_88_] | [_88 4] D[4 4] |
```

NOTE: If you want to keep beam grouped by beat take care of space places. For example
```chordgrid
[_8] G[8 4 4 4]
```
is different from
```chordgrid
[_8]G[8 4 4 4]
```
The space just before the G break the beam.

## Development

### Prerequisites
- Node.js
- npm

### Setup
```bash
npm install
npm run dev  # Development mode with watch
npm run build  # Production build
```

### Structure
```
chord-grid/
├── main.ts          # Main plugin code
├── manifest.json    # Plugin metadata
├── package.json     # npm dependencies
└── tsconfig.json    # TypeScript configuration
```

## Features

- ✅ Vector SVG rendering
- ✅ Chord charts with rhythmic notation
- ✅ Automatic eighth note beaming by beat
- ✅ Repeat bars
- ✅ Time signature support
- ✅ 4 measures per line (automatic)
- ✅ Dynamic measure width

## Current Limitations

- No support for rests
- No support for dynamics or articulations
- No export to other formats
 - Dynamics, articulations, tuplets and grace notes are not yet supported (planned)
 - Export to other formats is not implemented

## License

GPL V3