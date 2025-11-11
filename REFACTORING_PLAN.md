# Architecture Refactoring Plan - v2.0.0

**Status**: 🚧 In Progress  
**Start Date**: November 11, 2025  
**Target Version**: 2.0.0  
**Current Version**: 1.1.0 (stable)

## Executive Summary

This document outlines the complete architecture refactoring to address fundamental design issues and enable future extensibility (UI customization, advanced features).

## Why Refactor?

### Current Problems

1. **Mixed Responsibilities**: `BeamAndTieAnalyzer` mixes syntactic parsing with musical analysis
2. **Segment-local Analysis**: Beams analyzed per-segment, preventing cross-segment beam connections
3. **Coupled Rendering**: Beam drawing happens during note positioning, not as separate pass
4. **Hard to Extend**: Adding features like custom styling requires changes across multiple layers

### Example of Current Issue

```chordgrid
4/4 | Am[8]G[8] |
```

**Expected**: Two eighth notes connected by a single beam  
**Actual**: Two separate notes with individual flags  
**Root Cause**: Each segment's notes analyzed independently

## New Architecture

### Three-Layer Separation

```
┌─────────────────────────────────────────────────────┐
│ Layer 1: SYNTACTIC PARSING                          │
│ ChordGridParser                                      │
│ - Parse text notation → data structures             │
│ - No musical decisions                              │
│ - Output: ParsedMeasure[]                           │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Layer 2: MUSICAL ANALYSIS (NEW)                     │
│ MusicAnalyzer                                        │
│ - Analyze complete measures                         │
│ - Determine beam groups across segments             │
│ - Detect ties, apply musical rules                  │
│ - Output: AnalyzedMeasure[]                         │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Layer 3: VISUAL RENDERING                           │
│ MeasureRenderer, SVGRenderer                        │
│ - Position all notes first                          │
│ - Draw beams using BeamGroup[] from analyzer        │
│ - Apply visual styling                              │
│ - Output: SVG Elements                              │
└─────────────────────────────────────────────────────┘
```

## New Type Definitions

### Phase 1: Parsed (Syntactic)

```typescript
/**
 * Raw note from parser - no musical analysis yet
 */
interface ParsedNote {
  value: NoteValue;         // 1, 2, 4, 8, 16, 32, 64
  dotted: boolean;
  isRest: boolean;
  tieStart?: boolean;       // Raw from syntax _
  tieEnd?: boolean;
  tieToVoid?: boolean;
  tieFromVoid?: boolean;
}

/**
 * Chord segment from parser
 */
interface ParsedSegment {
  chord: string;
  notes: ParsedNote[];      // Flat array, no beat grouping yet
  leadingSpace: boolean;    // Space before chord in source
}

/**
 * Complete measure from parser
 */
interface ParsedMeasure {
  segments: ParsedSegment[];
  barline: BarlineType;
  lineBreakAfter: boolean;
  source: string;
}

/**
 * Complete grid from parser
 */
interface ParsedGrid {
  timeSignature: TimeSignature;
  measures: ParsedMeasure[];
  errors: ValidationError[];
}
```

### Phase 2: Analyzed (Musical)

```typescript
/**
 * Beam group spanning multiple notes, possibly across segments
 */
interface BeamGroup {
  level: number;            // 1, 2, 3, 4 (for 8th, 16th, 32nd, 64th)
  notes: NoteReference[];   // Which notes are in this beam
  isPartial: boolean;       // True for beamlets
  direction?: 'left' | 'right'; // For beamlets
}

/**
 * Reference to a note in the measure
 */
interface NoteReference {
  segmentIndex: number;
  noteIndex: number;        // Index in flat array
}

/**
 * Analyzed measure with beam groups calculated
 */
interface AnalyzedMeasure extends ParsedMeasure {
  beamGroups: BeamGroup[];  // All beam groups for this measure
  allNotes: ParsedNote[];   // Flat array of all notes
}

/**
 * Complete analyzed grid
 */
interface AnalyzedGrid extends ParsedGrid {
  measures: AnalyzedMeasure[];
}
```

