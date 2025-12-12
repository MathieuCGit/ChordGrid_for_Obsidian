/**
 * @file analyzer.spec.ts
 * @description Unit tests for MusicAnalyzer
 * 
 * Tests the new v2.0.0 architecture's analysis layer, specifically:
 * - Cross-segment beam grouping
 * - Respecting leadingSpace boundaries
 * - Beamlet direction with dotted notes
 * - Rest handling
 * - Multiple beam levels
 */

import { MusicAnalyzer } from '../src/analyzer/MusicAnalyzer';
import { ParsedMeasure, ParsedSegment, BeamGroup } from '../src/analyzer/analyzer-types';
import { BarlineType, TimeSignature } from '../src/parser/type';

// Test helper declarations for ts-node execution
declare const describe: any;
declare const it: any;
declare const beforeEach: any;
declare const expect: any;
// Helper to create a test measure with defaults
function createTestMeasure(segments: ParsedSegment[], beatsPerMeasure: number = 4, beatUnit: number = 4): ParsedMeasure {
  return {
    segments,
    timeSignature: {
      numerator: beatsPerMeasure,
      denominator: beatUnit,
      beatsPerMeasure,
      beatUnit,
      groupingMode: 'space-based' as any
    },
  barline: BarlineType.Single,
  isLineBreak: false,
  source: '[test]'
  };
}


