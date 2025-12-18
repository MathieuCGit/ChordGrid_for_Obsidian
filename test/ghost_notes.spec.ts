import { ChordGridParser } from '../src/parser/ChordGridParser';
import { MusicAnalyzer } from '../src/analyzer/MusicAnalyzer';

declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;

describe('Ghost Notes', () => {
  let parser: ChordGridParser;
  let analyzer: MusicAnalyzer;

  beforeEach(() => {
    parser = new ChordGridParser();
    analyzer = new MusicAnalyzer();
  });

  describe('Parser - Basic Ghost Note Syntax', () => {
    it('should parse single ghost note: 4x', () => {
      const result = parser.parse('4/4 | C[4x444] |');
      expect(result.errors).toHaveLength(0);
      
      const measure = result.grid.measures[0];
      const notes = measure.chordSegments[0].beats[0].notes;
      
      expect(notes[0].value).toBe(4);
      expect((notes[0] as any).isGhost).toBe(true);
      expect(notes[1].value).toBe(4);
      expect((notes[1] as any).isGhost).toBe(false);
    });

    it('should parse multiple ghost notes: 8x 8x', () => {
      const result = parser.parse('4/4 | C[8x8x444] |');
      expect(result.errors).toHaveLength(0);
      
      const notes = result.grid.measures[0].chordSegments[0].beats[0].notes;
      
      expect(notes[0].value).toBe(8);
      expect((notes[0] as any).isGhost).toBe(true);
      expect(notes[1].value).toBe(8);
      expect((notes[1] as any).isGhost).toBe(true);
      expect(notes[2].value).toBe(4);
      expect((notes[2] as any).isGhost).toBe(false);
    });

    it('should parse ghost notes with different durations: 2x 4x 8x 16x', () => {
      const result = parser.parse('4/4 | C[2x4x8x16x16] |');
      expect(result.errors).toHaveLength(0);
      
      const notes = result.grid.measures[0].chordSegments[0].beats[0].notes;
      
      expect(notes[0].value).toBe(2);
      expect((notes[0] as any).isGhost).toBe(true);
      expect(notes[1].value).toBe(4);
      expect((notes[1] as any).isGhost).toBe(true);
      expect(notes[2].value).toBe(8);
      expect((notes[2] as any).isGhost).toBe(true);
      expect(notes[3].value).toBe(16);
      expect((notes[3] as any).isGhost).toBe(true);
      expect(notes[4].value).toBe(16);
      expect((notes[4] as any).isGhost).toBe(false);
    });
  });

  describe('Parser - Ghost Notes with Dotted Notes', () => {
    it('should parse dotted ghost note: 8.x', () => {
      const result = parser.parse('4/4 | C[8.x16444] |');
      expect(result.errors).toHaveLength(0);

      const notes = result.grid.measures[0].chordSegments[0].beats[0].notes;      expect(notes[0].value).toBe(8);
      expect(notes[0].dotted).toBe(true);
      expect((notes[0] as any).isGhost).toBe(true);
    });

    it('should parse multiple dotted ghost notes: 4.x 4.x', () => {
      const result = parser.parse('4/4 | C[4.x84.x8] |');
      expect(result.errors).toHaveLength(0);
      
      const notes = result.grid.measures[0].chordSegments[0].beats[0].notes;
      
      expect(notes[0].value).toBe(4);
      expect(notes[0].dotted).toBe(true);
      expect((notes[0] as any).isGhost).toBe(true);
      
      expect(notes[2].value).toBe(4);
      expect(notes[2].dotted).toBe(true);
      expect((notes[2] as any).isGhost).toBe(true);
    });
  });

  describe('Parser - Ghost Notes with Ties', () => {
    it('should parse ghost note with tie start: 8x_', () => {
      const result = parser.parse('4/4 | C[8x_8444] |');
      expect(result.errors).toHaveLength(0);

      const notes = result.grid.measures[0].chordSegments[0].beats[0].notes;      expect(notes[0].value).toBe(8);
      expect((notes[0] as any).isGhost).toBe(true);
      expect((notes[0] as any).tieStart).toBe(true);
    });

    it('should parse user example: 8x8_44x', () => {
      const result = parser.parse('4/4 | Em[8x8_444x] |');
      expect(result.errors).toHaveLength(0);

      const notes = result.grid.measures[0].chordSegments[0].beats[0].notes;      // 8x = ghost eighth note
      expect(notes[0].value).toBe(8);
      expect((notes[0] as any).isGhost).toBe(true);
      expect((notes[0] as any).tieStart).toBe(false);
      
      // 8_ = normal eighth with tie start
      expect(notes[1].value).toBe(8);
      expect((notes[1] as any).isGhost).toBe(false);
      expect((notes[1] as any).tieStart).toBe(true);
      
      // First 4 = normal quarter (receives tie)
      expect(notes[2].value).toBe(4);
      expect((notes[2] as any).isGhost).toBe(false);
      expect((notes[2] as any).tieEnd).toBe(true);
      
      // Second 4 = normal quarter
      expect(notes[3].value).toBe(4);
      expect((notes[3] as any).isGhost).toBe(false);
      
      // 4x = ghost quarter note
      expect(notes[4].value).toBe(4);
      expect((notes[4] as any).isGhost).toBe(true);
    });

    it('should parse complex ghost with dotted and tie: 8.x_', () => {
      const result = parser.parse('4/4 | C[8.x_16444] |');
      expect(result.errors).toHaveLength(0);

      const notes = result.grid.measures[0].chordSegments[0].beats[0].notes;      expect(notes[0].value).toBe(8);
      expect(notes[0].dotted).toBe(true);
      expect((notes[0] as any).isGhost).toBe(true);
      expect((notes[0] as any).tieStart).toBe(true);
    });

    it('should parse cross-measure tie with ghost notes', () => {
      const result = parser.parse('4/4 | C[24x_88x_] | [_8x] G[8444] |');
      expect(result.errors).toHaveLength(0);
      
      const measure1 = result.grid.measures[0].chordSegments[0].beats[0].notes;
      const measure2 = result.grid.measures[1].chordSegments[0].beats[0].notes;
      
      // Last note of measure 1: 8x_ (ghost eighth with tie)
      const lastNote = measure1[measure1.length - 1];
      expect(lastNote.value).toBe(8);
      expect((lastNote as any).isGhost).toBe(true);
      expect((lastNote as any).tieStart).toBe(true);
      
      // First note of measure 2: _8x (ghost eighth receiving tie)
      expect(measure2[0].value).toBe(8);
      expect((measure2[0] as any).isGhost).toBe(true);
      expect((measure2[0] as any).tieEnd).toBe(true);
    });
  });

  describe('Parser - Ghost Notes with Rests', () => {
    it('should parse ghost notes mixed with rests', () => {
      const result = parser.parse('4/4 | C[8x-84x-44] |');
      expect(result.errors).toHaveLength(0);

      const notes = result.grid.measures[0].chordSegments[0].beats[0].notes;      expect(notes[0].value).toBe(8);
      expect((notes[0] as any).isGhost).toBe(true);
      expect((notes[0] as any).isRest).toBe(false);
      
      expect(notes[1].value).toBe(8);
      expect((notes[1] as any).isRest).toBe(true);
      
      expect(notes[2].value).toBe(4);
      expect((notes[2] as any).isGhost).toBe(true);
      
      expect(notes[3].value).toBe(4);
      expect((notes[3] as any).isRest).toBe(true);
    });

    it('should NOT allow ghost rests: -8x (should fail or ignore x)', () => {
      // Ghost modifier should only apply to actual notes, not rests
      const result = parser.parse('4/4 | C[-8x 8 4 4 4] |');
      
      // Either parser should error, or ignore the 'x' on rest
      // For now, we test that rest is parsed correctly
      const notes = result.grid.measures[0].chordSegments[0].beats[0].notes;
      expect(notes[0].value).toBe(8);
      expect((notes[0] as any).isRest).toBe(true);
      // Ghost should be false or undefined for rests
      expect((notes[0] as any).isGhost).toBeFalsy();
    });
  });

  describe('Parser - Ghost Notes in Tuplets', () => {
    it('should parse ghost notes in triplet: {8x 8 8x}3', () => {
      const result = parser.parse('4/4 | C[{8x 8 8x}3 4 4 4] |');
      expect(result.errors).toHaveLength(0);
      
      const notes = result.grid.measures[0].chordSegments[0].beats[0].notes;
      
      // First triplet note: ghost
      expect(notes[0].value).toBe(8);
      expect((notes[0] as any).tuplet).toBeDefined();
      expect((notes[0] as any).isGhost).toBe(true);
      
      // Second triplet note: normal
      expect(notes[1].value).toBe(8);
      expect((notes[1] as any).isGhost).toBe(false);
      
      // Third triplet note: ghost
      expect(notes[2].value).toBe(8);
      expect((notes[2] as any).isGhost).toBe(true);
    });

    it('should parse all ghost notes in quintuplet: {16x 16x 16x 16x 16x}5', () => {
      const result = parser.parse('4/4 | C[{16x16x16x16x16x}5 4 4 4] |');
      expect(result.errors).toHaveLength(0);
      
      const notes = result.grid.measures[0].chordSegments[0].beats[0].notes;
      
      // All 5 tuplet notes should be ghost
      for (let i = 0; i < 5; i++) {
        expect(notes[i].value).toBe(16);
        expect((notes[i] as any).isGhost).toBe(true);
      }
    });
  });

  describe('Parser - Real World Examples', () => {
    it('should parse funk pattern with ghost notes', () => {
      const result = parser.parse('4/4 | Em[8.16] G[8x8_4x88] | D[8.16] C[8x8_4x88] |');
      expect(result.errors).toHaveLength(0);
      expect(result.grid.measures).toHaveLength(2);
    });

    it('should parse drum pattern with ghost notes', () => {
      const result = parser.parse('4/4 | C[8x88x88x88x8] |');
      expect(result.errors).toHaveLength(0);
      
      const notes = result.grid.measures[0].chordSegments[0].beats[0].notes;
      
      // Alternating ghost and normal
      expect((notes[0] as any).isGhost).toBe(true);
      expect((notes[1] as any).isGhost).toBe(false);
      expect((notes[2] as any).isGhost).toBe(true);
      expect((notes[3] as any).isGhost).toBe(false);
    });

    it('should parse complex pattern with all features', () => {
      const result = parser.parse('4/4 | Am[8.x16{4x44}32] |');
      expect(result.errors).toHaveLength(0);
      
      const notes = result.grid.measures[0].chordSegments[0].beats[0].notes;
      
      // 8.x = dotted ghost eighth
      expect(notes[0].value).toBe(8);
      expect(notes[0].dotted).toBe(true);
      expect((notes[0] as any).isGhost).toBe(true);
      
      // 16 = sixteenth
      expect(notes[1].value).toBe(16);
      expect((notes[1] as any).isGhost).toBe(false);
      
      // Tuplet with first note ghost (4x)
      expect(notes[2].value).toBe(4);
      expect((notes[2] as any).tuplet).toBeDefined();
      expect((notes[2] as any).isGhost).toBe(true);
      
      // Verify we have all notes
      expect(notes.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Duration Validation', () => {
    it('should validate measure duration with ghost notes', () => {
      const result = parser.parse('4/4 | C[4x 4x 4x 4x] |');
      expect(result.errors).toHaveLength(0);
      
      // Ghost notes should have same duration as normal notes
      // Duration validation happens at parse time
    });

    it('should validate dotted ghost notes duration', () => {
      const result = parser.parse('4/4 | C[4.x 8 4.x 8] |');
      expect(result.errors).toHaveLength(0);
      
      // Dotted ghost notes should count correctly in duration validation
    });
  });
});
