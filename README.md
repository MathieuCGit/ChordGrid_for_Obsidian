# 🎵 Chord Grid for Obsidian

[![Version](https://img.shields.io/badge/version-2.2.0-blue.svg)](https://github.com/MathieuCGit/ChordGrid_for_Obsidian/releases)
[![License](https://img.shields.io/badge/license-GPL--3.0-green.svg)](./LICENSE)
[![Tests](https://img.shields.io/badge/tests-315%20passing-brightgreen.svg)](#)

> **Transform simple text notation into beautiful, professional chord charts with rhythmic notation—right inside your Obsidian notes.**

[🇫🇷 Version française](./README.fr.md) | [📖 Full Documentation](./documentation/) | [🐛 Report Bug](https://github.com/MathieuCGit/ChordGrid_for_Obsidian/issues)

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
- 📚 **Pedagogical tools** - Optional counting numbers for rhythm learning
- 🎸 **Guitar/Bass friendly** - Pick strokes (↓↑) and fingerpicking patterns (p,i,m,a)
- 📐 **Smart layout** - Automatic collision detection and element positioning
- 📱 **Responsive** - Scales beautifully on any screen size

---

## 🚀 Quick Start

### Installation

1. Open **Obsidian → Settings → Community plugins**
2. Disable **Safe Mode**
3. Click **Browse** and search for **"Chord Grid"**
4. Click **Install**, then **Enable**

### Your First Chord Chart

Create a code block with the `chordgrid` language:

````markdown
```chordgrid
4/4 | C[4 4 4 4] | G[4 4 4 4] | Am[4 4 4 4] | F[4 4 4 4] |
```
````

**Result:**
<img width="782" height="115" alt="image" src="https://github.com/user-attachments/assets/6e05c00d-42fa-4fac-9ba0-02aa2fe1ff98" />


That's it! You just created your first chord chart. 🎉

---

## 📖 Basic Syntax

### Chord Notation

| Syntax | Description | Example |
|--------|-------------|---------|
| `C` | Major chord | `C[4444]` |
| `Am` | Minor chord | `Am[4444]` |
| `C7` | Dominant 7th | `C7[4444]` |
| `Cmaj7` | Major 7th | `Cmaj7[4444]` |
| `F#m` | Sharp minor | `F#m[4444]` |
| `Bb` | Flat major | `Bb[4444]` |

### Rhythm Values

| Value | Symbol | Name | Example |
|-------|--------|------|---------|
| 1 | `1` | Whole note | `C[1]` |
| 2 | `2` | Half note | `C[2 2]` |
| 4 | `4` | Quarter note | `C[4 4 4 4]` |
| 8 | `8` | Eighth note | `C[88 88]` |
| 16 | `16` | Sixteenth note | `C[16 16 16 16]` |

**Note:** Notes of value ≥8 are automatically beamed when grouped together.

### Essential Symbols

| Symbol | Description | Example |
|--------|-------------|---------|
| `\|` | Bar line | `C[4 4] \| G[4 4]` |
| `4.` | Dotted note | `C[4. 8]` |
| `-4` | Rest (quarter) | `C[4 -4 4 4]` |
| `_8` | Tied note | `C[8_88]` |
| `\|\|:` | Repeat start | `\|\|: C[4 4 4 4]` |
| `:\|\|` | Repeat end | `G[4 4 4 4] :\|\|` |

### Time Signatures

```chordgrid
4/4 | C[4 4 4 4] |    # Common time (4 quarter notes)
3/4 | C[4 4 4] |      # Waltz time (3 quarter notes)
6/8 | C[888 888] |    # Compound meter (6 eighth notes)
```

---

## 💡 Examples

### Example 1: Simple Pop Progression
````markdown
```chordgrid
4/4 ||: C[4 4 4 4] | G[4 4 4 4] | Am[4 4 4 4] | F[4 4 4 4] :||
```
````
*Perfect for pop, rock, and folk music notation*

### Example 2: Jazz Walking Bass
````markdown
```chordgrid
4/4 | Cmaj7[4 4 4 4] | Dm7[4 4 4 4] | G7[4 4 4 4] | Cmaj7[2 2] |
```
````
*Classic II-V-I progression with whole notes*

### Example 3: Flamenco Rhythm
````markdown
```chordgrid
3/4 | Am[88 88 4] | E7[88 88 4] | Am[88 88 4] | E7[4. 8 4] |
```
````
*Traditional Spanish rhythm pattern with mixed note values*

### Example 4: Fingerstyle Guitar Pattern
````markdown
```chordgrid
finger
4/4 | C[8p 8i 8m 8a 8m 8i 8p 8i] | G[8p 8i 8m 8a 8m 8i 8p 8i] |
```
````
*Fingerpicking pattern with thumb (p), index (i), middle (m), ring (a)*

---

## 🎓 Advanced Features

Need more power? ChordGrid supports advanced notation:

- **🔢 Pedagogical counting** - Add `count` directive for rhythm learning numbers
- **🎯 Pick/Finger patterns** - Detailed stroke notation (`pick`/`finger` directives)
- **🎭 Tuplets** - Triplets `{8 8 8}3:2`, quintuplets `{16 16 16 16 16}5:4`
- **🔄 Volta brackets** - First/second endings `1.|2.`
- **📐 Custom layouts** - Control measures per line with `measures-per-line:N`
- **🎨 Stem direction** - `stems-up` (default) or `stems-down` for bass clef
- **🎼 Complex meters** - Support for 5/8, 7/8, 11/8, and custom time signatures
- **📏 Empty measures** - Repeat symbols `%` for quick notation

👉 **[Full syntax documentation](./documentation/README.md)**

---

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

