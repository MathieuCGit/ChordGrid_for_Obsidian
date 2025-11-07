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
- `||` : Double bar
- `||:` : Start repeat
- `:||` : End repeat

**Chords:** Standard notation (e.g., `Am`, `C`, `Gmaj7`, `Dm`, `F#m`, `Bb7`)

**Rhythm in brackets:**
- `1` = Whole note
- `2` = Half note
- `4` = Quarter note
- `8` = Eighth note
- `16` = Sixteenth note

**Rhythmic grouping:**
- Numbers grouped together represent one beat (e.g., `88` = 2 eighth notes in the same beat, with connected beams)
- Numbers separated by spaces represent different beats

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

## License

GPL V3