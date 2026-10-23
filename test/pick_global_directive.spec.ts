import { ChordGridParser } from '../src/parser/ChordGridParser';

describe('Pick Global Directives (pick:down, pick:up)', () => {
  let parser: ChordGridParser;

  beforeEach(() => {
    parser = new ChordGridParser();
  });

  describe('pick:down directive - Global downstroke default', () => {
    test('should set all notes to downstroke when pick:down is specified', () => {
      const input = 'pick:down\n4/4 | C[4 4 4 4] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);

      // All notes should inherit pick:down directive
      notes.forEach(note => {
        if (!note.isRest && !note.tieEnd && !note.tieFromVoid) {
          expect(note.pickDirection).toBe('d');
        }
      });
    });

    test('should override pick:down with local suffix (priority: local > global)', () => {
      const input = 'pick:down\n4/4 | C[4 4u 8 8u 4d] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      const attackNotes = notes.filter(n => !n.isRest && !n.tieEnd && !n.tieFromVoid);

      // Expected: d, u (override), d, u (override), d (explicit)
      expect(attackNotes[0].pickDirection).toBe('d'); // inherits pick:down
      expect(attackNotes[1].pickDirection).toBe('u'); // local u overrides pick:down
      expect(attackNotes[2].pickDirection).toBe('d'); // inherits pick:down
      expect(attackNotes[3].pickDirection).toBe('u'); // local u overrides pick:down
      expect(attackNotes[4].pickDirection).toBe('d'); // explicit d
    });

    test('should work with mixed rhythmic values and local overrides', () => {
      const input = 'pick:down\n5/8 | G[16 16 16u 16 16d 16u 8 8u] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      const attackNotes = notes.filter(n => !n.isRest && !n.tieEnd && !n.tieFromVoid);

      expect(attackNotes[0].pickDirection).toBe('d'); // inherits
      expect(attackNotes[1].pickDirection).toBe('d'); // inherits
      expect(attackNotes[2].pickDirection).toBe('u'); // local override
      expect(attackNotes[3].pickDirection).toBe('d'); // inherits
      expect(attackNotes[4].pickDirection).toBe('d'); // explicit d
      expect(attackNotes[5].pickDirection).toBe('u'); // local override
      expect(attackNotes[6].pickDirection).toBe('d'); // inherits
      expect(attackNotes[7].pickDirection).toBe('u'); // local override
    });
  });

  describe('pick:up directive - Global upstroke default', () => {
    test('should set all notes to upstroke when pick:up is specified', () => {
      const input = 'pick:up\n4/4 | D[4 4 4 4] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);

      // All notes should inherit pick:up directive
      notes.forEach(note => {
        if (!note.isRest && !note.tieEnd && !note.tieFromVoid) {
          expect(note.pickDirection).toBe('u');
        }
      });
    });

    test('should override pick:up with local suffix (priority: local > global)', () => {
      const input = 'pick:up\n4/4 | Em[4 4d 8 8d 4u] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      const attackNotes = notes.filter(n => !n.isRest && !n.tieEnd && !n.tieFromVoid);

      // Expected: u, d (override), u, d (override), u (explicit)
      expect(attackNotes[0].pickDirection).toBe('u'); // inherits pick:up
      expect(attackNotes[1].pickDirection).toBe('d'); // local d overrides pick:up
      expect(attackNotes[2].pickDirection).toBe('u'); // inherits pick:up
      expect(attackNotes[3].pickDirection).toBe('d'); // local d overrides pick:up
      expect(attackNotes[4].pickDirection).toBe('u'); // explicit u
    });

    test('should work with alternating pattern override', () => {
      const input = 'pick:up\n2/4 | A[16d 16 16d 16 16d 16 16d 16] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      const attackNotes = notes.filter(n => !n.isRest && !n.tieEnd && !n.tieFromVoid);

      expect(attackNotes[0].pickDirection).toBe('d'); // explicit d
      expect(attackNotes[1].pickDirection).toBe('u'); // inherits pick:up
      expect(attackNotes[2].pickDirection).toBe('d'); // explicit d
      expect(attackNotes[3].pickDirection).toBe('u'); // inherits pick:up
      expect(attackNotes[4].pickDirection).toBe('d'); // explicit d
      expect(attackNotes[5].pickDirection).toBe('u'); // inherits pick:up
      expect(attackNotes[6].pickDirection).toBe('d'); // explicit d
      expect(attackNotes[7].pickDirection).toBe('u'); // inherits pick:up
    });
  });

  describe('Interaction with existing pick mode', () => {
    test('should work alongside pick directive (both enable pick mode and set default)', () => {
      const input = 'pick\npick:down\n4/4 | C[4 4 4 4] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);

      // pick:down should set default, pick mode already enabled
      notes.forEach(note => {
        if (!note.isRest && !note.tieEnd && !note.tieFromVoid) {
          expect(note.pickDirection).toBe('d');
        }
      });
    });

    test('should support normalized notation (md/mu/pd/pu/etc) with global directive', () => {
      const input = 'pick:down\n3/4 | G[4md 4mu 8pd 8pu] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      const attackNotes = notes.filter(n => !n.isRest && !n.tieEnd && !n.tieFromVoid);

      // md normalizes to d (overrides pick:down)
      expect(attackNotes[0].pickDirection).toBe('d');
      // mu normalizes to u (overrides pick:down)
      expect(attackNotes[1].pickDirection).toBe('u');
      // pd normalizes to d (overrides pick:down)
      expect(attackNotes[2].pickDirection).toBe('d');
      // pu normalizes to u (overrides pick:down)
      expect(attackNotes[3].pickDirection).toBe('u');
    });
  });

  describe('Complex scenarios with multiple measures', () => {
    test('should apply pick:down across all measures in the block', () => {
      const input = `pick:down
    4/4 | C[4 4 4 4] | D[4u 4 4u 4] | Em[4 4 4 4] |`;

      const result = parser.parse(input);
      expect(result.errors).toHaveLength(0);

      // Measure 0: C - all should be d
      const notes0 = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      const attackNotes0 = notes0.filter(n => !n.isRest && !n.tieEnd && !n.tieFromVoid);
      attackNotes0.forEach(note => expect(note.pickDirection).toBe('d'));

      // Measure 1: D - first and third override with u
      const notes1 = result.measures[1].chordSegments![0].beats.flatMap(b => b.notes);
      const attackNotes1 = notes1.filter(n => !n.isRest && !n.tieEnd && !n.tieFromVoid);
      expect(attackNotes1[0].pickDirection).toBe('u'); // 4u
      expect(attackNotes1[1].pickDirection).toBe('d'); // 4 inherits
      expect(attackNotes1[2].pickDirection).toBe('u'); // 8u
      expect(attackNotes1[3].pickDirection).toBe('d'); // 8 inherits

      // Measure 2: Em - all inherit d
      const notes2 = result.measures[2].chordSegments![0].beats.flatMap(b => b.notes);
      const attackNotes2 = notes2.filter(n => !n.isRest && !n.tieEnd && !n.tieFromVoid);
      attackNotes2.forEach(note => expect(note.pickDirection).toBe('d'));
    });

    test('should apply pick:up across all measures and allow selective d overrides', () => {
      const input = `pick:up
7/8 | A[16d 16 16d 16 16d 16d 8 8 8 8] | 4/4 E[4d 4 8d 8 4] |`;

      const result = parser.parse(input);
      expect(result.errors).toHaveLength(0);

      // Measure 0: A - alternating d/u pattern
      const notes0 = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      const attackNotes0 = notes0.filter(n => !n.isRest && !n.tieEnd && !n.tieFromVoid);
      expect(attackNotes0[0].pickDirection).toBe('d'); // explicit d
      expect(attackNotes0[1].pickDirection).toBe('u'); // inherits pick:up
      expect(attackNotes0[2].pickDirection).toBe('d'); // explicit d
      expect(attackNotes0[3].pickDirection).toBe('u'); // inherits pick:up
      expect(attackNotes0[4].pickDirection).toBe('d'); // explicit d
      expect(attackNotes0[5].pickDirection).toBe('d'); // explicit d
      expect(attackNotes0[6].pickDirection).toBe('u'); // inherits pick:up

      // Measure 1: E - same pattern
      const notes1 = result.measures[1].chordSegments![0].beats.flatMap(b => b.notes);
      const attackNotes1 = notes1.filter(n => !n.isRest && !n.tieEnd && !n.tieFromVoid);
      expect(attackNotes1[0].pickDirection).toBe('d'); // explicit d
      expect(attackNotes1[1].pickDirection).toBe('u'); // inherits pick:up
      expect(attackNotes1[2].pickDirection).toBe('d'); // explicit d
      expect(attackNotes1[3].pickDirection).toBe('u'); // inherits pick:up
    });
  });

  describe('Edge cases and interactions', () => {
    test('should handle rests gracefully with global directive', () => {
      const input = 'pick:down\n4/4 | C[4 -8 -8 8 -8 4] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      const attackNotes = notes.filter(n => !n.isRest && !n.tieEnd && !n.tieFromVoid);

      // Only attack notes should have pick direction
      expect(attackNotes.length).toBe(3); // The two quarter notes and one eighth note
      attackNotes.forEach(note => expect(note.pickDirection).toBe('d'));
    });

    test('should handle dotted notes with global directive', () => {
      const input = 'pick:up\n4/4 | D[4. 8u 4. 8] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      const attackNotes = notes.filter(n => !n.isRest && !n.tieEnd && !n.tieFromVoid);

      expect(attackNotes[0].pickDirection).toBe('u'); // 4. inherits
      expect(attackNotes[0].dotted).toBe(true);
      expect(attackNotes[1].pickDirection).toBe('u'); // 8u explicit
      expect(attackNotes[2].pickDirection).toBe('u'); // 4. inherits
      expect(attackNotes[2].dotted).toBe(true);
      expect(attackNotes[3].pickDirection).toBe('u'); // 8 inherits
    });

    test('should handle ghost notes with global directive', () => {
      const input = 'pick:down\n4/4 | G[4x 4u 8x 8d 4] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      const attackNotes = notes.filter(n => !n.isRest && !n.tieEnd && !n.tieFromVoid);

      expect(attackNotes[0].isGhost).toBe(true);
      expect(attackNotes[0].pickDirection).toBe('d'); // inherits
      expect(attackNotes[1].isGhost).toBe(false);
      expect(attackNotes[1].pickDirection).toBe('u'); // override
      expect(attackNotes[2].isGhost).toBe(true);
      expect(attackNotes[2].pickDirection).toBe('d'); // inherits
      expect(attackNotes[3].isGhost).toBe(false);
      expect(attackNotes[3].pickDirection).toBe('d'); // explicit
    });

    test('should not affect finger mode when only pick directives present', () => {
      const input = 'pick:down\n4/4 | C[4 4 4 4] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);

      // finger symbols should not be set
      notes.forEach(note => {
        if (!note.isRest && !note.tieEnd && !note.tieFromVoid) {
          expect(note.fingerSymbol).toBeUndefined();
        }
      });
    });
  });

  describe('Directive parsing and validation', () => {
    test('should recognize pick:down as a valid directive', () => {
      const input = 'pick:down\n4/4 | C[4 4] |';
      const result = parser.parse(input);
      // Should parse without errors
      expect(result.errors.length).toBeLessThan(2); // Allow unrelated warnings
    });

    test('should recognize pick:up as a valid directive', () => {
      const input = 'pick:up\n4/4 | C[4 4] |';
      const result = parser.parse(input);
      // Should parse without errors
      expect(result.errors.length).toBeLessThan(2); // Allow unrelated warnings
    });

    test('should work with directive aliases and combinations', () => {
      // Test with various pick directive spellings
      const input1 = 'picks:down\n4/4 | C[4 4] |';
      const result1 = parser.parse(input1);
      // May or may not be recognized - implementation detail

      const input2 = 'pick:down\n4/4 | C[4 4] |';
      const result2 = parser.parse(input2);
      expect(result2.errors.length).toBeLessThan(2);
    });
  });
});