### Phase 3: Positioned (Visual)

```typescript
/**
 * Note with calculated visual position
 */
interface PositionedNote extends ParsedNote {
  x: number;                // Center X
  y: number;                // Center Y
  headLeftX: number;
  headRightX: number;
  stemX: number;
  stemTopY: number;
  stemBottomY: number;
}

/**
 * Beam group with positioned notes ready to draw
 */
interface PositionedBeamGroup extends BeamGroup {
  notes: PositionedNote[];
  startX: number;
  endX: number;
  baseY: number;
}
```

## Implementation Plan

### Phase 1: Create New Analyzer (Week 1)

**New File**: `src/analyzer/MusicAnalyzer.ts`

```typescript
export class MusicAnalyzer {
  /**
   * Analyze a parsed measure and determine beam groups
   */
  analyzeBeams(measure: ParsedMeasure): BeamGroup[] {
    const beamGroups: BeamGroup[] = [];
    
    // 1. Flatten all notes with origins
    const allNotes = this.flattenNotes(measure);
    
    // 2. Group beamable notes respecting segment boundaries
    const groups = this.groupBeamableNotes(allNotes, measure);
    
    // 3. Create BeamGroup objects for each level
    groups.forEach(group => {
      const maxLevel = this.getMaxBeamLevel(group);
      for (let level = 1; level <= maxLevel; level++) {
        beamGroups.push(this.createBeamGroup(group, level));
      }
    });
    
    return beamGroups;
  }
  
  private flattenNotes(measure: ParsedMeasure): NoteWithOrigin[] {
    // Implementation
  }
  
  private groupBeamableNotes(
    notes: NoteWithOrigin[], 
    measure: ParsedMeasure
  ): number[][] {
    const groups: number[][] = [];
    let currentGroup: number[] = [];
    
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      const isBeamable = note.note.value >= 8 && !note.note.isRest;
      
      // Determine if we should break the beam group
      const shouldBreak = this.shouldBreakBeam(notes, i, measure);
      
      if (isBeamable && !shouldBreak) {
        currentGroup.push(i);
      } else {
        if (currentGroup.length > 1) {
          groups.push([...currentGroup]);
        }
        currentGroup = isBeamable ? [i] : [];
      }
    }
    
    if (currentGroup.length > 1) {
      groups.push(currentGroup);
    }
    
    return groups;
  }
  
  private shouldBreakBeam(
    notes: NoteWithOrigin[],
    index: number,
    measure: ParsedMeasure
  ): boolean {
    // Check if next note crosses segment with leadingSpace
    if (index >= notes.length - 1) return false;
    
    const current = notes[index];
    const next = notes[index + 1];
    
    if (next.segmentIndex > current.segmentIndex) {
      const nextSegment = measure.segments[next.segmentIndex];
      return nextSegment.leadingSpace;
    }
    
    return false;
  }
  
  // ... other helper methods
}
```

**Tasks**:
- [ ] Create `src/analyzer/` directory
- [ ] Implement `MusicAnalyzer` class
- [ ] Add comprehensive unit tests
- [ ] Document all methods with JSDoc

### Phase 2: Simplify Parser (Week 1)

**Modified File**: `src/parser/ChordGridParser.ts`

**Changes**:
1. Remove `BeamAndTieAnalyzer` class entirely
2. Parser only creates `ParsedNote[]`, no Beat grouping
3. Return `ParsedGrid` instead of current structure
4. Call `MusicAnalyzer` after parsing

