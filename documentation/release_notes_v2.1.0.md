# v2.1.0 - Tuplets & Collision Management

## 🎉 Major Features

### CollisionManager System
- **Automatic collision detection** between chords, notes, stems, tuplets, rests, and time signatures
- **Smart vertical positioning** to avoid overlaps
- **Priority-based collision resolution** (fixed elements vs. mobile elements)

### Dynamic Time Signature Spacing
- Automatic calculation of time signature width based on content
- Adaptive left padding to prevent overlap with first measure
- Tighter, more elegant spacing (factor 0.53, margin 4px)

### Dotted Note Collision Avoidance
- Tie curves automatically raised to avoid dotted note dots
- Dots remain in standard position (right of note head)
- Collision detection between tie paths and dot bounding boxes

## 🧪 Comprehensive Testing

- **174 automated tests** with 100% pass rate
- **60+ tests** validating beams, ties, and tuplets across 12+ time signatures
- Coverage: 2/4, 3/4, 4/4, 5/4, 7/4, 5/8, 7/8, 6/8, 9/8, 11/8, 12/8, 15/16
- Tests for simple time, compound time, and asymmetric meters
- Edge cases: rests with beams/ties, cross-measure ties, tuplets with ties

## 🎨 Visual Improvements

- Time signature no longer overlaps first measure content
- Tuplet numbers automatically avoid chord symbols
- More compact overall layout without visual conflicts
- Tie curves intelligently avoid dotted notes

## 📐 Technical Details

- New `CollisionManager` class with full API for element registration and conflict resolution
- Extended `ElementType` union to include all renderable elements including `'dot'` for dotted notes
- Collision detection uses axis-aligned bounding boxes (AABB) with configurable margins
- `findFreePosition()` algorithm with spiral search pattern

## 📚 Installation

1. Download the 3 files attached to this release:
   - `main.js`
   - `manifest.json`
   - `styles.css`

2. Copy them to your Obsidian vault's plugin folder:
   ```
   <your-vault>/.obsidian/plugins/chordgrid/
   ```

3. Enable "Chord Grid" in Obsidian Settings → Community Plugins

## 🔗 Links

- [Full Changelog](https://github.com/MathieuCGit/ChordGrid_for_Obsidian/blob/main/CHANGELOG.md)
- [Documentation](https://github.com/MathieuCGit/ChordGrid_for_Obsidian/blob/main/README.md)
- [Architecture Guide](https://github.com/MathieuCGit/ChordGrid_for_Obsidian/blob/main/ARCHITECTURE.md)
