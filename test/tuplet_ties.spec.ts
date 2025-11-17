/**
 * Tests for ties (liaisons) within tuplets
 */

import { ChordGridParser } from '../src/parser/ChordGridParser';

declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;

describe('Tuplet ties (liaisons)', () => {
  let parser: ChordGridParser;

  beforeEach(() => {
    parser = new ChordGridParser();
  });

  describe('Simple ties within tuplets', () => {
    it('should parse ties between all notes in a triplet {8_8_8}3', () => {
      const result = parser.parse('4/4 | C[{8_8_8}3 4 4 4] |');
      expect(result.errors).toHaveLength(0);
      
      const segment = result.grid.measures[0].chordSegments[0];
      // Collect all notes from all beats
      const allNotes = segment.beats.flatMap(b => b.notes);
      
      // Should have 6 notes total: 3 in tuplet + 3 quarter notes
      expect(allNotes.length).toBe(6);
      
      // First note: tieStart=true (ties to second)
      expect(allNotes[0].tuplet).toBeDefined();
      expect(allNotes[0].tieStart).toBe(true);
      expect(allNotes[0].tieEnd).toBe(false);
      
      // Second note: tieStart=true, tieEnd=true (tied from first, ties to third)
      expect(allNotes[1].tuplet).toBeDefined();
      expect(allNotes[1].tieStart).toBe(true);
      expect(allNotes[1].tieEnd).toBe(true);
      
      // Third note: tieEnd=true (tied from second)
      expect(allNotes[2].tuplet).toBeDefined();
      expect(allNotes[2].tieStart).toBe(false);
      expect(allNotes[2].tieEnd).toBe(true);
      
      // Fourth, fifth, sixth notes: no ties
      expect(allNotes[3].tuplet).toBeUndefined();
      expect(allNotes[3].tieStart).toBe(false);
      expect(allNotes[3].tieEnd).toBe(false);
    });

    it('should parse partial tie in triplet {8_8 8}3', () => {
      const result = parser.parse('4/4 | C[{8_8 8}3 4 4 4] |');
      expect(result.errors).toHaveLength(0);
      
      const segment = result.grid.measures[0].chordSegments[0];
      const allNotes = segment.beats.flatMap(b => b.notes);
      expect(allNotes.length).toBe(6);
      
      // First note: tieStart=true
      expect(allNotes[0].tieStart).toBe(true);
      expect(allNotes[0].tieEnd).toBe(false);
      
      // Second note: tieEnd=true (but no tieStart - tie stops here)
      expect(allNotes[1].tieStart).toBe(false);
      expect(allNotes[1].tieEnd).toBe(true);
      
      // Third note: no ties (separated by space)
      expect(allNotes[2].tieStart).toBe(false);
      expect(allNotes[2].tieEnd).toBe(false);
    });
  });

  describe('Ties crossing tuplet boundaries', () => {
    it('should parse tie from tuplet to next note {8 8 8_}3 4', () => {
      const result = parser.parse('4/4 | C[{8 8 8_}3 4 4 4] |');
      expect(result.errors).toHaveLength(0);
      
      const segment = result.grid.measures[0].chordSegments[0];
      const tupletNotes = segment.beats[0].notes;
      const nextNote = segment.beats[1].notes[0];
      
      // Last tuplet note should have tieStart
      expect(tupletNotes[2].tuplet).toBeDefined();
      expect(tupletNotes[2].tieStart).toBe(true);
      
      // Note after tuplet should have tieEnd
      expect(nextNote.tuplet).toBeUndefined();
      expect(nextNote.tieEnd).toBe(true);
    });

    it('should parse tie from note into tuplet 4_{8 8 8}3', () => {
      const result = parser.parse('4/4 | C[4_{8 8 8}3 4 4] |');
      expect(result.errors).toHaveLength(0);
      
      const segment = result.grid.measures[0].chordSegments[0];
      const beat0Notes = segment.beats[0].notes;
      const firstNote = beat0Notes[0];
      const firstTupletNote = beat0Notes[1];
      
      // First note (before tuplet) should have tieStart
      expect(firstNote.tuplet).toBeUndefined();
      expect(firstNote.tieStart).toBe(true);
      
      // First tuplet note should have tieEnd
      expect(firstTupletNote.tuplet).toBeDefined();
      expect(firstTupletNote.tieEnd).toBe(true);
    });

    it('should parse tie spanning through entire tuplet 4_{8_8_8}3_4', () => {
      const result = parser.parse('4/4 | C[4_{8_8_8}3_4 4] |');
      expect(result.errors).toHaveLength(0);
      
      const segment = result.grid.measures[0].chordSegments[0];
      const allNotes = segment.beats.flatMap(b => b.notes);
      expect(allNotes.length).toBe(6); // 1 + 3 tuplet + 1 + 1
      
      // All notes should be tied together (syncopation spanning 4 beats)
      expect(allNotes[0].tieStart).toBe(true); // first quarter
      expect(allNotes[1].tieStart).toBe(true); // tuplet 1
      expect(allNotes[1].tieEnd).toBe(true);
      expect(allNotes[2].tieStart).toBe(true); // tuplet 2
      expect(allNotes[2].tieEnd).toBe(true);
      expect(allNotes[3].tieStart).toBe(true); // tuplet 3
      expect(allNotes[3].tieEnd).toBe(true);
      expect(allNotes[4].tieStart).toBe(false);
      expect(allNotes[4].tieEnd).toBe(true);   // last quarter
    });
  });

  describe('Ties with rests in tuplets', () => {
    it('should handle tie before rest in tuplet {8_8 -8}3', () => {
      const result = parser.parse('4/4 | C[{8_8 -8}3 4 4 4] |');
      expect(result.errors).toHaveLength(0);
      
      const tupletNotes = result.grid.measures[0].chordSegments[0].beats[0].notes;
      
      // First two notes tied
      expect(tupletNotes[0].tieStart).toBe(true);
      expect(tupletNotes[1].tieEnd).toBe(true);
      
      // Third is a rest
      expect(tupletNotes[2].isRest).toBe(true);
      expect(tupletNotes[2].tieStart).toBe(false);
      expect(tupletNotes[2].tieEnd).toBe(false);
    });
  });

  describe('Rhythm validation with ties', () => {
    it('should validate correctly - ties do not change duration', () => {
      // All of these should be valid 4/4 measures
      const cases = [
        'C[{8_8_8}3 4 4 4]',           // Triplet with ties + 3 quarters
        'C[4_{8 8 8}3 4 4]',           // Quarter tied into triplet + 2 quarters
        'C[4_{8_8_8}3_4 4]',           // Quarter tied through triplet to quarter + quarter
        'C[{8_8_8}3 {8 8 8}3 4 4]'    // Two triplets (one tied, one not) + 2 quarters
      ];

      cases.forEach(pattern => {
        const result = parser.parse(`4/4 | ${pattern} |`);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe('Complex tuplet tie scenarios', () => {
    it('should handle multiple tuplets with ties', () => {
      const result = parser.parse('4/4 | C[{8_8_8}3 4_{8 8 8}3 4] |');
      expect(result.errors).toHaveLength(0);
      
      const segment = result.grid.measures[0].chordSegments[0];
      const allNotes = segment.beats.flatMap(b => b.notes);
      
      // First triplet: all tied
      expect(allNotes[0].tieStart).toBe(true);
      expect(allNotes[1].tieEnd).toBe(true);
      expect(allNotes[1].tieStart).toBe(true);
      expect(allNotes[2].tieEnd).toBe(true);
      
      // Middle quarter tied to next tuplet
      expect(allNotes[3].tieStart).toBe(true);
      expect(allNotes[4].tieEnd).toBe(true);
    });

    it('should handle tie across subgroups within tuplet {88_ _88}6', () => {
      const result = parser.parse('4/4 | C[{88_ _88 88}6 4 4] |');
      expect(result.errors).toHaveLength(0);
      
      const segment = result.grid.measures[0].chordSegments[0];
      const tupletNotes = segment.beats[0].notes;
      expect(tupletNotes.length).toBe(6); // 6 sextuplet notes
      
      // Second note of first subgroup should tie across
      expect(tupletNotes[1].tieStart).toBe(true);
      
      // First note of second subgroup should be tied from previous
      expect(tupletNotes[2].tieEnd).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle tie at very start of tuplet for intra-measure ties 4_{8 8 8}3', () => {
      const result = parser.parse('4/4 | C[4_{8 8 8}3 4 4] |');
      expect(result.errors).toHaveLength(0);
      
      const segment = result.grid.measures[0].chordSegments[0];
      const beat0Notes = segment.beats[0].notes;
      const firstNote = beat0Notes[0];
      const firstTupletNote = beat0Notes[1];
      
      // First note (before tuplet) should tie to first tuplet note
      expect(firstNote.tieStart).toBe(true);
      expect(firstTupletNote.tieEnd).toBe(true);
    });

    it('should handle tie at very start of tuplet for cross-measure ties {_8 8 8}3', () => {
      // This pattern has tie coming from previous measure
      const result = parser.parse('4/4 | C[{_8 8 8}3 4 4 4] |');
      expect(result.errors).toHaveLength(0);
      
      const segment = result.grid.measures[0].chordSegments[0];
      const tupletNotes = segment.beats[0].notes;
      
      // First tuplet note should have tieEnd (receives tie from previous measure)
      expect(tupletNotes[0].tuplet).toBeDefined();
      expect(tupletNotes[0].tieEnd).toBe(true);
      expect(tupletNotes[0].tieStart).toBe(false);
      
      // Other tuplet notes should not have ties
      expect(tupletNotes[1].tieStart).toBe(false);
      expect(tupletNotes[1].tieEnd).toBe(false);
    });

    it('should handle tie at very end of tuplet {8 8 8_}3', () => {
      const result = parser.parse('4/4 | C[{8 8 8_}3 4 4 4] |');
      expect(result.errors).toHaveLength(0);
      
      const segment = result.grid.measures[0].chordSegments[0];
      const tupletNotes = segment.beats[0].notes;
      const nextNote = segment.beats[1].notes[0];
      
      // Last tuplet note should tie to next note
      expect(tupletNotes[2].tieStart).toBe(true);
      expect(nextNote.tieEnd).toBe(true);
    });

    it('should handle empty tie markers gracefully', () => {
      // This is malformed but should not crash
      const result = parser.parse('4/4 | C[{8__8}3 4 4] |');
      // Should either parse correctly or have validation error, but not crash
      expect(result.grid).toBeDefined();
    });
  });

  describe('Cross-measure ties with tuplets', () => {
    it('should handle tie from previous measure into tuplet', () => {
      const result = parser.parse('4/4 | C[4 4 4 4_] | C[{_8 8 8}3 4 4 4] |');
      expect(result.errors).toHaveLength(0);
      
      const measure1Notes = result.grid.measures[0].chordSegments[0].beats.flatMap(b => b.notes);
      const measure2Notes = result.grid.measures[1].chordSegments[0].beats.flatMap(b => b.notes);
      
      // Last note of measure 1 should start tie
      expect(measure1Notes[3].tieStart).toBe(true);
      
      // First note of tuplet in measure 2 should end tie
      expect(measure2Notes[0].tuplet).toBeDefined();
      expect(measure2Notes[0].tieEnd).toBe(true);
    });

    it('should handle complex cross-measure pattern: 4_ | {_8 8 8_}3 _4', () => {
      const result = parser.parse('4/4 | C[4 4 4 4_] | C[{_8 8 8_}3 _4 4 4] |');
      expect(result.errors).toHaveLength(0);
      
      const measure1Notes = result.grid.measures[0].chordSegments[0].beats.flatMap(b => b.notes);
      const measure2Notes = result.grid.measures[1].chordSegments[0].beats.flatMap(b => b.notes);
      
      // Tie 1: measure1[3] → measure2[0] (into tuplet)
      expect(measure1Notes[3].tieStart).toBe(true);
      expect(measure2Notes[0].tieEnd).toBe(true);
      expect(measure2Notes[0].tuplet).toBeDefined();
      
      // Tie 2: measure2[2] → measure2[3] (from tuplet to quarter)
      expect(measure2Notes[2].tieStart).toBe(true);
      expect(measure2Notes[2].tuplet).toBeDefined();
      expect(measure2Notes[3].tieEnd).toBe(true);
      expect(measure2Notes[3].tuplet).toBeUndefined();
    });
  });
});
