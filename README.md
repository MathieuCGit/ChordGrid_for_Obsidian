# 🎵 Chord Grid for Obsidian

[![Version](https://img.shields.io/badge/version-2.2.0-blue.svg)](https://github.com/MathieuCGit/ChordGrid_for_Obsidian/releases)
[![License](https://img.shields.io/badge/license-GPL--3.0-green.svg)](./LICENSE)
[![Tests](https://img.shields.io/badge/tests-315%20passing-brightgreen.svg)](#)

> **Transform simple text notation into beautiful, professional chord charts with rhythmic notation—right inside your Obsidian notes.**

[🇫🇷 Version française](./README.fr.md) | [📖 Full Documentation](./documentation/) | [🐛 Report Bug](https://github.com/MathieuCGit/ChordGrid_for_Obsidian/issues)

**For this entry**
````markdown
```chordgrid
show% measure-num count pick
4/4 
| Em[4 88 4 88] | D[%] | % | Em[%] 
| Em[4 88] G[4 88] | C[4 88] G[4 88] | G[4 88 4 88] | C[4 88] G[4 88]
|2/4 G[4 -4] | 4/4 C[4 88 4 88] | % | G[%] 
| G[4 88] Em[4 88] | 2/4 G[4 88] | 4/4 D[4 88 88 88] | Em[%]
```
````
**Get this result**

<img width="778" height="462" alt="image" src="https://github.com/user-attachments/assets/f1af29a3-db21-4969-a855-e4a22e892394" />

---

## What is Chord Grid?

**The problem:** Musicians need to share chord charts with precise rhythm information, but traditional notation software is heavy, rigid, and doesn't integrate with note-taking workflows.

**The solution:** Chord Grid lets you write chord progressions in a simple, intuitive text format and instantly renders them as clean, scalable SVG diagrams. Perfect for composers, teachers, students, and anyone documenting music in Obsidian.

**Built for musicians** who want the precision of musical notation with the simplicity of plain text.

---

## ✨ Key Features

- 🎼 **Professional notation** - Automatic beaming, ties, tuplets, and dotted notes
- ⚡ **Lightning fast** - Write chords as text, see results instantly
- 🎯 **Precise rhythm** - Support for complex time signatures (4/4, 6/8, 5/8, 7/8, 12/8...)
- 🔄 **Repeat notation** - Repeat signs, volta brackets, measure symbols (%)
- ✨ **Transposition tool** - Quickly transpose chord grid by using transpose:+/-
- 📚 **Pedagogical tools** - Optional counting numbers for rhythm learning
- 🎸 **Guitar/Bass friendly** - Pick strokes (↓↑) and finger strum patterns (Thumb, Hand)
- 📐 **Smart layout** - Automatic collision detection and element positioning
- 📱 **Responsive** - Scales beautifully on any screen size

---

## 🚀 Quick Start

### Installation

1. Open **Obsidian → Settings → Community plugins**
2. Disable **Safe Mode**
3. Click **Browse** and search for **"Chord Grid"**
4. Click **Install**, then **Enable**

### Your First Chord Chart Without Rhythm

Create a code block with the `chordgrid` language:

````markdown
```chordgrid
4/4 | C | G | Am | F / G |
```
````
<img width="781" height="110" alt="image" src="https://github.com/user-attachments/assets/b7185c58-4b49-43ab-a70f-63e9ae53caa3" />

That's it! You just created your first chord chart.

---
Want to add a repeat bar? No worries!
````markdown
```chordgrid
4/4 ||: C | G | Am | F / G :||
```
````
<img width="780" height="112" alt="image" src="https://github.com/user-attachments/assets/ef3c8586-329e-45e1-b3c0-be580f7a88c3" />

---

Now let's say we need to change the last measure to a different chord while keeping the previous ones:

````markdown
```chordgrid
4/4 ||: C | G | Am |.1-3 F / G :||.4 Bb |
```
````

<img width="772" height="108" alt="image" src="https://github.com/user-attachments/assets/d3ac34af-edbd-48a5-a92b-827eb2e1d9ee" />

---

Now let's add this awesome rhythm strum pattern so we don't forget it!
````markdown
```chordgrid
4/4 ||: C[8.16 88 4 168.] | G | Am |.1-3 F / G :||.4 Bb |
```
````
<img width="781" height="216" alt="image" src="https://github.com/user-attachments/assets/84d62d3e-92e3-48d3-92c0-198f7efccfda" />

---

OK, not bad, but I'd really like to fit all the chords on the same line! You can use `measures-per-line:` to specify the number of measures per line
````markdown
```chordgrid
measures-per-line:5
4/4 ||: C[8.16 88 4 168.] | G | Am |.1-3 F / G :||.4 Bb |
```
````
<img width="779" height="125" alt="image" src="https://github.com/user-attachments/assets/e43e80a0-70fd-4695-a274-a898f4d08564" />

---

Ah yes! That's better, but as a guitarist, I'd like to see the pick strokes. Can I? **Sure!** Just use the `pick` keyword
````markdown
```chordgrid
measures-per-line:5 pick
4/4 ||: C[8.16 88 4 168.] | G | Am |.1-3 F / G :||.4 Bb |
```
````
<img width="774" height="131" alt="image" src="https://github.com/user-attachments/assets/2fbb51b9-00e0-4912-ba97-66c9e8511902" />

---

Nice! Now I'd like to apply this rhythm pattern to the following measures. I could copy/paste the rhythm pattern... or?

````markdown
```chordgrid
measures-per-line:5 pick
4/4 ||: C[8.16 88 4 168.] | G[%] | Am[%] |.1-3 F / G :||.4 Bb[8.16 88 4 168.] |
```
````
<img width="774" height="131" alt="image" src="https://github.com/user-attachments/assets/7e251cda-acf8-4c39-8833-dee4d0a26df3" />

---

Wow! Amazing! But now there's too much information in each measure. Can I make this cleaner? Yes, use `show%`

````markdown
```chordgrid
measures-per-line:5 pick show%
4/4 ||: C[8.16 88 4 168.] | G[%] | Am[%] |.1-3 F / G :||.4 Bb[8.16 88 4 168.] |
```
````
<img width="780" height="133" alt="image" src="https://github.com/user-attachments/assets/fcf26a64-60c9-4860-832a-cac612802d91" />

---

Finally, I think I'll play this rhythm with fingers instead of a pick. Can I? **Sure!** Use `finger` instead of `pick`
````markdown
```chordgrid
measures-per-line:5 finger show%
4/4 ||: C[8.16 88 4 168.] | G[%] | Am[%] |.1-3 F / G :||.4 Bb[8.16 88 4 168.] |
```
````
<img width="782" height="134" alt="image" src="https://github.com/user-attachments/assets/48ab7d5e-b37c-4d88-b684-801b3f0e77e7" />

## 🎓 Advanced Features

Need more power? ChordGrid supports advanced notation:

- **🔢 Pedagogical counting** - Add `count` directive for rhythm learning numbers
- **🎯 Pick/Finger patterns** - Detailed stroke notation (`pick`/`finger` directives)
- **🎭 Tuplets** - Triplets `{8 8 8}3:2`, quintuplets `{16 16 16 16 16}5:4`
- **🔄 Volta brackets** - First/second endings `1.|2.`
- **📐 Custom layouts** - Control measures per line with `measures-per-line:N`
- **🎨 Stem direction** - `stems-up` (default) or `stems-down`
- **🎼 Complex meters** - Support for 5/8, 7/8, 11/8, and custom time signatures
- **📏 Empty measures** - Repeat symbols `%` for quick notation

---

## 📖 Full Syntax

### Time Signature

`4/4`, `3/4`, `6/8`, `12/8`, etc.

### Chords
Standard notation (e.g., `Am`, `C`, `Gmaj7`, `Dm`, `F#m`, `Bb7`, `C/E`).

### Rhythm in brackets (note values)
- `1` = Whole note (ronde)
- `2` = Half note (blanche)
- `4` = Quarter note (noire)
- `8` = Eighth note (croche)
- `16` = Sixteenth note (double-croche)
- `32` = Thirty-second note (triple-croche)
- `64` = Sixty-fourth note (quadruple-croche)

### Rests (Silences)
Add a `-` prefix before any note value to create a rest:
- `-1` = Whole rest (pause)
- `-2` = Half rest (demi-pause)
- `-4` = Quarter rest (soupir)
- `-8` = Eighth rest (demi-soupir)
- `-16` = Sixteenth rest (quart de soupir)
- `-32` = Thirty-second rest
- `-64` = Sixty-fourth rest

````markdown
  ````chordgrid
  C[4 -4 88_16-161616]
  ```
````
<img width="328" height="96" alt="image" src="https://github.com/user-attachments/assets/98ce95eb-97ed-47bd-9086-e5b1f063adc8" />

#### BE CAREFUL
:warning: **If you want to keep beams grouped by beat, <ins>pay attention to space placement</ins>. For example:**:warning:
````markdown
  ```chordgrid
  C[4 88_] G[_88 4]
  ```
````
<img width="420" height="139" alt="image" src="https://github.com/user-attachments/assets/41c47045-f34d-488c-a217-01f60b0e96bc" />

is different from
````markdown
  ```chordgrid
  C[4 88_]G[_88 4]
  ```
````
<img width="422" height="146" alt="image" src="https://github.com/user-attachments/assets/73bf71b5-7b61-4233-b2b1-a474f49fab1c" />


### Ties (Liaisons)
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


### Stem Direction
Control the direction of note stems following musical notation standards
- `stems-up` or `stem-up` (default) - You'll probably never need to use this.
- `stems-down` or `stem-down` - Stems point downward

- Example:
````markdown
  ```chordgrid
  stems-down
  4/4 | C[88 4 4 4] | G[4 4 2] |
  ```
````
<img width="780" height="148" alt="image" src="https://github.com/user-attachments/assets/2c6a243d-efc2-499c-bdbf-f04a0289b550" />

### Pick Stroke Markers
Display alternating down/up pick strokes above or below notes for rhythmic subdivision practice.
You can use either `pick`, `picks`, or `picks-auto`
````markdown
  ```chordgrid
  pick
  4/4 | C[88 4 4 4] | G[4 4 2] |
  ```
````
<img width="772" height="156" alt="image" src="https://github.com/user-attachments/assets/ddf57484-584e-46a9-ade1-201d0179e65a" />

### Repeat measures content
Display repeated measures content using notation shortcuts
- `%` - Shorthand to repeat the previous measure's rhythm with the same chords
- `Chord[%]` - Repeat previous rhythm with a new chord

````markdown
  ```chordgrid
  4/4 | Am[88 4 88 4] | % | Dm[%] | G[%]
  ```
````
  <img width="776" height="112" alt="image" src="https://github.com/user-attachments/assets/2b6bf698-c524-4dc8-977e-a8173e6fa3d1" />

You can shorten the repeated content even more by using the `show%` directive. It displays a visual repeat symbol (%) instead of rendering the full rhythm

````markdown
  ```chordgrid
  show%
  4/4 | Am[88 4 88 4] | % | Dm[%] | G[%]
  ```
````
<img width="781" height="114" alt="image" src="https://github.com/user-attachments/assets/95a7cd8a-896f-44aa-8709-4b018561d617" />

### Volta brackets
Create first/second endings for repeated sections
- `|.1-3` : Start volta bracket for repetitions 1, 2, and 3
- `|.4` : Start volta bracket for repetition 4 (or any single number)
- `|.1,2,3` : Alternative syntax using commas
- `|.` : Explicitly mark the end of a volta bracket (optional)
- Volta brackets automatically span until:
  - The next volta starts (e.g., `|.1-3 ... :||.4`)
  - A repeat start marker `||:` is encountered
  - An explicit end marker `|.` is placed
- Visual appearance:
  - Closed brackets (before `:||`): bracket with hooks on both ends
  - Open brackets (after `:||`): bracket with hook on left only (ending/coda)

First example: volta 1-3 covers one measure, volta 4 covers one measure
  ````markdown
  ```chordgrid
  4/4 ||: C[4 4 4 4] |.1-3 G[4 4 4 4] :||.4 Am[4 4 4 4] ||
  ```
  ````
  <img width="785" height="118" alt="image" src="https://github.com/user-attachments/assets/0be7d119-4a4d-43f8-a2b3-de3a5ef58310" />

Second example: volta 1-3 covers two measures before `:||`, volta 4 extends to Am using `|.` marker
  ````markdown
  ```chordgrid
  4/4 ||: C[4 88_4 4] | % |.1-3 G[%] | % :||.4 G[4 4 4 4] |. Am[16168 81616 4 88] ||
  ```
  ````
  <img width="773" height="211" alt="image" src="https://github.com/user-attachments/assets/51136327-2286-4381-84e4-08bb64d40e10" />

#### Advanced Syntax Examples
| Pattern | Effect |
|---------|-------|
| `88` | Two beamed eighths (same beat) |
| `8 8` | Two separate eighths (space splits beams) |
| `4.` | Dotted quarter ( = quarter + eighth ) |
| `16.32` | Beamlet direction adapts (analyzer path) |
| `4_88_ \| [_8]` | Tie across measure boundary |
| `C[8]G[8]` | Cross‑segment beaming if no space (analyzer) |
| `C[8] G[8]` | Space blocks beam |
| `%` | Repeat previous measure's rhythm |
| `Chord[%]` | Repeat rhythm with new chord |
| `show%` | Display visual repeat symbol instead of full rhythm |
| `picks` | Enable pick stroke rendering with automatic or forced subdivision |
| `{888}3` | Eighth note triplet (fully beamed) |
| `{8 8 8}3` | Eighth note triplet (separate flags) |
| `{161616 161616}6` | Sextuplet with multi-level beaming (2×3) |
| `{8_8_8}3` | Triplet with all notes tied together |
| `4_{8 8 8}3` | Quarter note tied to first note of triplet |
| `{8 8 8_}3 4` | Last note of triplet tied to quarter |
| `\| 4_ \| {_8 8 8}3 \|` | Cross-measure tie into tuplet |
| `\|.1-3` | Start volta bracket for endings 1, 2, 3 |
| `\|.` | Explicitly mark end of volta bracket |
| `\|.1,2,3` | Alternative comma syntax for volta |

## 🛠️ Development

### Building from Source

```bash
# Clone repository
git clone https://github.com/MathieuCGit/ChordGrid_for_Obsidian.git
cd ChordGrid_for_Obsidian

# Install dependencies
npm install

# Build plugin
npm run build

# Run tests
npm test
```

### Project Structure

```
ChordGrid_for_Obsidian/
├── src/
│   ├── parser/          # Syntax parsing
│   ├── analyzer/        # Musical analysis (beams, counting)
│   ├── renderer/        # SVG rendering
│   └── models/          # Data structures
├── test/                # 46 test suites (315 tests)
├── documentation/       # Technical docs
└── README.md           # You are here!
```

---

## 🤝 Contributing

Contributions are welcome! Whether you're fixing bugs, adding features, or improving documentation:

1. 📖 Read the [Contributing Guide](./documentation/CONTRIBUTING.md)
2. 🏗️ Check the [Architecture Documentation](./documentation/ARCHITECTURE.md)
3. 🐛 Browse [existing issues](https://github.com/MathieuCGit/ChordGrid_for_Obsidian/issues)
4. 💬 Start a [discussion](https://github.com/MathieuCGit/ChordGrid_for_Obsidian/discussions)

---

## 📝 License

This plugin is released under the **GPL-3.0 License**. See [LICENSE](./LICENSE) for details.

---

## 🙏 Acknowledgments

Built with passion for the music and Obsidian communities.

**Author:** [Mathieu CONAN](https://github.com/MathieuCGit)

---

**Enjoying Chord Grid?** ⭐ Star the repository to show your support!