```typescript
export class ChordGridParser {
  parse(input: string): AnalyzedGrid {
    // 1. Parse syntax
    const parsed: ParsedGrid = this.parseSyntax(input);
    
    // 2. Analyze music
    const analyzer = new MusicAnalyzer();
    const measures: AnalyzedMeasure[] = parsed.measures.map(m => ({
      ...m,
      beamGroups: analyzer.analyzeBeams(m),
      allNotes: this.flattenMeasureNotes(m)
    }));
    
    return {
      ...parsed,
      measures
    };
  }
  
  private parseSyntax(input: string): ParsedGrid {
    // Pure syntactic parsing, no musical decisions
  }
}
```

**Tasks**:
- [ ] Extract pure parsing logic
- [ ] Remove beam analysis code
- [ ] Integrate with `MusicAnalyzer`
- [ ] Update all tests

### Phase 3: Update Type Definitions (Week 1)

**Modified File**: `src/parser/type.ts`

**Changes**:
1. Add new interfaces: `ParsedNote`, `ParsedSegment`, `ParsedMeasure`
2. Add new interfaces: `BeamGroup`, `NoteReference`, `AnalyzedMeasure`
3. Deprecate old `Beat` interface (keep for backward compat temporarily)
4. Add migration utilities if needed

**Tasks**:
- [ ] Define all new interfaces
- [ ] Add comprehensive JSDoc
- [ ] Create type guards for runtime checks
- [ ] Update ARCHITECTURE.md

### Phase 4: Refactor Renderer (Week 2)

**Modified File**: `src/renderer/MeasureRenderer.ts`

**New Architecture**:

```typescript
export class MeasureRenderer {
  drawMeasure(
    svg: SVGElement, 
    measure: AnalyzedMeasure,
    ...
  ): void {
    // 1. Position ALL notes first
    const positioned = this.positionAllNotes(measure);
    
    // 2. Draw note heads and stems
    positioned.forEach(note => {
      this.drawNoteHead(svg, note);
      if (!note.isRest) {
        this.drawStem(svg, note);
      }
    });
    
    // 3. Draw ALL beams in single pass
    measure.beamGroups.forEach(group => {
      const positionedGroup = this.positionBeamGroup(group, positioned);
      this.drawBeam(svg, positionedGroup);
    });
    
    // 4. Draw ties
    this.drawTies(svg, positioned, measure);
  }
  
  private positionAllNotes(measure: AnalyzedMeasure): PositionedNote[] {
    // Calculate x, y for all notes
  }
  
  private drawBeam(svg: SVGElement, group: PositionedBeamGroup): void {
    // Simple, clean beam drawing
    if (group.notes.length === 1) {
      // Draw beamlet
      this.drawBeamlet(svg, group);
    } else {
      // Draw full beam
      this.drawFullBeam(svg, group);
    }
  }
}
```

**Tasks**:
- [ ] Refactor `drawMeasure` to three-pass approach
- [ ] Separate positioning from drawing
- [ ] Use `BeamGroup[]` from analyzer
- [ ] Simplify beam drawing logic
- [ ] Update all renderer tests

### Phase 5: Integration & Testing (Week 2-3)

**Test Files to Update**:
- `test/parse.spec.ts`
- `test/beam_parse.spec.ts`
- `test/beam_render.test.ts`
- New: `test/analyzer.spec.ts`
- New: `test/cross_segment_beams.spec.ts`

**Integration Checklist**:
- [ ] All existing tests pass
- [ ] New cross-segment beam tests pass
- [ ] Visual regression testing (compare renders)
- [ ] Performance benchmarking (should be similar or better)
- [ ] Memory usage check

**Test Cases for Cross-Segment Beams**:
```typescript
describe('Cross-segment beams', () => {
  it('connects beams without space: [8]G[8]', () => {
    // Should create single BeamGroup with 2 notes
  });
  
  it('breaks beams with space: [8] G[8]', () => {
    // Should create 2 separate BeamGroups
  });
  
  it('connects multiple segments: C[88]Dm[88]G[88]', () => {
    // Should create single BeamGroup with 6 notes
  });
  
  it('respects rests as breaks: [88-88]', () => {
    // Should create 2 BeamGroups, broken by rest
  });
});
```

