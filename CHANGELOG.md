# Changelog

All notable changes to the Chord Grid Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.2.0] - 2025-11-20

### Added
- **Stem direction control** following musical notation standards
  - `stems-up` keyword (default behavior) - stems point upward, positioned right of notehead, beams above, ties below
  - `stems-down` keyword - stems point downward, positioned left of notehead, beams below, ties above
  - Keyword can be placed on separate line before time signature or on same line as time signature
  - Proper musical notation conventions respected for all stem directions
- **Responsive SVG rendering**
  - SVG now renders with `width="100%"` and `height="auto"` for automatic container adaptation
  - Dynamic viewBox calculation maintains proper aspect ratio
  - Chord grids scale seamlessly across different screen sizes and container widths
- **Complete refactoring of stem and beam rendering logic**
  - `MeasureRenderer.drawStemWithDirection()` completely rewritten with correct musical logic
  - Stems-up: start from top of notehead (y - slashLength/2), positioned right (x + slashLength/2)
  - Stems-down: start from bottom of notehead (y + slashLength/2), positioned left (x - slashLength/2)
  - Returns accurate `stemTopY` and `stemBottomY` for precise beam placement
- **Updated tie positioning system**
  - Ties positioned below notes when stems point up (standard treble/solo notation)
  - Ties positioned above notes when stems point down (standard bass/lower voice notation)
  - `TieManager.drawCurve()` updated to respect stem direction
- **Comprehensive test suite for new features**
  - `test/renderer_stems_direction.spec.ts` - validates stem direction rendering and positioning
  - `test/renderer_responsive_svg.spec.ts` - validates responsive SVG attributes
  - All 178 existing tests continue to pass (full backward compatibility)

### Changed
- **Parser enhancement** (`ChordGridParser.ts`)
  - Now parses `stems-up` and `stems-down` keywords from first line(s)
  - Returns `stemsDirection` in `ParseResult` interface
  - Handles both single-line (`stems-down 4/4`) and multi-line (`stems-down\n4/4`) formats
- **Renderer architecture updated**
  - `main.ts` now passes `result.stemsDirection` to `renderer.render()`
  - `SVGRenderer` propagates stem direction to all sub-renderers
  - `MeasureRenderer` uses stem direction for correct stem, beam, and note positioning
  - `AnalyzerBeamOverlay` uses `stemTopY` for stems-up or `stemBottomY` for stems-down
- **Musical notation standards enforcement**
  - All rendering components now follow proper musical notation conventions
  - Stem position, beam position, and tie position all depend on stem direction
  - Default behavior matches standard treble clef/solo notation (stems up)

### Fixed
- Corrected stem positioning logic that was causing stems to render in wrong direction
- Fixed beam attachment points to use correct end of stem based on direction
- Fixed tie curve positioning to respect stem direction

## [2.1.0] - 2025-11-17

### Added
- **CollisionManager system** for intelligent element placement
  - Automatic collision detection between chords, notes, stems, tuplets, rests, time signatures
  - Smart vertical positioning to avoid overlaps
  - Priority-based collision resolution (fixed elements vs. mobile elements)
- **Dynamic time signature spacing**
  - Automatic calculation of time signature width based on content
  - Adaptive left padding to prevent overlap with first measure
  - Tighter, more elegant spacing (factor 0.53, margin 4px)
- **Dotted note collision avoidance**
  - Tie curves automatically raised to avoid dotted note dots
  - Dots remain in standard position (right of note head)
  - Collision detection between tie paths and dot bounding boxes
- **Comprehensive test suite for multiple time signatures** (`test/multiple_time_signatures.spec.ts`)
  - 60 automated tests validating beams, ties, and tuplets across 12+ time signatures
  - Coverage: 2/4, 3/4, 4/4, 5/4, 7/4, 5/8, 7/8, 6/8, 9/8, 11/8, 12/8, 15/16
  - Tests for simple time, compound time, and asymmetric meters
  - Edge cases: rests with beams/ties, cross-measure ties, tuplets with ties
- **Collision management tests** (`test/collision_manager.spec.ts`, `test/tie_dot_collision.spec.ts`)
  - Unit tests for collision detection and resolution algorithms
  - Validation of tie curve adjustment logic
