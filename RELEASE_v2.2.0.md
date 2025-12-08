# ChordGrid for Obsidian - Version 2.2.0

## 🎵 Major Release: Enhanced Tuplet System, Multi-line Volta Brackets & Musical Notation Improvements

This release brings significant improvements to tuplet handling, volta bracket rendering across multiple lines, repeat notation, stem direction control, and overall notation accuracy.

## ✨ New Features

### Multi-line Volta Brackets
- **VoltaManager Architecture**: New dedicated `VoltaManager.ts` class for sophisticated volta rendering
  - Handles volta brackets spanning multiple rendering lines with visual continuity
  - Accumulate-execute architecture for coordinated multi-line rendering
  - Proper integration with PlaceAndSizeManager for metadata persistence
  - 220 lines of volta logic refactored into dedicated manager

### Enhanced Tuplet System
- **Automatic Ratio Calculation**: All tuplets now have proper ratio calculations for accurate duration
- **Smart Display Logic**: 
  - `{888}3` displays as "3" (clean, simple notation for common tuplets)
  - `{888}3:2` displays as "3:2" (explicit ratio when user specifies)
- **Default Ratio Table**: Built-in support for triplets (3:2), quintuplets (5:4), sextuplets (6:4), etc.
- **Beam Continuation Fix**: Critical bug fixed where notes following tuplets weren't properly beamed
  - Example: `{888}3 88` now correctly beams the two eighths after the triplet
  - Accurate quarterStart calculation for proper auto-break behavior

### Empty Measures Support
- **Simple Syntax**: `| |` now renders empty measures without requiring `measures-per-line` directive
- **Visual Rendering**: Empty measures render with appropriate width (50% of base measure width)
- **Full Integration**: Supports voltas on empty measures and consecutive empty measures

### Repeat Notation Enhancements
- **Repeat Count**: `:||x3` syntax to indicate repetition count
  - Count displays as small text to the right of end repeat barline
  - Works with both full rhythm and `show%` display modes
- **Repeat Symbol Display**: Classical measure repeat symbol (%) with `show%` directive
  - Official SVG path-based repeat symbol scaled and centered
  - Chord names positioned at measure start when repeat symbol shown

### Stem Direction Control
- **`stems-up` keyword** (default): Standard treble/solo notation
  - Stems point upward, positioned right of notehead
  - Beams above notes, ties below
- **`stems-down` keyword**: Bass/lower voice notation
  - Stems point downward, positioned left of notehead
  - Beams below notes, ties above
- Follows proper musical notation conventions

### Responsive SVG Rendering
- SVG now renders with `width="100%"` and `height="auto"`
- Dynamic viewBox calculation maintains aspect ratio
- Chord grids scale seamlessly across different screen sizes

## 🐛 Bug Fixes

### Tuplet & Beaming Issues
- Fixed beam breaking at incorrect boundaries when tuplets present
- Corrected duration calculations for notes within tuplets
- Resolved auto-break logic incorrectly separating beamed notes
- Fixed tuplet ratio display showing full ratio for common tuplets

### Barline & Rendering Issues
- **Note overflow with repeat barlines**: Fixed notes clipping with `measures-per-line` and repeat barlines
  - `extraLeftPadding` now properly accounted for in layout calculations
- **Repeat measure barlines**: Final double barline (`||`) now renders correctly on repeat measures with `show%`
- **Volta bracket filtering**: Filter barlines with undefined `measureIndex` before VoltaManager processing
- **Empty measures**: Fixed rendering issues for empty measures with proper width calculation

### Visual Style Improvements
- **Classical repeat barline style**: Thin (1.5px) + thick (3px) lines with proper spacing (6px)
  - Thick line on inside of repeat section (classical convention)
  - Final double barline: thin (1.5px) + thick (5px) for visual ending
- **Stem positioning**: Corrected stem direction rendering logic
- **Beam attachment**: Fixed beam points to use correct stem end
- **Tie positioning**: Ties respect stem direction (below for stems-up, above for stems-down)

## 🔧 Technical Improvements

### Architecture
- **VoltaManager** pattern following TieManager design
- **CollisionManager** integration for all new elements
- Enhanced `ChordGridParser` with stem direction parsing
- Improved `MusicAnalyzer` tuplet duration handling
- Updated `NoteRenderer` for conditional ratio display

### Parser Enhancements
- Parses `stems-up` and `stems-down` keywords
- Enhanced empty measure creation without directives
- Robust tuplet ratio computation with fallback calculations

### Renderer Updates
- SVGRenderer propagates stem direction to sub-renderers
- MeasureRenderer uses stem direction for positioning
- Proper musical notation standards enforcement
- Added `explicitRatio` flag for user-specified ratios

## 📊 Testing

- **334 passing tests** with comprehensive coverage
- New test suites:
  - `test/empty_measures.spec.ts` (4 tests)
  - `test/renderer_stems_direction.spec.ts`
  - `test/renderer_responsive_svg.spec.ts`
  - Tuplet beaming scenarios
  - Auto-break behavior validation
- No regressions detected

## 🎼 Examples

### Tuplet Beaming (Before vs After)
```
Before: {888}3 88  →  Tuplet beamed | [Break] | Two eighths separated ❌
After:  {888}3 88  →  Tuplet beamed | Two eighths beamed together ✅
```

### Empty Measures
```
| C[4 4 4 4] | | D[2 2] |
```

### Repeat Count
```
| C[88 88] | D[2 2] :||x3
```

### Stem Direction
```
stems-down 4/4 | C[8 8 8 8] |
```

## 📝 Breaking Changes

- Tuplet data structure now includes `explicitRatio` boolean field
- All tuplets now have a `ratio` property (previously optional for default tuplets)
- VoltaManager architecture requires barlines with defined `measureIndex`

## 🙏 Acknowledgments

Thanks to the community for reporting issues and providing detailed test cases for tuplet beaming, volta brackets, and notation improvements!

---

**Full Changelog**: https://github.com/MathieuCGit/ChordGrid_for_Obsidian/compare/v2.1.0...v2.2.0