### Phase 6: Documentation & Migration Guide (Week 3)

**Documents to Create/Update**:
1. `MIGRATION_v2.md` - Guide for users upgrading from v1.x
2. `ARCHITECTURE.md` - Update with new architecture
3. `CONTRIBUTING.md` - Update with new code structure
4. All JSDoc comments in code

**Migration Guide Content**:
- API changes (if plugin was extensible)
- Visual changes (should be minimal)
- Known breaking changes
- How to report issues

**Tasks**:
- [ ] Create migration guide
- [ ] Update architecture docs
- [ ] Create new architecture diagrams
- [ ] Update README with v2.0.0 info

### Phase 7: Release v2.0.0 (Week 3)

**Pre-release Checklist**:
- [ ] All tests passing
- [ ] Code coverage > 80%
- [ ] No TypeScript errors
- [ ] Build successful
- [ ] Manual testing in Obsidian
- [ ] Documentation complete
- [ ] CHANGELOG updated

**Release Steps**:
1. Bump version to 2.0.0 in `manifest.json` and `package.json`
2. Update CHANGELOG with full v2.0.0 notes
3. Create git tag `v2.0.0`
4. Push to GitHub
5. Create GitHub release with notes
6. Monitor for issues

## Timeline

| Week | Focus | Deliverables |
|------|-------|--------------|
| 1 | New Analyzer + Parser Refactor | `MusicAnalyzer` working, parser simplified |
| 2 | Renderer Refactor + Types | New rendering working, types updated |
| 3 | Testing + Docs + Release | All tests pass, docs complete, v2.0.0 released |

**Total Estimated Time**: 3 weeks (15-20 hours/week)

## Benefits of New Architecture

### Immediate Benefits
- ✅ Cross-segment beams work correctly
- ✅ Code is clearer and easier to understand
- ✅ Each component has single responsibility
- ✅ Easier to test in isolation

### Future Benefits
- 🎨 UI customization (colors, styles) becomes trivial
- 🎵 Advanced musical features easier to add
- 🐛 Bugs easier to locate and fix
- 📈 Better performance (single-pass operations)
- 🔌 Potential plugin API for extensions

## Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking existing grids | Low | High | Extensive testing, keep v1.1.0 available |
| Performance regression | Low | Medium | Benchmark before/after |
| Increased complexity | Medium | Medium | Good documentation, clear separation |
| Timeline overrun | Medium | Low | Phased approach, can release partial |

## Success Metrics

- [ ] All v1.1.0 test cases pass
- [ ] Cross-segment beams work correctly
- [ ] No visual regressions
- [ ] Build time < 5 seconds
- [ ] Render time similar to v1.1.0
- [ ] Code coverage > 80%
- [ ] Zero critical bugs after 1 week

## Rollback Plan

If critical issues arise:
1. v1.1.0 tagged and available
2. Users can downgrade via git
3. Obsidian plugin system allows version switching
4. We continue fixes on v2.x branch

## Questions & Decisions

### Decided
- ✅ Complete refactor (Option A) approved
- ✅ Three-layer architecture confirmed
- ✅ v1.1.0 tagged as stable before refactoring

### To Decide
- ❓ Keep backward compatibility with old API? (Probably no, major version)
- ❓ Support migration from v1 saved preferences? (Not applicable yet)
- ❓ Parallel branch or main branch? (Main branch, with good commits)

## Notes

- This refactoring will make future features (UI customization, MIDI export, etc.) much easier
- The architecture is inspired by compiler design: parse → analyze → generate
- Each layer can be tested independently
- The new structure aligns with how music notation actually works

---

**Last Updated**: November 11, 2025  
**Document Owner**: MathieuCGit  
**Status**: Ready to begin implementation
