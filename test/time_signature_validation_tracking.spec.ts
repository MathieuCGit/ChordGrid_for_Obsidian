import { ChordGridParser } from '../src/parser/ChordGridParser';

describe('Time Signature Validation: Current Metric Tracking', () => {
  let parser: ChordGridParser;

  beforeEach(() => {
    parser = new ChordGridParser();
  });

  describe('Basic time signature propagation', () => {
    test('should validate measures against current time signature after change', () => {
      // Bug case: 7/8 changes to 4/4, next measure should validate against 4/4
      const input = '7/8| D |4/4 G / C | D[4 4 88 4] |';
      const result = parser.parse(input);

      // Should have NO validation errors
      expect(result.errors).toHaveLength(0);
      
      // Verify structure
      expect(result.grid.timeSignature.numerator).toBe(7); // Global is 7/8
      expect(result.measures).toHaveLength(3);
      
      // Measure 1: uses global 7/8 (no rhythm to validate)
      expect(result.measures[0].timeSignature).toBeUndefined();
      
      // Measure 2: explicit change to 4/4 (no rhythm to validate in chord-only)
      expect(result.measures[1].timeSignature).toBeDefined();
      expect(result.measures[1].timeSignature?.numerator).toBe(4);
      
      // Measure 3: should validate against 4/4 (current), not 7/8 (global)
      expect(result.measures[2].timeSignature).toBeUndefined(); // No explicit change
      // If validated against 7/8: would expect 3.5 quarter-notes, found 4.0 -> ERROR
      // If validated against 4/4: would expect 4.0 quarter-notes, found 4.0 -> OK
    });

    test('should track time signature through multiple changes', () => {
      // 4/4 -> 3/4 -> 6/8, each followed by a measure without explicit change
      const input = `4/4| C[4 4 4 4] | D[4 4 4 4] |
        3/4 E[4 4 4] | F[4 4 4] |
        6/8 G[8 8 8 8 8 8] | A[8 8 8 8 8 8] |`;
      
      const result = parser.parse(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.measures).toHaveLength(6);
      
      // Measure 0: 4/4 with rhythm - validates against 4/4
      expect(result.measures[0].timeSignature).toBeUndefined(); // Uses global
      
      // Measure 1: continues 4/4 - validates against 4/4
      expect(result.measures[1].timeSignature).toBeUndefined();
      
      // Measure 2: explicit 3/4 - validates against 3/4
      expect(result.measures[2].timeSignature?.numerator).toBe(3);
      
      // Measure 3: continues 3/4 - validates against 3/4 (current)
      expect(result.measures[3].timeSignature).toBeUndefined();
      
      // Measure 4: explicit 6/8 - validates against 6/8
      expect(result.measures[4].timeSignature?.numerator).toBe(6);
      expect(result.measures[4].timeSignature?.denominator).toBe(8);
      
      // Measure 5: continues 6/8 - validates against 6/8 (current)
      expect(result.measures[5].timeSignature).toBeUndefined();
    });

    test('should fail validation when rhythm does not match current time signature', () => {
      // Change to 4/4, then provide 3 quarter notes (incomplete)
      const input = '7/8| D |4/4 G / C | D[4 4 4] |';
      const result = parser.parse(input);

      // Should have 1 error on measure 3
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].measureIndex).toBe(2); // Measure 3 (index 2)
      expect(result.errors[0].expectedQuarterNotes).toBe(4); // Expects 4/4
      expect(result.errors[0].foundQuarterNotes).toBe(3);
    });
  });

  describe('Time signature propagation with repeat markers', () => {
    test('should track time signature through % repeat markers', () => {
      const input = '4/4| C[4 4 4 4] |3/4 D[4 4 4] | % | E[4 4 4] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      expect(result.measures).toHaveLength(4);
      
      // Measure 0: 4/4
      expect(result.measures[0].timeSignature).toBeUndefined();
      
      // Measure 1: explicit 3/4
      expect(result.measures[1].timeSignature?.numerator).toBe(3);
      
      // Measure 2: % (clones measure 1 with 3/4)
      expect(result.measures[2].source).toBe('%');
      
      // Measure 3: continues with 3/4 (current after the change)
      expect(result.measures[3].timeSignature).toBeUndefined();
      // Should validate against 3/4, not 4/4
    });

    test('should track time signature through [chord%] repeat markers', () => {
      const input = '4/4| C[4 4 4 4] |3/4 D[4 4 4] | E[%] | F[4 4 4] |';
      const result = parser.parse(input);

      // E[%] clones the previous measure rhythm (D[4 4 4]) with new chord E
      // So it should have 3 quarter notes (3/4 time signature from measure 1)
      expect(result.errors).toHaveLength(0);
      expect(result.measures).toHaveLength(4);
      
      // Measure 1: explicit 3/4
      expect(result.measures[1].timeSignature?.numerator).toBe(3);
      
      // Measure 2: E[%] clones measure 1's rhythm with chord E
      // Should inherit 3/4 time signature for validation
      
      // Measure 3: should validate against 3/4 (current), not 4/4 (global)
      expect(result.measures[3].timeSignature).toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    test('should handle time signature change back to global metric', () => {
      // Start 4/4, change to 3/4, change back to 4/4
      const input = '4/4| C[4 4 4 4] |3/4 D[4 4 4] |4/4 E[4 4 4 4] | F[4 4 4 4] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      expect(result.measures).toHaveLength(4);
      
      // Measure 2: explicit back to 4/4
      expect(result.measures[2].timeSignature?.numerator).toBe(4);
      
      // Measure 3: continues with 4/4 (current)
      expect(result.measures[3].timeSignature).toBeUndefined();
    });

    test('should handle measures without rhythm after time signature change', () => {
      // Test that time signature propagates correctly even with empty/chord-only measures
      const input = `4/4| C[4 4 4 4] |3/4 D | E | F[4 4 4] |`;
      
      const result = parser.parse(input);

      // D and E are chord-only (no rhythm), F has rhythm that should validate against 3/4
      expect(result.errors).toHaveLength(0);
      expect(result.measures).toHaveLength(4);
      
      // Measure 1: explicit 3/4 change
      expect(result.measures[1].timeSignature?.numerator).toBe(3);
      
      // Measure 2: chord-only E, no explicit change
      expect(result.measures[2].timeSignature).toBeUndefined();
      
      // Measure 3: F with rhythm should validate against 3/4 (current), not 4/4 (global)
      expect(result.measures[3].timeSignature).toBeUndefined();
    });

    test('should handle complex sequence with multiple changes', () => {
      // Real-world scenario: song with multiple time signature changes
      const input = `7/8| Am[8 8 8 8 8 8 8] |
        4/4 C[4 4 4 4] | G[4 4 4 4] | Dm[4 4 4 4] |
        3/4 F[4 4 4] | C[4 4 4] |
        7/8 Bm[8 8 8 8 8 8 8] | Em[8 8 8 8 8 8 8] |`;
      
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      expect(result.measures).toHaveLength(8);
      
      // Verify time signatures
      expect(result.measures[0].timeSignature).toBeUndefined(); // 7/8 global
      expect(result.measures[1].timeSignature?.numerator).toBe(4); // Explicit 4/4
      expect(result.measures[2].timeSignature).toBeUndefined(); // Continues 4/4
      expect(result.measures[3].timeSignature).toBeUndefined(); // Continues 4/4
      expect(result.measures[4].timeSignature?.numerator).toBe(3); // Explicit 3/4
      expect(result.measures[5].timeSignature).toBeUndefined(); // Continues 3/4
      expect(result.measures[6].timeSignature?.numerator).toBe(7); // Explicit 7/8
      expect(result.measures[7].timeSignature).toBeUndefined(); // Continues 7/8
    });

    test('should detect error when rhythm changes but time signature does not', () => {
      // Change to 4/4, provide 5 quarter notes (too many)
      const input = '7/8| D |4/4 G / C | D[4 4 4 4 4] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].measureIndex).toBe(2);
      expect(result.errors[0].expectedQuarterNotes).toBe(4);
      expect(result.errors[0].foundQuarterNotes).toBe(5);
      expect(result.errors[0].message).toContain('4/4'); // Should mention 4/4, not 7/8
    });
  });

  describe('Chord-only mode compatibility', () => {
    test('should not validate chord-only measures but track time signature', () => {
      // Chord-only measures don't have rhythm, but time signature should propagate
      const input = '7/8| D |4/4 G | C | Dm |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      expect(result.measures).toHaveLength(4);
      
      // Measure 1: explicit 4/4
      expect(result.measures[1].timeSignature?.numerator).toBe(4);
      
      // Measures 2-3: chord-only, no explicit time signature
      expect(result.measures[2].timeSignature).toBeUndefined();
      expect(result.measures[3].timeSignature).toBeUndefined();
    });

    test('should validate mixed chord-only and rhythm measures correctly', () => {
      const input = '7/8| D |4/4 G | C[4 4 4 4] | Dm | E[4 4 4 4] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      expect(result.measures).toHaveLength(5);
      
      // Measures 2 and 4 have rhythm and should validate against 4/4 (current)
      expect(result.measures[2].beats.length).toBeGreaterThan(0);
      expect(result.measures[4].beats.length).toBeGreaterThan(0);
    });
  });

  describe('Backward compatibility', () => {
    test('should maintain undefined timeSignature for measures without explicit changes', () => {
      // Ensures existing code checking for undefined still works
      const input = '4/4| C[4 4 4 4] | D[4 4 4 4] |3/4 E[4 4 4] | F[4 4 4] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      
      // Only measures with explicit changes should have timeSignature defined
      expect(result.measures[0].timeSignature).toBeUndefined(); // Uses global
      expect(result.measures[1].timeSignature).toBeUndefined(); // Continues 4/4
      expect(result.measures[2].timeSignature).toBeDefined(); // Explicit 3/4
      expect(result.measures[3].timeSignature).toBeUndefined(); // Continues 3/4
    });
  });
});
