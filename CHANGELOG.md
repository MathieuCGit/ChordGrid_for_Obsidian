# Changelog

All notable changes to the Chord Grid Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Comprehensive test suite for multiple time signatures** (`test/multiple_time_signatures.spec.ts`)
  - 60 automated tests validating beams, ties, and tuplets across 12+ time signatures
  - Coverage: 2/4, 3/4, 4/4, 5/4, 7/4, 5/8, 7/8, 6/8, 9/8, 11/8, 12/8, 15/16
  - Tests for simple time, compound time, and asymmetric meters
  - Edge cases: rests with beams/ties, cross-measure ties, tuplets with ties
- **Visual test file** (`test/test_multiple_time_signatures.md`)
  - 100+ chord grid examples for manual validation in Obsidian
  - Organized by time signature and feature (beams, ties, tuplets)
  - Ready-to-use demonstration file
  - **Corrected to follow standard notation conventions** (see Fixed section)
- **Notation conventions guide** (`GROUPING_CONVENTIONS.md`)
  - Complete reference for rhythmic grouping in binary vs ternary time
  - Examples for all time signatures
  - Best practices for beam grouping

### Documentation
- **Test analysis documentation** (`test/ANALYSIS_TEST_ERRORS.md`)
  - Detailed analysis of initial test failures
  - Explanations of tuplet duration calculations
  - Guide for understanding time signature validation
- **Test report** (`test/TEST_REPORT_MULTIPLE_TIME_SIGNATURES.md`)
  - Comprehensive report of validation results
  - Coverage metrics and quality analysis
- **Validation summary** (`test/VALIDATION_SUMMARY_v2.1.md`)
  - Executive summary for v2.1.0 release
  - Complete feature validation checklist
- **Notation corrections** (`test/CORRECTIONS_NOTATION.md`)
  - Detailed list of corrections applied to respect standard notation
  - Binary vs ternary grouping conventions explained

### Fixed
- **Notation conventions in test file** (`test/test_multiple_time_signatures.md`)
  - Binary time (2/4, 3/4, 4/4, 5/4, 7/4): eighth notes now grouped by 2 (e.g., `88 88 88`)
  - Compound time (6/8, 9/8, 12/8): eighth notes now grouped by 3 (e.g., `888 888`)
  - Corrected measure durations to match time signatures
  - Fixed cross-measure ties to maintain correct measure lengths
  - Applied standard notation practices throughout all examples

### Validated
- ✅ Beams work correctly in all tested time signatures (12+)
- ✅ Cross-segment beaming validated across all metrics
- ✅ Ties function properly across measure boundaries in all time signatures
- ✅ Tuplets (triplets, quintuplets, duplets) validate correctly with proper ratios
- ✅ Tuplets with ties work in all tested time signatures
- ✅ Rest handling correct in all contexts
- ✅ Dotted notes calculate durations accurately
- ✅ All 136 tests pass (100% success rate)
- ✅ Notation follows standard conventions (binary vs ternary grouping)

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
