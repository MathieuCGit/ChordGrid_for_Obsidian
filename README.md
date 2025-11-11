# Chord Grid Plugin for Obsidian

[Français](./README.fr.md)

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
- `1` = Whole note (ronde)
- `2` = Half note (blanche)
- `4` = Quarter note (noire)
- `8` = Eighth note (croche)
- `16` = Sixteenth note (double-croche)
- `32` = Thirty-second note (triple-croche)
- `64` = Sixty-fourth note (quadruple-croche)

**Rests (Silences):**
Add a `-` prefix before any note value to create a rest:
- `-1` = Whole rest (pause)
- `-2` = Half rest (demi-pause)
- `-4` = Quarter rest (soupir)
- `-8` = Eighth rest (demi-soupir)
- `-16` = Sixteenth rest (quart de soupir)
- `-32` = Thirty-second rest
- `-64` = Sixty-fourth rest

Example: `C[4 -4 8 8]` = quarter note, quarter rest, two eighth notes

> **Important**: Rests break beam groups. For example, `[88-88]` creates two separate beam groups with a rest in between.

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

**chords with rests**
```chordgrid
4/4 | C[4 -4 4 4] | G[-2 4 4] | Am[88 -8 8 4] | F[4 4 -2] |
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
- ✅ **Inline Debug Logger** (v1.1.0) - collapsible debug panel in notes
- ✅ **Improved beam rendering** for complex rhythmic patterns with dotted notes
- 🚧 **Analyzer-based cross-segment beaming** (v2.0.0 in progress) – beams can now connect notes across chord boundaries when no separating space is present (e.g. `[8]G[8]`)
- 🚧 **Configurable beam overlay** via analyzer feature flag

## Debugging

The plugin includes a built-in debug logger that displays detailed information directly in your notes. Click on "🐛 Debug Logs" above any chord grid to see:

- Parsing steps and results
- Layout calculations
- Beam detection and rendering
- Tie detection and matching
- Note positions and properties

For more information, see [DEBUG_LOGGER.md](DEBUG_LOGGER.md).

## Current Limitations

- Analyzer beam overlay is experimental (enable with feature flag; renderer still contains legacy beaming path)
- No support for dynamics or articulations
- No export to other formats
- Tuplets, grace notes, dynamics, articulations not yet supported (planned)

## Architecture (v2.0 refactor – in progress)

The rendering pipeline is being refactored into three clear stages:

1. Parser – Performs only syntactic parsing of the chord grid into structured measures and segments (tokens, rhythm groups, ties, rests, whitespace awareness).
2. Analyzer – Computes musical semantics, especially beam groups that may span chord segment boundaries. Produces `BeamGroup[]` with `NoteReference` entries pointing back to parsed notes.
3. Renderer – Draws notes/stems/ties and (optionally) overlays analyzer-driven beams instead of legacy per-beat grouping.

### Why the analyzer?
Previously, beams could not cross chord boundaries even when musically continuous (e.g. `[8]G[8]`). The analyzer flattens measure notes, respects rests and whitespace, and builds multi‑level beam groups (8/16/32/64) including correct beamlet direction for dotted values.

### Feature flag
An experimental overlay draws analyzer beams while the legacy beaming remains for fallback.

To enable it, edit `src/renderer/constants.ts`:

```ts
export const USE_ANALYZER_BEAMS = true; // set to true to activate overlay
```

### Cross-segment beaming examples

```chordgrid
4/4 | C[8]G[8] Am[88 4 4] |
```
The two isolated eighths before the space will beam together if there is no space between `]G[`.

```chordgrid
4/4 | C[8] G[8] Am[88 4 4] |
```
Here the space before `G` breaks the beam, producing two separate single stems.

### Planned next steps
* Replace legacy measure beaming with analyzer output (remove duplication)
* Extend analyzer for tuplets & grace notes
* Snapshot tests for SVG beam rendering
* Documentation updates for advanced rhythmic cases

## License

GPL V3