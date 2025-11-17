# Chord Grid Plugin for Obsidian

[Français](./README.fr.md)

> Display clean chord grids with precise rhythmic notation rendered as crisp, scalable SVG inside your Obsidian notes.

<!-- Badges (manual style to avoid external services) -->
**Version:** 2.0.1 · **License:** GPL-3.0 · **Status:** Stable

**Development Branch:** [`dev/v2.1`](https://github.com/MathieuCGit/chord-grid/tree/dev/v2.1) - Active development for v2.1.0

This plugin parses a lightweight text syntax and turns it into structured musical measures (chords, rhythm groups, ties, rests), then renders them with automatic beaming logic. A refactor toward a 3‑stage pipeline (Parser → Analyzer → Renderer) is underway.

## Installation

### Quick (Recommended via Community Plugins)
1. Open Obsidian → Settings → Community plugins → Browse
2. Search for "Chord Grid" (once published) and install
3. Enable the plugin

### Manual (Developer / Local Build)
1. Create a `chord-grid` folder under `.obsidian/plugins/`
2. Copy / clone repository contents into that folder
3. Install dependencies & build (see Development)
4. Enable in Obsidian: Settings → Community plugins

### Update / Upgrade
Re-run `npm run build` after pulling new changes. If you encounter rendering issues after updating, disable & re-enable the plugin to refresh cached code.

## Usage

In your Obsidian notes, create a fenced code block with the `chordgrid` language:

````markdown
```chordgrid
4/4 ||: Am[88 4 4 88] | C[88 4 4 88] :||
```
````
<img width="592" height="173" alt="image" src="https://github.com/user-attachments/assets/c876d0c9-e121-44d9-92e0-6baddd0433c5" />

### Syntax

**Time signature:** `4/4`, `3/4`, `6/8`, `12/8`, etc.

**Grouping modes (v2.1+):** Control automatic beam grouping behavior
- `4/4 binary` - Force grouping by 2 eighth notes (every 1.0 quarter note)
- `6/8 ternary` - Force grouping by 3 eighth notes (every 1.5 quarter notes)
- `4/4 noauto` - Disable auto-grouping entirely; user controls via spaces
- Default (no keyword) - Auto-detection based on time signature:
  - Binary: denominators ≤ 4 (2/4, 3/4, 4/4, 5/4, etc.)
  - Ternary: denominators ≥ 8 with numerators 3, 6, 9, or 12 (6/8, 9/8, 12/8)
  - Irregular: other meters (5/8, 7/8, 11/8) - no auto-grouping, space-controlled

**Bar lines:**
- `|` : Single bar
- `||` : Double bar end of grid
- `||:` : Start repeat
- `:||` : End repeat

**Chords:** Standard notation (e.g., `Am`, `C`, `Gmaj7`, `Dm`, `F#m`, `Bb7`, `C/E`).

**Rhythm in brackets (note values):**
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

Example: `C[4 -4 88_4]` = quarter note, quarter rest, two eighth notes with the last eight note tied to the last quarter note.

<img width="283" height="153" alt="image" src="https://github.com/user-attachments/assets/37859674-5513-4d12-a3de-e601843c7a22" />


> **Important**: Rests break beam groups. For example, `[88-88]` creates two separate beam groups with a rest in between.

**Rhythmic grouping:**
- Numbers grouped together represent one beat (e.g., `88` = 2 eighth notes in the same beat, with connected beams)
- Numbers separated by spaces represent different beaming groups
- Use a simple dot to create dotted notes. For example 4. is a quarter note dotted, 8. is a eight note dotted.

**Ties (Liaisons):**
- Use underscore `_` to create ties between notes
- `_` **after** a note = note starts a tie (sends/emits)
- `_` **before** a note = note receives a tie (receives/ends)
- Examples:
  - `[88_4]` = tie between last eighth note and quarter note
  - `[2 4_88_]` = tie from quarter to two eighths
  - `C[2 4_88_] | [_8]` = tie across measure boundary (last eighth of measure 1 tied to first eighth of measure 2)
  - `{8_8_8}3` = all three notes of triplet tied together
  - `4_{8 8 8}3` = quarter note tied to first note of triplet
  - `{8 8 8_}3 4` = last note of triplet tied to following quarter
  - `| 4_ | {_8 8 8}3 |` = cross-measure tie into tuplet

**Tuplets (v2.1+):**
Tuplets allow grouping notes to play N notes in the time normally occupied by a different number. Syntax: `{notes}N` where N is the tuplet number.

- **Compact notation** (notes together): `{888}3` = triplet with all notes beamed together
- **Spaced notation** (notes separated): `{8 8 8}3` = triplet with independent flags
- **Multi-level beaming**: `{161616 161616}6` = 6 sixteenth notes grouped as 2×3, with level-1 beam connecting all 6, and level-2 beams in two segments
- **Ties within tuplets**: `{8_8_8}3` = triplet with all notes tied
- **Ties crossing tuplet boundaries**: 
  - `4_{8 8 8}3` = quarter tied into tuplet
  - `{8 8 8_}3 4` = tuplet tied to following note
  - `| 4_ | {_8 8 8}3 |` = cross-measure tie into tuplet
- **Complex tie patterns**: `4_{8_8_8}3_4` = continuous tie through entire tuplet

Examples:
- `{888}3` = eighth note triplet (fully beamed)
- `{8 8 8}3` = eighth note triplet (separate flags)
- `{444}3` = quarter note triplet
- `{8 -8 8}3` = triplet with rest in the middle
- `{161616}3` = sixteenth note triplet
- `{161616 161616}6` = sextuplet with advanced multi-level beaming
- `{8_8_8}3` = triplet with all notes tied (legato)
- `{8_8 8}3` = triplet with first two notes tied
- Full measure in 4/4: `| [{888}3 {888}3 {888}3 {888}3] |`

Notes on syntax:
- Use `_` to indicate a tie. Underscores may appear at the end or start of a rhythm group to tie across measures/lines (e.g. `C[2 4_88_] | [_8]`).
- Rests: prefix a value with `-` (e.g. `-4` for a quarter rest). Rests break beam groups.
- Dotted notes use `.` immediately after the number (e.g. `4.`).
- Whitespace influences beaming: placing a space between numbers separates beam groups; a space before a chord token may break a beam group across the chord.

#### Glossary (Quick Reference)
| Term | Meaning |
|------|---------|
| Beat | Logical pulse grouping inside a measure |
| Beam | Horizontal bar connecting stems of short notes (8th or smaller) |
| Beamlet | Partial beam/stub for isolated short notes inside complex groups |
| Tie | Curved line extending a note’s duration into the next note (same pitch implied) |
| Rest | Silence occupying rhythmic duration |
| Segment | Portion of measure tied to one chord symbol |
| Dotted note | Note with trailing `.` increasing duration by 50% |

#### Advanced Syntax Highlights
| Pattern | Effect |
|---------|-------|
| `88` | Two beamed eighths (same beat) |
| `8 8` | Two separate eighths (space splits beams) |
| `4.` | Dotted quarter ( = quarter + eighth ) |
| `16.32` | Beamlet direction adapts (analyzer path) |
| `4_88_ | [_8]` | Tie across measure boundary |
| `C[8]G[8]` | Cross‑segment beaming if no space (analyzer) |
| `C[8] G[8]` | Space blocks beam |
| `{888}3` | Eighth note triplet (fully beamed) |
| `{8 8 8}3` | Eighth note triplet (separate flags) |
| `{161616 161616}6` | Sextuplet with multi-level beaming (2×3) |
| `{8_8_8}3` | Triplet with all notes tied together |
| `4_{8 8 8}3` | Quarter note tied to first note of triplet |
| `{8 8 8_}3 4` | Last note of triplet tied to quarter |
| `| 4_ | {_8 8 8}3 |` | Cross-measure tie into tuplet |

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

**Chords with dotted notes**
```chordgrid
4/4 | C[4. 8 4 4] | D[8.16 88 4. 8] | Em[168. 4 4 88] | C[16816 4 16168 81616]  |
```

**Chords with rests**
```chordgrid
4/4 | C[4 -4 4 4] | G[-2 4 4] | Am[88 -8 8 4] | F[4 4 -2] |
```

**Tied chords**
```chordgrid
4/4 | C[2 4_88_] | [_8] G[8 4 4 4] | Am[88_4 4 88_] | [_4] Dm[2.] | C[4 4 4_88_] | [_88 4] D[4 4] |
```

**Tuplets (v2.1+)**
```chordgrid
4/4 | C[{888}3 4] | G[{161616}3 {161616}3] | Am[{444}3] | F[{888}3 {888}3 {888}3] |
```

**Tuplets with ties (v2.1+)**
```chordgrid
4/4 | C[{8_8_8}3 4] | G[4_{8 8 8}3] | Am[{8 8 8_}3 4] | F[4_{8_8_8}3_4] |
```

**Cross-measure ties with tuplets (v2.1+)**
```chordgrid
4/4 | C[4 4 4 4_] | D[{_8 8 8}3 4 4 4] | G[4 4 4 4_] | Am[{_8 8 8_}3 _4 4 4] |
```

NOTE: If you want to keep beam grouped by beat take care of space placement. For example
```chordgrid
[_8] G[8 4 4 4]
```
is different from
```chordgrid
[_8]G[8 4 4 4]
```
The space just before the G breaks the beam.

### Troubleshooting
| Symptom | Possible Cause | Fix |
|---------|----------------|-----|
| Measure flagged invalid | Total durations ≠ time signature | Recount values; dotted adds 50% |
| Beam unexpectedly broken | Space or rest present | Remove space / ensure no `-` rest |
| Tie not drawn across line | Analyzer/TieManager pending resolution | Ensure `_` at end & start groups |
| Debug panel absent | Plugin disabled or logger suppressed | Re-enable plugin; check settings |

## Development

### Prerequisites
- Node.js (LTS recommended)
- npm

### Setup
```bash
npm install
npm run dev   # Watch build (esbuild)
npm run build # Production build (type-check + bundle)
```

### Testing
Core parser tests:
```bash
npm test
```
Additional analyzer / integration scripts (run manually):
```bash
ts-node ./test/run_analyzer_tests.ts
ts-node ./test/run_integration_analyzer.ts
```

### Contributing (Summary)
Please see `CONTRIBUTING.md` for full guidelines (style, branching, adding features, test requirements).

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
- ✅ Automatic eighth note beaming by beat (legacy path)
- ✅ Repeat bars & barline types
- ✅ Time signature support (simple + compound)
- ✅ 4 measures per line (automatic)
- ✅ Dynamic measure width
- ✅ Dotted notes, ties, rests
- ✅ **Inline Debug Logger** (v1.1.0) – collapsible debug panel
- ✅ **Improved beam rendering** for complex rhythmic patterns
- ✅ **Analyzer-based cross-segment beaming** (v2.0.0) – continuous beams without spaces
- 🚧 **Tuplets & complex time signatures** (v2.1.0) – customizable ratios, complex metrics
- 🚧 Planned: grace notes, articulations, dynamics, export formats

## Debugging

The plugin includes a built-in debug logger that displays detailed information directly in your notes. Click on "🐛 Debug Logs" above any chord grid to see:

- Parsing steps and results
- Layout calculations
- Beam detection and rendering
- Tie detection and matching
- Note positions and properties

For more information, see [DEBUG_LOGGER.md](DEBUG_LOGGER.md).

## Current Limitations

- No dynamics, articulations, grace notes yet
- No export to PDF/PNG/MIDI yet
- Complex time signatures under implementation

### Roadmap (High Level)
| Milestone | Highlights |
|-----------|-----------|
| v1.x Maintenance | Stability, bug fixes, doc polish |
| v2.0 Analyzer Core | ✅ Full Parser → Analyzer → Renderer separation, unified beaming |
| v2.1 Tuplets & Complex Metrics | 🚧 Complete tuplet implementation (customizable ratios), complex time signature support |
| v2.2 Grace Notes & Ornaments | Extend duration model for grace notes and musical ornaments |
| v2.3 Dynamics & Articulation | Symbol layer, extensible rendering decorators |
| v2.4 Export Layer | PNG / SVG clean export + optional MIDI proof-of-concept |
| v3.0 Interactive Editing | In-note editing handles, real-time validation |

## Architecture (v2.0 refactor – ✅ Complete)

The rendering pipeline has been fully refactored into three clear stages:

1. **Parser** – Performs syntactic parsing of the chord grid into structured measures and segments (tokens, rhythm groups, ties, rests, whitespace awareness).
2. **Analyzer** – Computes musical semantics, especially beam groups that may span chord segment boundaries. Produces `BeamGroup[]` with `NoteReference` entries pointing back to parsed notes.
3. **Renderer** – Draws notes/stems/ties and uses analyzer-driven beams for proper cross-segment beaming.

#### Mermaid diagram

```mermaid
flowchart TD
    A[Chordgrid notation] --> B[Parser\nChordGridParser]
    B --> C[Analyzer\nMusicAnalyzer]
    C --> D[AnalyzerBeamOverlay]
    D --> E[Renderer\nSVGRenderer + Measure/Note/Rest]
    E --> F[SVG output]
```

### Why the analyzer?
Previously, beams could not cross chord boundaries even when musically continuous (e.g. `[8]G[8]`). The analyzer flattens measure notes, respects rests and whitespace, and builds multi‑level beam groups (8/16/32/64) including correct beamlet direction for dotted values.

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
* Introduce export hooks

## License

Licensed under **GNU GPL-3.0**. See `LICENSE` for full text. (The `package.json` has been aligned to GPL-3.0.)