- **Visual test file** (`test/test_multiple_time_signatures.md`)
  - 100+ chord grid examples for manual validation in Obsidian
  - Organized by time signature and feature (beams, ties, tuplets)
  - Corrected to follow standard notation conventions
- **Notation conventions guide** (`GROUPING_CONVENTIONS.md`)
  - Complete reference for rhythmic grouping in binary vs ternary time
  - Examples for all time signatures
  - Best practices for beam grouping

### Changed
- **Renderer architecture enhanced with collision management**
  - `SVGRenderer` instantiates and passes `CollisionManager` to all sub-renderers
  - `MeasureRenderer` registers all visual elements (chords, notes, stems, tuplets)
  - `RestRenderer` integrated with collision system
  - Tie rendering now collision-aware
- **Improved spacing and layout**
  - Time signature no longer overlaps first measure content
  - Tuplet numbers automatically avoid chord symbols
  - More compact overall layout without visual conflicts

### Fixed
- **Time signature collision** with first measure elements
- **Tuplet number overlap** with chord symbols (automatic vertical adjustment)
- **Tie curves touching dotted note dots** (curves now raised automatically)
- **Notation conventions in test file** (`test/test_multiple_time_signatures.md`)
  - Binary time (2/4, 3/4, 4/4, 5/4, 7/4): eighth notes now grouped by 2 (e.g., `88 88 88`)
  - Compound time (6/8, 9/8, 12/8): eighth notes now grouped by 3 (e.g., `888 888`)
  - Corrected measure durations to match time signatures
  - Fixed cross-measure ties to maintain correct measure lengths

### Documentation
- **Architecture documentation** updated with collision management system
- **Test analysis documentation** (`test/ANALYSIS_TEST_ERRORS.md`)
- **Test report** (`test/TEST_REPORT_MULTIPLE_TIME_SIGNATURES.md`)
- **Validation summary** (`test/VALIDATION_SUMMARY_v2.1.md`)
- **Notation corrections** (`test/CORRECTIONS_NOTATION.md`)

### Technical
- New `CollisionManager` class in `src/renderer/` with full API for element registration and conflict resolution
- Extended `ElementType` union to include all renderable elements including `'dot'` for dotted notes
- Collision detection uses axis-aligned bounding boxes (AABB) with configurable margins
- `findFreePosition()` algorithm with spiral search pattern
- All 174 tests passing (100% success rate)

## [2.0.0] - 2025-11-14

### 🎉 Architecture Refactoring - **BREAKING CHANGES**
**Major Update**: Complete migration to clean Parser → Analyzer → Renderer architecture.

#### Added
- **MusicAnalyzer** class for computing beam groups independently of parsing
- Cross-segment beaming: notes beam across chord boundaries when no space is present (e.g., `[8]G[8]`)
- Multi-level beam support (8th, 16th, 32nd, 64th) with proper beamlet direction for dotted notes
- Analyzer-based beam rendering fully integrated and active
- `AnalyzerBeamOverlay.ts` for drawing analyzer beams with proper multi-level support
- Comprehensive analyzer unit tests (cross-segment, rests, dotted notes, beam levels)
- Integration tests validating parser→analyzer pipeline
- French README (`README.fr.md`) linked from main README

#### Changed
- **Breaking**: Architecture split into Parser (syntax), Analyzer (musical semantics), Renderer (visual)
- Parser focuses purely on syntax; musical rules moved to analyzer
- Fixed `leadingSpace` detection using captured whitespace per segment
- MeasureRenderer simplified to use only analyzer-based beam rendering
- Beam rendering now uses analyzer output exclusively (legacy path removed)

#### Fixed
- Beams no longer incorrectly broken at chord segment boundaries when musically continuous
- Beamlet direction rules correctly handle dotted notes (follow/precede logic)
- Rest notes properly break beam groups in analyzer path
- Isolated notes at higher levels (16th, 32nd) correctly display flags instead of incorrect beamlets

#### Removed
- **Legacy beaming system**: `BeamAndTieAnalyzer.ts` from renderer (note: the analyzer in ChordGridParser remains for tie parsing)
- `USE_ANALYZER_BEAMS` feature flag (analyzer is now always active)
- `drawNoteGroup()` and associated legacy beam rendering methods
- All legacy beam calculation code from MeasureRenderer

