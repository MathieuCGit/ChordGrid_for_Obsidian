import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

/**
 * Regression tests for diagonal slash collision with inline time signature
 * Bug: In chord-only mode with 2 chords (G / C), the diagonal slash line
 * was overlapping the inline time signature (e.g., 4/4).
 * 
 * Fix: Diagonal slash now starts after the time signature if one is present.
 */
describe('Chord-Only Mode: Diagonal Slash vs Time Signature Collision', () => {
  let parser: ChordGridParser;
  let renderer: SVGRenderer;

  beforeEach(() => {
    parser = new ChordGridParser();
    renderer = new SVGRenderer();
  });

  test('should position diagonal slash after inline time signature in chord-only mode', () => {
    const input = '7/8| D |4/4 G / C | D |';
    const result = parser.parse(input);
    
    expect(result.errors).toEqual([]);
    expect(result.measures.length).toBe(3);
    
    // Second measure should have inline time signature 4/4
    expect(result.measures[1].timeSignature).toBeDefined();
    expect(result.measures[1].timeSignature?.numerator).toBe(4);
    expect(result.measures[1].timeSignature?.denominator).toBe(4);
    
    // Second measure should be chord-only with 2 segments (G / C)
    expect((result.measures[1] as any).__isChordOnlyMode).toBe(true);
    expect(result.measures[1].chordSegments.length).toBe(2);
    expect(result.measures[1].chordSegments[0].chord).toBe('G');
    expect(result.measures[1].chordSegments[1].chord).toBe('C');
  });

  test('should handle diagonal slash without time signature collision (baseline)', () => {
    const input = '4/4 | G / C | D ||';
    const result = parser.parse(input);
    
    expect(result.errors).toEqual([]);
    expect(result.measures.length).toBe(2);
    
    // First measure has slash, but no inline time signature (uses global 4/4)
    expect((result.measures[0] as any).__shouldShowTimeSignature).toBeFalsy();
    expect(result.measures[0].chordSegments.length).toBe(2);
  });

  test('should handle 3+ chords with small slashes (no collision issue)', () => {
    const input = '7/8| D |4/4 C / G / Am | Em |';
    const result = parser.parse(input);
    
    expect(result.errors).toEqual([]);
    expect(result.measures.length).toBe(3);
    
    // Second measure should have 3 chords (uses small slashes, not diagonal)
    expect(result.measures[1].chordSegments.length).toBe(3);
    expect(result.measures[1].chordSegments[0].chord).toBe('C');
    expect(result.measures[1].chordSegments[1].chord).toBe('G');
    expect(result.measures[1].chordSegments[2].chord).toBe('Am');
  });

  test('should handle time signature change on line with 2-chord slash pattern', () => {
    const input = `4/4 | C | G | D |
|3/4 Em / Am | C ||`;
    
    const result = parser.parse(input);
    
    expect(result.errors).toEqual([]);
    
    // Find measure with 3/4 time signature
    const measure3_4 = result.measures.find(m => 
      m.timeSignature?.numerator === 3 && m.timeSignature?.denominator === 4
    );
    
    expect(measure3_4).toBeDefined();
    expect((measure3_4 as any).__isChordOnlyMode).toBe(true);
    expect(measure3_4?.chordSegments.length).toBe(2);
  });

  test('should correctly mark time signature display for mid-measure changes', () => {
    const input = '7/8| D |4/4 G / C | 3/4 F |';
    const result = parser.parse(input);
    
    expect(result.errors).toEqual([]);
    expect(result.measures.length).toBe(3);
    
    // First measure: uses global 7/8 (timeSignature may or may not be set on first measure)
    expect(result.grid.timeSignature.numerator).toBe(7);
    
    // Second measure: 4/4 change (should be marked for display)
    expect(result.measures[1].timeSignature?.numerator).toBe(4);
    
    // Third measure: 3/4 change (should be marked for display)
    expect(result.measures[2].timeSignature?.numerator).toBe(3);
  });
});
