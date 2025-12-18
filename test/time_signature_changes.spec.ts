/**
 * @file time_signature_changes.spec.ts
 * @description Tests for inline time signature changes
 * 
 * Feature: Allow time signature changes mid-grid
 * Syntax: "N/M " before measure content (e.g., "2/4 Em[2]")
 */

import { ChordGridParser } from '../src/parser/ChordGridParser';

describe('Time Signature Changes', () => {
  let parser: ChordGridParser;

  beforeEach(() => {
    parser = new ChordGridParser();
  });

  describe('Basic inline time signature changes', () => {
    it('should parse inline time signature change', () => {
      const input = '4/4 | Am[4 4 4 4] | 2/4 C[2] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      expect(result.measures).toHaveLength(2);

      // First measure uses global 4/4
      expect(result.measures[0].timeSignature).toBeUndefined();

      // Second measure has explicit 2/4
      expect(result.measures[1].timeSignature).toEqual({
        numerator: 2,
        denominator: 4,
        beatsPerMeasure: 2,
        beatUnit: 4,
        groupingMode: 'space-based'
      });
    });

    it('should handle user reported case: 4/4 to 2/4', () => {
      const input = '4/4 | Em | Em | C / G | D / Em | 2/4 Em[2] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      expect(result.measures).toHaveLength(5);

      // First 4 measures use global 4/4
      expect(result.measures[0].timeSignature).toBeUndefined();
      expect(result.measures[1].timeSignature).toBeUndefined();
      expect(result.measures[2].timeSignature).toBeUndefined();
      expect(result.measures[3].timeSignature).toBeUndefined();

      // Fifth measure changes to 2/4
      expect(result.measures[4].timeSignature).toEqual({
        numerator: 2,
        denominator: 4,
        beatsPerMeasure: 2,
        beatUnit: 4,
        groupingMode: 'space-based'
      });
    });

    it('should handle multiple time signature changes', () => {
      const input = '4/4 | Am[4 4 4 4] | 3/4 C[4 4 4] | 2/4 D[2] | 4/4 Em[4 4 4 4] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      expect(result.measures).toHaveLength(4);

      // First measure: global 4/4
      expect(result.measures[0].timeSignature).toBeUndefined();

      // Second measure: 3/4
      expect(result.measures[1].timeSignature?.numerator).toBe(3);
      expect(result.measures[1].timeSignature?.denominator).toBe(4);

      // Third measure: 2/4
      expect(result.measures[2].timeSignature?.numerator).toBe(2);
      expect(result.measures[2].timeSignature?.denominator).toBe(4);

      // Fourth measure: back to 4/4
      expect(result.measures[3].timeSignature?.numerator).toBe(4);
      expect(result.measures[3].timeSignature?.denominator).toBe(4);
    });
  });

  describe('Validation with different time signatures', () => {
    it('should validate each measure with its effective time signature', () => {
      const input = '4/4 | Am[4 4] | 2/4 C[2] |'; // First measure is WRONG (only 2 quarters)
      const result = parser.parse(input);

      // First measure should have error (expected 4, found 2)
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('expected 4 quarter-notes');
      expect(result.errors[0].message).toContain('found 2.000');
      expect(result.errors[0].message).toContain('4/4'); // Show time signature in error
      expect(result.errors[0].measureIndex).toBe(0);

      // Second measure should be valid (2/4 with half note)
      expect(result.measures[1].beats.length).toBeGreaterThan(0);
    });

    it('should validate correct measures with different time signatures', () => {
      const input = '4/4 | Am[4 4 4 4] | 3/4 C[4 4 4] | 2/4 D[2] |';
      const result = parser.parse(input);

      // All measures should be valid
      expect(result.errors).toHaveLength(0);
    });

    it('should show correct time signature in error message', () => {
      const input = '4/4 | Am[4 4 4 4] | 3/4 C[4 4] |'; // Second measure wrong (expected 3 quarters)
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('expected 3 quarter-notes');
      expect(result.errors[0].message).toContain('3/4');
      expect(result.errors[0].measureIndex).toBe(1);
    });
  });

  describe('Time signature with grouping mode', () => {
    it('should parse time signature with grouping mode', () => {
      const input = '4/4 | Am[4 4 4 4] | 6/8 ternary C[8 8 8 8 8 8] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      expect(result.measures[1].timeSignature).toEqual({
        numerator: 6,
        denominator: 8,
        beatsPerMeasure: 6,
        beatUnit: 8,
        groupingMode: 'ternary'
      });
    });

    it('should handle binary mode in time signature change', () => {
      const input = '6/8 | Am[8 8 8 8 8 8] | 4/4 binary C[4 4 4 4] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      expect(result.measures[1].timeSignature).toEqual({
        numerator: 4,
        denominator: 4,
        beatsPerMeasure: 4,
        beatUnit: 4,
        groupingMode: 'binary'
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle time signature change in chord-only mode', () => {
      const input = '4/4 | Am | 2/4 C | 3/4 D |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      expect(result.measures).toHaveLength(3);

      // All measures are chord-only, no validation errors
      expect((result.measures[0] as any).__isChordOnlyMode).toBe(true);
      expect((result.measures[1] as any).__isChordOnlyMode).toBe(true);
      expect((result.measures[2] as any).__isChordOnlyMode).toBe(true);

      // Time signatures should be stored
      expect(result.measures[0].timeSignature).toBeUndefined();
      expect(result.measures[1].timeSignature?.numerator).toBe(2);
      expect(result.measures[2].timeSignature?.numerator).toBe(3);
    });

    it('should handle time signature change with repeat notation', () => {
      const input = '4/4 ||: Am[4 4 4 4] | 2/4 C[2] :||';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      expect(result.measures).toHaveLength(2);
      expect((result.measures[0] as any).isRepeatStart).toBe(true);
      expect((result.measures[1] as any).isRepeatEnd).toBe(true);
      expect(result.measures[1].timeSignature?.numerator).toBe(2);
    });

    it('should handle time signature change with % repeat', () => {
      const input = '4/4 | Am[4 4 4 4] | 2/4 C[2] | % |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      expect(result.measures).toHaveLength(3);

      // Third measure is a repeat of second (2/4 C[2])
      expect(result.measures[2].isRepeat).toBe(true);
      expect(result.measures[2].chord).toBe('C');

      // Repeat SHOULD inherit time signature from the cloned measure
      expect(result.measures[2].timeSignature).toEqual({
        numerator: 2,
        denominator: 4,
        beatsPerMeasure: 2,
        beatUnit: 4,
        groupingMode: 'space-based'
      });
    });

    it('should handle complex example with multiple features', () => {
      const input = '4/4 ||: Am[4 4 4 4] | C[4 4 4 4] | 3/4 G[4 4 4] | 2/4 D[2] :||';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      expect(result.measures).toHaveLength(4);

      // Check repeat markers
      expect((result.measures[0] as any).isRepeatStart).toBe(true);
      expect((result.measures[3] as any).isRepeatEnd).toBe(true);

      // Check time signatures
      expect(result.measures[0].timeSignature).toBeUndefined(); // Uses global 4/4
      expect(result.measures[1].timeSignature).toBeUndefined(); // Still 4/4
      expect(result.measures[2].timeSignature?.numerator).toBe(3); // Changes to 3/4
      expect(result.measures[3].timeSignature?.numerator).toBe(2); // Changes to 2/4
    });
  });

  describe('Compound time signatures', () => {
    it('should handle change to compound time (6/8)', () => {
      const input = '4/4 | Am[4 4 4 4] | 6/8 C[8 8 8 8 8 8] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      expect(result.measures[1].timeSignature).toEqual({
        numerator: 6,
        denominator: 8,
        beatsPerMeasure: 6,
        beatUnit: 8,
        groupingMode: 'space-based'
      });
    });

    it('should handle change from compound to simple time', () => {
      const input = '6/8 | Am[8 8 8 8 8 8] | 4/4 C[4 4 4 4] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      expect(result.measures[1].timeSignature?.numerator).toBe(4);
      expect(result.measures[1].timeSignature?.denominator).toBe(4);
    });

    it('should validate compound time correctly', () => {
      const input = '4/4 | Am[4 4 4 4] | 9/8 C[8 8 8 8 8 8 8 8 8] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
    });
  });
});