#### Technical
- Added `analyzer-types.ts` with BeamGroup, NoteReference, AnalyzedMeasure types
- Extended `NotePosition` interface with `segmentNoteIndex` field for analyzer mapping
- Made DebugLogger safe in Node test environment (optional parameter)
- Simplified `constants.ts` by removing feature flag

#### Documentation
- Updated README with architecture section and cross-segment examples
- Documented new analyzer-based system (feature flag instructions removed)
- Updated ARCHITECTURE.md to reflect completed migration
- This CHANGELOG updated to mark v2.0.0 as completed

---

## [1.1.0] - 2025-11-11 (Previous Stable)
- Updated README with architecture section and cross-segment examples
- Documented feature flag usage and overlay activation

#### Known Issues
- Analyzer overlay is experimental; legacy beaming still present for fallback during transition
- Type alignment between old/new structures ongoing

---

## [1.1.0] - 2025-11-11 (Current Stable)

### Added
- **Debug Logger System** (`src/utils/DebugLogger.ts`)
  - Inline debug panel visible directly in Obsidian notes
  - Collapsible "🐛 Debug Logs" section above each chord grid
  - Timestamps and structured logging for all parsing and rendering steps
  - No need to open DevTools for debugging
  - Automatic scroll to latest log entry
  - Maximum 50 logs per block to prevent overflow

- **Debug Documentation**
  - `DEBUG_LOGGER.md`: Complete usage guide for the debug system
  - `DEBUG_IMPLEMENTATION.md`: Implementation notes and technical details
  - `test/test_debug_logger.md`: Test file with examples

- **CSS Styling** (`styles.css`)
  - Theme-adaptive styling for debug panel
  - Improved error message presentation
  - Monospace font for better log readability

### Fixed
- **Critical Beam Rendering Bug**
  - Fixed beamlets (partial beams) not rendering for isolated notes at higher subdivision levels
  - Example: In `16-8-16` pattern, the 16th notes now correctly display their secondary beamlets
  - Implemented proper beamlet direction logic based on musical notation rules

- **Beamlet Direction Rules**
  - Notes after dotted notes: beamlet points LEFT (completes the rhythmic group)
  - Notes before dotted notes: beamlet points RIGHT (starts the rhythmic group)
  - Default behavior: beamlets point toward the center of the beam group
  - Example: `16.32` now correctly shows the 32nd note's beamlet pointing left

### Technical Changes
- Enhanced `MeasureRenderer.ts` with detailed logging for beam detection and rendering
- Enhanced `SVGRenderer.ts` with layout calculation logs
- Enhanced `TieManager.ts` with pending tie tracking logs
- Improved beam segment detection algorithm to handle all notes in a group
- Added musical notation rules for beamlet orientation

### Known Issues
- ⚠️ **Beams not connected across chord segments without spacing** (e.g., `[8]G[8]`)
  - Root cause: Beam analysis happens per-segment instead of per-measure
  - Will be fixed in v2.0.0 architecture refactoring
  - Workaround: Use explicit ties `[8_]G[_8]` or add space `[8] G[8]`

### Notes
This version works reliably for most use cases. A major architecture refactoring is planned for v2.0.0 to:
- Properly support cross-segment beams
- Enable future UI customization features
- Improve code maintainability and extensibility

## [1.0.0] - 2025-11-08

### Added
- Initial release
- Basic chord grid parsing and rendering
- Support for time signatures (4/4, 3/4, 6/8, etc.)
- Rhythmic notation with various note values (whole, half, quarter, eighth, sixteenth, etc.)
- Dotted notes support
- Ties between notes (using `_` character)
- Automatic beam grouping for eighth notes and smaller
- Repeat bars and bar line types
- Multi-line chord grids (4 measures per line)
- Rest notation with `-` prefix

### Features
- SVG-based rendering for crisp display at any zoom level
- Slash notation for note heads
- Automatic rhythm validation against time signature
- Support for multiple chords per measure
- Line breaks with `<br>` or automatic after 4 measures

---

## Version Numbering

- **Major version** (X.0.0): Breaking changes, major feature additions
- **Minor version** (1.X.0): New features, significant improvements, backward compatible
- **Patch version** (1.1.X): Bug fixes, minor improvements
