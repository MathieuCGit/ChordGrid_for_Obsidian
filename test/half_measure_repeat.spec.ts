/**
 * Test case for half-measure repeat notation with %
 * Issue: Parser doesn't handle [%] when used with half measures split by "/"
 */

import { ChordGridParser } from '../src/parser/ChordGridParser';

describe('Half-Measure Repeat Notation ([%])', () => {
  let parser: ChordGridParser;

  beforeEach(() => {
    parser = new ChordGridParser();
  });

  test('should handle [%] in half measures with slash separator (actual user input)', () => {
    // User's actual input (with proper syntax - no space between chord and brackets)
    const input = `4/4 ||: Em[4 88] / B7[%] | G[%]  / A[%]  | E[4]G[8]B[8] A[4] G[4] | E[4 -4 -4 -4] :||`;
    
    const result = parser.parse(input);
    console.log('Parse result errors:', result.errors);
    
    expect(result.errors.length).toBe(0);
    expect(result.measures.length).toBe(4);
    
    // Measure 1: Em[4 88] / B7[%]
    const measure1 = result.measures[0];
    expect(measure1.beats.length).toBe(4); // 4 quarter-notes
    expect(measure1.chordSegments.length).toBe(2);
    expect(measure1.chordSegments[0].chord).toBe('Em');
    expect(measure1.chordSegments[1].chord).toBe('B7');
    
    // Measure 2: G[%] / A[%]
    const measure2 = result.measures[1];
    expect(measure2.beats.length).toBe(4); // 4 quarter-notes (repeated from B7)
    expect(measure2.chordSegments.length).toBe(2);
    expect(measure2.chordSegments[0].chord).toBe('G');
    expect(measure2.chordSegments[1].chord).toBe('A');
  });

  test('should detect and warn about invalid syntax like "G [%]" with space', () => {
    // Invalid: space between chord and brackets
    // The parser will log a console.error about this invalid syntax
    const input = `4/4 | Em[4] G [%] |`;
    
    // Should still parse, and log a warning about invalid syntax
    const result = parser.parse(input);
    
    // Even with invalid syntax mixed in, the valid part (Em[4]) should be parsed
    expect(result.measures.length).toBeGreaterThan(0);
  });

  test('should repeat rhythm of previous half measure when using [%]', () => {
    const input = `4/4 Em[4 88] / B7[%]`;
    
    const result = parser.parse(input);
    
    // Should have one measure
    expect(result.measures.length).toBe(1);
    
    const measure = result.measures[0];
    // Should have multiple chord segments (half measures)
    expect(measure.chordSegments).toBeDefined();
    expect(measure.chordSegments.length).toBeGreaterThanOrEqual(2);
    
    // First segment: Em with [4 88]
    const firstSegment = measure.chordSegments[0];
    expect(firstSegment.chord).toBe('Em');
    expect(firstSegment.beats.length).toBeGreaterThan(0);
    
    // Second segment: B7 with same rhythm as first (from [%])
    const secondSegment = measure.chordSegments[1];
    expect(secondSegment.chord).toBe('B7');
    expect(secondSegment.beats.length).toBe(firstSegment.beats.length);
  });

  test('chord-only mode should still work with half measures', () => {
    const input = `4/4 Em / G | C / D`;
    
    const result = parser.parse(input);
    expect(result.errors.length).toBe(0);
    expect(result.measures.length).toBe(2);
  });
  
  test('should propagate [%] across multiple measures', () => {
    // Test that % repeats rhythm even across measure boundaries
    const input = `4/4 Em[4 88] / B7[%] | G[%] / A[%]`;
    
    const result = parser.parse(input);
    expect(result.errors.length).toBe(0);
    expect(result.measures.length).toBe(2);
    
    // Both measures should have 4 quarter-notes
    expect(result.measures[0].beats.length).toBe(4);
    expect(result.measures[1].beats.length).toBe(4);
  });
});