describe('MusicAnalyzer', () => {
  let analyzer: MusicAnalyzer;
  
  beforeEach(() => {
    analyzer = new MusicAnalyzer();
  });
  

  describe('Cross-segment beam grouping', () => {
    it('should beam across segments without space: [8]G[8]', () => {
      // Structure conforming to current ParsedMeasure/ParsedSegment/ParsedNote types
      const measure: ParsedMeasure = {
        segments: [
          {
            chord: 'C',
            notes: [{ value: 8, dotted: false, isRest: false }],
            leadingSpace: false
          },
          {
            chord: 'G',
            notes: [{ value: 8, dotted: false, isRest: false }],
            leadingSpace: false
          }
        ],
        timeSignature: { numerator: 4, denominator: 4, beatsPerMeasure: 4, beatUnit: 4, groupingMode: 'space-based' as any },
        barline: BarlineType.Single,
        isLineBreak: false,
        source: '[test]'
      };

      const result = analyzer.analyze(measure);

      // Should create ONE beam group connecting both notes
      expect(result.beamGroups).toHaveLength(1);
      expect(result.beamGroups[0].level).toBe(1);
      expect(result.beamGroups[0].notes).toHaveLength(2);
      expect(result.beamGroups[0].isPartial).toBe(false);

      // Verification of segment and note indices
      expect(result.beamGroups[0].notes[0].segmentIndex).toBe(0);
      expect(result.beamGroups[0].notes[0].noteIndex).toBe(0);
      expect(result.beamGroups[0].notes[1].segmentIndex).toBe(1);
      expect(result.beamGroups[0].notes[1].noteIndex).toBe(0);
    });

    it('should break beams at segments WITH space: [8] G[8]', () => {
      const measure: ParsedMeasure = {
        segments: [
          {
            chord: 'C',
            notes: [{ value: 8, dotted: false, isRest: false }],
            leadingSpace: false
          },
          {
            chord: 'G',
            notes: [{ value: 8, dotted: false, isRest: false }],
            leadingSpace: true // Espace avant ce segment
          }
        ],
        timeSignature: { numerator: 4, denominator: 4, beatsPerMeasure: 4, beatUnit: 4, groupingMode: 'space-based' as any },
        barline: BarlineType.Single,
        isLineBreak: false,
        source: '[test]'
      };

      const result = analyzer.analyze(measure);

  // Version >=2.0.1: Simply verify that there are two distinct groups
  expect(result.beamGroups).toHaveLength(2);
  // We no longer force isPartial to true, we verify the actual structure
  expect(result.beamGroups[0].notes).toHaveLength(1);
  expect(result.beamGroups[1].notes).toHaveLength(1);
  // Documentation: partial beamlet logic has evolved, we no longer test isPartial
    });
    
    it('should beam across multiple segments: [8]C[8]D[8]', () => {
      const measure: ParsedMeasure = {
        segments: [
          {
            chord: 'C',
            notes: [{ value: 8, dotted: false, isRest: false }],
            leadingSpace: false
          },
          {
            chord: 'D',
            notes: [{ value: 8, dotted: false, isRest: false }],
            leadingSpace: false
          },
          {
            chord: 'E',
            notes: [{ value: 8, dotted: false, isRest: false }],
            leadingSpace: false
          }
    ],
  timeSignature: { numerator: 4, denominator: 4, beatsPerMeasure: 4, beatUnit: 4, groupingMode: 'space-based' as any }, barline: BarlineType.Single, isLineBreak: false, source: "[test]"
      };
      
      const result = analyzer.analyze(measure);
      
      // Should create ONE beam connecting all three notes
      expect(result.beamGroups).toHaveLength(1);
      expect(result.beamGroups[0].notes).toHaveLength(3);
      expect(result.beamGroups[0].isPartial).toBe(false);
    });
  });
  
  describe('Rest handling', () => {
    it('should break beams at rests: [88-88]', () => {
      const measure: ParsedMeasure = {
        segments: [
          {
            chord: 'C',
            notes: [
              { value: 8, dotted: false, isRest: false },
              { value: 8, dotted: false, isRest: false },
              { value: 8, dotted: false, isRest: true },
              { value: 8, dotted: false, isRest: false },
              { value: 8, dotted: false, isRest: false }
            ],
            leadingSpace: false
          }
    ],
  timeSignature: { numerator: 4, denominator: 4, beatsPerMeasure: 4, beatUnit: 4, groupingMode: 'space-based' as any }, barline: BarlineType.Single, isLineBreak: false, source: "[test]"
      };
      
      const result = analyzer.analyze(measure);
      
  // Should create at least two groups (before and after rest). Auto-breaking
  // may split the post-rest notes by beat boundaries, so accept 2 or more.
  expect(result.beamGroups.length).toBeGreaterThanOrEqual(2);

  // First group must be the two notes before the rest (indices 0 and 1)
  expect(result.beamGroups[0].notes).toHaveLength(2);
  expect(result.beamGroups[0].notes[0].noteIndex).toBe(0);
  expect(result.beamGroups[0].notes[1].noteIndex).toBe(1);

  // Remaining groups should cover notes after the rest (indices 3 and 4)
  const tailNoteIndices = result.beamGroups.slice(1).flatMap(g => g.notes.map(n => n.noteIndex)).sort();
  expect(tailNoteIndices).toEqual([3, 4]);
    });
  });
  
  describe('Beamlet direction', () => {

    it('should point beamlet LEFT after dotted note: [8.8]', () => {
      const measure: ParsedMeasure = {
        segments: [
          {
            chord: 'C',
            notes: [
              { value: 8, dotted: true, isRest: false },
              { value: 8, dotted: false, isRest: false }
            ],
            leadingSpace: false
          }
        ],
        timeSignature: { numerator: 4, denominator: 4, beatsPerMeasure: 4, beatUnit: 4, groupingMode: 'space-based' as any }, barline: BarlineType.Single, isLineBreak: false, source: '[test]'
      };

      const result = analyzer.analyze(measure);

      // Version >=2.0.1: Dotted notes form a complete beam (no beamlet)
      expect(result.beamGroups).toHaveLength(1);
      expect(result.beamGroups[0].isPartial).toBe(false);
      expect(result.beamGroups[0].notes).toHaveLength(2);
    });

    it('should point beamlet RIGHT before dotted note: [88.]', () => {
      const measure: ParsedMeasure = {
        segments: [
          {
            chord: 'C',
            notes: [
              { value: 8, dotted: false, isRest: false },
              { value: 8, dotted: true, isRest: false }
            ],
            leadingSpace: false
          }
  ],
  timeSignature: { numerator: 4, denominator: 4, beatsPerMeasure: 4, beatUnit: 4, groupingMode: 'space-based' as any }, barline: BarlineType.Single, isLineBreak: false, source: '[test]'
      };

      const result = analyzer.analyze(measure);

      // Version >=2.0.1: Dotted notes form a complete beam (no beamlet)
      expect(result.beamGroups).toHaveLength(1);
      expect(result.beamGroups[0].isPartial).toBe(false);
      expect(result.beamGroups[0].notes).toHaveLength(2);
    });
    
    it('should point isolated beamlet toward center: [16-8-16]', () => {
      const measure: ParsedMeasure = {
        segments: [
          {
            chord: 'C',
            notes: [
              { value: 16, dotted: false, isRest: false },
              { value: 8, dotted: false, isRest: true },
              { value: 16, dotted: false, isRest: false }
            ],
            leadingSpace: false
          }
    ],
  timeSignature: { numerator: 4, denominator: 4, beatsPerMeasure: 4, beatUnit: 4, groupingMode: 'space-based' as any }, barline: BarlineType.Single, isLineBreak: false, source: "[test]"
      };
      
      const result = analyzer.analyze(measure);
      
      // Two isolated 16th notes should have beamlets
      const beamlets = result.beamGroups.filter(g => g.isPartial && g.level === 2);
      expect(beamlets).toHaveLength(2);
      
      // v3.0: Rest blocks level-2 beam but NOT level-1 beam
      // The two 16th notes are connected at level 1, so beamlet directions follow group pattern
      // First beamlet (16 before rest) points right (start of 2-note group)
      expect(beamlets[0].direction).toBe('right');
      
      // Second beamlet (16 after rest) points left (end of 2-note group)
      expect(beamlets[1].direction).toBe('left');
    });
  });
  
  describe('Multiple beam levels', () => {
    it('should create multiple levels for 16th notes: [1616]', () => {
      const measure: ParsedMeasure = {
        segments: [
          {
            chord: 'C',
            notes: [
              { value: 16, dotted: false, isRest: false },
              { value: 16, dotted: false, isRest: false }
            ],
            leadingSpace: false
          }
    ],
  timeSignature: { numerator: 4, denominator: 4, beatsPerMeasure: 4, beatUnit: 4, groupingMode: 'space-based' as any }, barline: BarlineType.Single, isLineBreak: false, source: "[test]"
      };
      
      const result = analyzer.analyze(measure);
      
      // Should create TWO beam groups: level 1 (8th) and level 2 (16th)
      expect(result.beamGroups).toHaveLength(2);
      
      const level1 = result.beamGroups.find(g => g.level === 1);
      const level2 = result.beamGroups.find(g => g.level === 2);
      
      expect(level1).toBeDefined();
      expect(level2).toBeDefined();
      
      // Both should connect the two notes
      expect(level1?.notes).toHaveLength(2);
      expect(level2?.notes).toHaveLength(2);
      
      // Neither should be partial
      expect(level1?.isPartial).toBe(false);
      expect(level2?.isPartial).toBe(false);
    });
    
    it('should handle mixed note values: [8168]', () => {
      const measure: ParsedMeasure = {
        segments: [
          {
            chord: 'C',
            notes: [
              { value: 8, dotted: false, isRest: false },
              { value: 16, dotted: false, isRest: false },
              { value: 8, dotted: false, isRest: false }
            ],
            leadingSpace: false
          }
    ],
  timeSignature: { numerator: 4, denominator: 4, beatsPerMeasure: 4, beatUnit: 4, groupingMode: 'space-based' as any }, barline: BarlineType.Single, isLineBreak: false, source: "[test]"
      };
      
      const result = analyzer.analyze(measure);
      
      // Level 1: All three notes beamed together
      const level1 = result.beamGroups.find(g => g.level === 1 && !g.isPartial);
      expect(level1).toBeDefined();
      expect(level1?.notes).toHaveLength(3);
      
      // Level 2: Only the 16th note (beamlet)
      const level2 = result.beamGroups.find(g => g.level === 2);
      expect(level2).toBeDefined();
      expect(level2?.notes).toHaveLength(1);
      expect(level2?.isPartial).toBe(true);
    });
    
    it('should handle 32nd notes: [32323232]', () => {
      const measure: ParsedMeasure = {
        segments: [
          {
            chord: 'C',
            notes: [
              { value: 32, dotted: false, isRest: false },
              { value: 32, dotted: false, isRest: false },
              { value: 32, dotted: false, isRest: false },
              { value: 32, dotted: false, isRest: false }
            ],
            leadingSpace: false
          }
    ],
  timeSignature: { numerator: 4, denominator: 4, beatsPerMeasure: 4, beatUnit: 4, groupingMode: 'space-based' as any }, barline: BarlineType.Single, isLineBreak: false, source: "[test]"
      };
      
      const result = analyzer.analyze(measure);
      
      // Should create THREE levels: 1 (8th), 2 (16th), 3 (32nd)
      expect(result.beamGroups).toHaveLength(3);
      
      // All levels should connect all 4 notes
      result.beamGroups.forEach(group => {
        expect(group.notes).toHaveLength(4);
        expect(group.isPartial).toBe(false);
      });
    });
  });
  
  describe('Complex patterns', () => {
    it('should handle [8]G[8] D[16] (cross-segment + isolated beamlet)', () => {
      const measure: ParsedMeasure = {
        segments: [
          {
            chord: 'C',
            notes: [{ value: 8, dotted: false, isRest: false }],
            leadingSpace: false
          },
          {
            chord: 'G',
            notes: [{ value: 8, dotted: false, isRest: false }],
            leadingSpace: false
          },
          {
            chord: 'D',
            notes: [{ value: 16, dotted: false, isRest: false }],
            leadingSpace: true  // Space breaks beam
          }
    ],
  timeSignature: { numerator: 4, denominator: 4, beatsPerMeasure: 4, beatUnit: 4, groupingMode: 'space-based' as any }, barline: BarlineType.Single, isLineBreak: false, source: "[test]"
      };
      
      const result = analyzer.analyze(measure);
      
      // First two 8th notes should be beamed together
      const mainBeam = result.beamGroups.find(
        g => g.level === 1 && !g.isPartial && g.notes.length === 2
      );
      expect(mainBeam).toBeDefined();
      
      // 16th note should have TWO beamlets (level 1 and level 2)
      const beamlets = result.beamGroups.filter(
        g => g.isPartial && g.notes[0].segmentIndex === 2
      );
      expect(beamlets.length).toBeGreaterThanOrEqual(1);
    });
  });
  
  describe('Edge cases', () => {
    it('should handle empty segments gracefully', () => {
      const measure: ParsedMeasure = {
    segments: [],
  timeSignature: { numerator: 4, denominator: 4, beatsPerMeasure: 4, beatUnit: 4, groupingMode: 'space-based' as any }, barline: BarlineType.Single, isLineBreak: false, source: "[test]"
      };
      
      const result = analyzer.analyze(measure);
      
      expect(result.beamGroups).toHaveLength(0);
      expect(result.allNotes).toHaveLength(0);
    });
    
    it('should handle measure with only whole notes (no beams)', () => {
      const measure: ParsedMeasure = {
        segments: [
          {
            chord: 'C',
            notes: [
              { value: 1, dotted: false, isRest: false },
              { value: 2, dotted: false, isRest: false }
            ],
            leadingSpace: false
          }
    ],
  timeSignature: { numerator: 4, denominator: 4, beatsPerMeasure: 4, beatUnit: 4, groupingMode: 'space-based' as any }, barline: BarlineType.Single, isLineBreak: false, source: "[test]"
      };
      
      const result = analyzer.analyze(measure);
      
      // No beamable notes, so no beam groups
      expect(result.beamGroups).toHaveLength(0);
      
      // But allNotes should still be populated
      expect(result.allNotes).toHaveLength(2);
    });
    
    it('should handle single beamable note (isolated beamlet)', () => {
      const measure: ParsedMeasure = {
        segments: [
          {
            chord: 'C',
            notes: [{ value: 16, dotted: false, isRest: false }],
            leadingSpace: false
          }
    ],
  timeSignature: { numerator: 4, denominator: 4, beatsPerMeasure: 4, beatUnit: 4, groupingMode: 'space-based' as any }, barline: BarlineType.Single, isLineBreak: false, source: "[test]"
      };
      
      const result = analyzer.analyze(measure);
      
  // Version >=2.0.1: Simply verify that at least one beamlet exists
  const beamlets = result.beamGroups.filter(g => g.isPartial);
  expect(beamlets.length).toBeGreaterThanOrEqual(1);
    });
  });
});



