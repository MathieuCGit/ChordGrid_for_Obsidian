import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

/**
 * Regression tests for time signature positioning on line starts
 * Bug: When a line break and time signature change occurred together,
 * the time signature was drawn INSIDE the measure (after barline) 
 * instead of BEFORE the barline like on the first line.
 * 
 * Fix: Time signatures on line starts (not first line) are now drawn 
 * BEFORE the barline, while mid-line changes remain AFTER the barline.
 */
describe('Time Signature Positioning: Line Start vs Mid-Line', () => {
  let parser: ChordGridParser;
  let renderer: SVGRenderer;

  beforeEach(() => {
    parser = new ChordGridParser();
    renderer = new SVGRenderer();
  });

  describe('Line start positioning (before barline)', () => {
    test('should mark time signature for display at line start with metric change', () => {
      const input = `7/8| D |4/4 G / C | D |
|7/8 D |4/4 G / C | Em |`;
      
      const result = parser.parse(input);
      
      expect(result.errors).toEqual([]);
      expect(result.measures.length).toBe(6);
      
      // First line, first measure: uses global 7/8
      expect(result.grid.timeSignature.numerator).toBe(7);
      
      // First line, second measure: 4/4 (change)
      expect(result.measures[1].timeSignature?.numerator).toBe(4);
      
      // Second line, first measure: 7/8 (back to different metric at line start)
      expect(result.measures[3].timeSignature?.numerator).toBe(7);
      
      // Second line, second measure: 4/4 (change again)
      expect(result.measures[4].timeSignature?.numerator).toBe(4);
    });

    test('should handle line break with time signature in chord-only mode', () => {
      const input = `4/4 | C | G |
|3/4 Am | F ||`;
      
      const result = parser.parse(input);
      
      expect(result.errors).toEqual([]);
      
      // All measures should be chord-only
      expect((result.measures[0] as any).__isChordOnlyMode).toBe(true);
      expect((result.measures[1] as any).__isChordOnlyMode).toBe(true);
      expect((result.measures[2] as any).__isChordOnlyMode).toBe(true);
      
      // Second line first measure should have 3/4 time signature
      expect(result.measures[2].timeSignature?.numerator).toBe(3);
      expect(result.measures[2].timeSignature?.denominator).toBe(4);
    });

    test('should handle multiple line breaks with alternating time signatures', () => {
      const input = `4/4 | C | G |
|3/4 Am | F |
|4/4 C | G |
|3/4 Am ||`;
      
      const result = parser.parse(input);
      
      expect(result.errors).toEqual([]);
      expect(result.measures.length).toBe(7);
      
      // Check time signatures at line starts
      expect(result.grid.timeSignature.numerator).toBe(4); // Global metric
      expect(result.measures[2].timeSignature?.numerator).toBe(3); // Line 2
      expect(result.measures[4].timeSignature?.numerator).toBe(4); // Line 3
      expect(result.measures[6].timeSignature?.numerator).toBe(3); // Line 4
    });
  });

  describe('Mid-line positioning (after barline)', () => {
    test('should mark time signature for mid-line change', () => {
      const input = '4/4| C | 3/4 G | 5/8 Am | C |';
      
      const result = parser.parse(input);
      
      expect(result.errors).toEqual([]);
      expect(result.measures.length).toBe(4);
      
      // First measure: uses global 4/4
      expect(result.grid.timeSignature.numerator).toBe(4);
      
      // Second measure: 3/4 (mid-line change, should be marked)
      expect(result.measures[1].timeSignature?.numerator).toBe(3);
      
      // Third measure: 5/8 (mid-line change, should be marked)
      expect(result.measures[2].timeSignature?.numerator).toBe(5);
    });

    test('should handle mid-line change in rhythm notation mode', () => {
      const input = '4/4| C[4444] | 3/4 G[444] | 4/4 Am[4444] |';
      
      const result = parser.parse(input);
      
      expect(result.errors).toEqual([]);
      expect(result.measures.length).toBe(3);
      
      // All measures should have rhythm notation (not chord-only)
      expect((result.measures[0] as any).__isChordOnlyMode).toBeFalsy();
      expect((result.measures[1] as any).__isChordOnlyMode).toBeFalsy();
      expect((result.measures[2] as any).__isChordOnlyMode).toBeFalsy();
      
      // Check time signature changes
      expect(result.measures[1].timeSignature?.numerator).toBe(3);
      expect(result.measures[2].timeSignature?.numerator).toBe(4);
    });
  });

  describe('Mixed line start and mid-line changes', () => {
    test('should handle both line start and mid-line time signature changes', () => {
      const input = `4/4| C | 3/4 G |
|4/4 Am | 5/8 F | 4/4 C ||`;
      
      const result = parser.parse(input);
      
      expect(result.errors).toEqual([]);
      expect(result.measures.length).toBe(5);
      
      // Line 1, measure 1: uses global 4/4
      expect(result.grid.timeSignature.numerator).toBe(4);
      
      // Line 1, measure 2: 3/4 (mid-line change)
      expect(result.measures[1].timeSignature?.numerator).toBe(3);
      
      // Line 2, measure 1: 4/4 (line start, back to different metric)
      expect(result.measures[2].timeSignature?.numerator).toBe(4);
      
      // Line 2, measure 2: 5/8 (mid-line change)
      expect(result.measures[3].timeSignature?.numerator).toBe(5);
      
      // Line 2, measure 3: 4/4 (mid-line change back)
      expect(result.measures[4].timeSignature?.numerator).toBe(4);
    });

    test('should handle complex real-world example from bug report', () => {
      const input = `7/8| D |4/4 G / C | D |
|7/8 D |4/4 G / C | Em |`;
      
      const result = parser.parse(input);
      
      expect(result.errors).toEqual([]);
      expect(result.measures.length).toBe(6);
      
      // Line 1
      expect(result.grid.timeSignature.numerator).toBe(7); // Global 7/8
      expect(result.measures[1].timeSignature?.numerator).toBe(4); // 4/4 mid-line change
      expect(result.measures[2].timeSignature).toBeUndefined(); // No change (continues 4/4)
      
      // Line 2
      expect(result.measures[3].timeSignature?.numerator).toBe(7); // 7/8 at line start
      expect(result.measures[4].timeSignature?.numerator).toBe(4); // 4/4 mid-line change
      expect(result.measures[5].timeSignature).toBeUndefined(); // No change (continues 4/4)
    });
  });

  describe('Edge cases', () => {
    test('should not show time signature at line start if metric is same as global', () => {
      const input = `4/4| C | G |
| Am | F ||`;
      
      const result = parser.parse(input);
      
      expect(result.errors).toEqual([]);
      
      // Second line first measure should NOT have time signature 
      // (it's 4/4, same as global)
      expect(result.measures[2].timeSignature).toBeUndefined();
    });

    test('should handle measures-per-line directive with time signature changes', () => {
      const input = `measures-per-line:2
4/4| C | G | 3/4 Am | F ||`;
      
      const result = parser.parse(input);
      
      expect(result.errors).toEqual([]);
      expect(result.measuresPerLine).toBe(2);
      
      // Third measure starts new line and has 3/4
      expect(result.measures[2].timeSignature?.numerator).toBe(3);
    });

    test('should not duplicate time signature on first measure', () => {
      const input = '7/8| D | G | C ||';
      
      const result = parser.parse(input);
      
      expect(result.errors).toEqual([]);
      
      // First measure uses global time signature
      expect(result.grid.timeSignature.numerator).toBe(7);
      expect(result.grid.timeSignature.denominator).toBe(8);
    });
  });
});
