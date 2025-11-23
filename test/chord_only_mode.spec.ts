import { ChordGridParser } from '../src/parser/ChordGridParser';

describe('Chord-Only Mode Parsing', () => {
  let parser: ChordGridParser;

  beforeEach(() => {
    parser = new ChordGridParser();
  });

  test('should detect chord-only mode for simple chord sequence', () => {
    const input = '4/4 | C | Am | Em | G ||';
    const result = parser.parse(input);

    expect(result.measures.length).toBe(4);
    
    // Check first measure
    expect((result.measures[0] as any).__isChordOnlyMode).toBe(true);
    expect(result.measures[0].chord).toBe('C');
    expect(result.measures[0].chordSegments.length).toBe(1);
    expect(result.measures[0].chordSegments[0].chord).toBe('C');
    expect(result.measures[0].chordSegments[0].beats.length).toBe(0);
    
    // Check second measure
    expect((result.measures[1] as any).__isChordOnlyMode).toBe(true);
    expect(result.measures[1].chord).toBe('Am');
    
    // Check third measure
    expect((result.measures[2] as any).__isChordOnlyMode).toBe(true);
    expect(result.measures[2].chord).toBe('Em');
    
    // Check fourth measure
    expect((result.measures[3] as any).__isChordOnlyMode).toBe(true);
    expect(result.measures[3].chord).toBe('G');
  });

  test('should detect slash chords in chord-only mode', () => {
    const input = '4/4 | C | Em / G | F ||';
    const result = parser.parse(input);

    expect(result.measures.length).toBe(3);
    
    // First measure: simple chord
    expect((result.measures[0] as any).__isChordOnlyMode).toBe(true);
    expect(result.measures[0].chord).toBe('C');
    expect(result.measures[0].chordSegments.length).toBe(1);
    
    // Second measure: two chords separated by slash
    expect((result.measures[1] as any).__isChordOnlyMode).toBe(true);
    expect(result.measures[1].chord).toBe('Em');
    expect(result.measures[1].chordSegments.length).toBe(2);
    expect(result.measures[1].chordSegments[0].chord).toBe('Em');
    expect(result.measures[1].chordSegments[1].chord).toBe('G');
    expect(result.measures[1].chordSegments[1].leadingSpace).toBe(true);
    
    // Third measure: simple chord
    expect((result.measures[2] as any).__isChordOnlyMode).toBe(true);
    expect(result.measures[2].chord).toBe('F');
  });

  test('should NOT use chord-only mode when brackets are present', () => {
    const input = '4/4 | C[4 4 4 4] | Am[2 2] ||';
    const result = parser.parse(input);

    expect(result.measures.length).toBe(2);
    
    // Measures should have rhythm notation (not chord-only mode)
    expect((result.measures[0] as any).__isChordOnlyMode).toBeUndefined();
    expect(result.measures[0].beats.length).toBeGreaterThan(0);
    
    expect((result.measures[1] as any).__isChordOnlyMode).toBeUndefined();
    expect(result.measures[1].beats.length).toBeGreaterThan(0);
  });

  test('should handle mixed chord-only and rhythm notation', () => {
    const input = '4/4 | C | Am[4 4 4 4] | Em | F[2 2] ||';
    const result = parser.parse(input);

    expect(result.measures.length).toBe(4);
    
    // First measure: chord-only
    expect((result.measures[0] as any).__isChordOnlyMode).toBe(true);
    expect(result.measures[0].chord).toBe('C');
    
    // Second measure: rhythm notation
    expect((result.measures[1] as any).__isChordOnlyMode).toBeUndefined();
    expect(result.measures[1].chord).toBe('Am');
    expect(result.measures[1].beats.length).toBeGreaterThan(0);
    
    // Third measure: chord-only
    expect((result.measures[2] as any).__isChordOnlyMode).toBe(true);
    expect(result.measures[2].chord).toBe('Em');
    
    // Fourth measure: rhythm notation
    expect((result.measures[3] as any).__isChordOnlyMode).toBeUndefined();
    expect(result.measures[3].chord).toBe('F');
  });

  test('should handle repeat barlines in chord-only mode', () => {
    const input = '4/4 ||: C | Am | Em | G :||';
    const result = parser.parse(input);

    expect(result.measures.length).toBe(4);
    
    // First measure should have repeat start
    expect((result.measures[0] as any).__isChordOnlyMode).toBe(true);
    expect((result.measures[0] as any).isRepeatStart).toBe(true);
    expect(result.measures[0].chord).toBe('C');
    
    // Last measure should have repeat end
    expect((result.measures[3] as any).__isChordOnlyMode).toBe(true);
    expect((result.measures[3] as any).isRepeatEnd).toBe(true);
    expect(result.measures[3].barline).toBe(':||');
  });

  test('should handle complex chord names', () => {
    const input = '4/4 | Cmaj7 | Dm7 | G7sus4 | Fmaj7/A ||';
    const result = parser.parse(input);

    expect(result.measures.length).toBe(4);
    
    expect((result.measures[0] as any).__isChordOnlyMode).toBe(true);
    expect(result.measures[0].chord).toBe('Cmaj7');
    
    expect((result.measures[1] as any).__isChordOnlyMode).toBe(true);
    expect(result.measures[1].chord).toBe('Dm7');
    
    expect((result.measures[2] as any).__isChordOnlyMode).toBe(true);
    expect(result.measures[2].chord).toBe('G7sus4');
    
    expect((result.measures[3] as any).__isChordOnlyMode).toBe(true);
    expect(result.measures[3].chord).toBe('Fmaj7/A');
  });

  test('should differentiate bass notes from separate chords', () => {
    // Without spaces: bass note notation (one chord)
    const input1 = '4/4 | C | Em/G | F ||';
    const result1 = parser.parse(input1);
    
    expect(result1.measures.length).toBe(3);
    
    // Second measure: one chord with bass note
    expect((result1.measures[1] as any).__isChordOnlyMode).toBe(true);
    expect(result1.measures[1].chord).toBe('Em/G');
    expect(result1.measures[1].chordSegments.length).toBe(1);
    expect(result1.measures[1].chordSegments[0].chord).toBe('Em/G');
    
    // With spaces: two separate chords
    const input2 = '4/4 | C | Em / G | F ||';
    const result2 = parser.parse(input2);
    
    expect(result2.measures.length).toBe(3);
    
    // Second measure: two chords
    expect((result2.measures[1] as any).__isChordOnlyMode).toBe(true);
    expect(result2.measures[1].chord).toBe('Em');
    expect(result2.measures[1].chordSegments.length).toBe(2);
    expect(result2.measures[1].chordSegments[0].chord).toBe('Em');
    expect(result2.measures[1].chordSegments[1].chord).toBe('G');
    expect(result2.measures[1].chordSegments[1].leadingSpace).toBe(true);
  });

  test('should NOT detect chord-only mode for rhythm-only notation', () => {
    const input = '4/4 | 4 4 4 4 | 8 8 4 4 ||';
    const result = parser.parse(input);

    expect(result.measures.length).toBe(2);
    
    // Should be rhythm-only mode (no chords, not chord-only)
    expect((result.measures[0] as any).__isChordOnlyMode).toBeUndefined();
    expect(result.measures[0].beats.length).toBeGreaterThan(0);
    
    expect((result.measures[1] as any).__isChordOnlyMode).toBeUndefined();
    expect(result.measures[1].beats.length).toBeGreaterThan(0);
  });

  test('should not have validation errors for chord-only measures', () => {
    const input = '4/4 | C | Am | Em / G | Fmaj7/A ||';
    const result = parser.parse(input);

    // No rhythm validation errors for chord-only measures
    expect(result.errors.length).toBe(0);
    
    // All measures should be chord-only mode
    expect(result.measures.length).toBe(4);
    result.measures.forEach(measure => {
      expect((measure as any).__isChordOnlyMode).toBe(true);
    });
  });

  test('should validate rhythm in mixed chord-only and rhythm notation', () => {
    // Chord-only measures should not be validated, but rhythm measures should be
    const validInput = '4/4 | C | Am[4 4 4 4] | Em | F[2 2] ||';
    const validResult = parser.parse(validInput);
    
    expect(validResult.errors.length).toBe(0);
    expect((validResult.measures[0] as any).__isChordOnlyMode).toBe(true);
    expect((validResult.measures[1] as any).__isChordOnlyMode).toBeUndefined();
    expect((validResult.measures[2] as any).__isChordOnlyMode).toBe(true);
    expect((validResult.measures[3] as any).__isChordOnlyMode).toBeUndefined();
    
    // Invalid rhythm measure should still be caught
    const invalidInput = '4/4 | C | Am[4 4] | Em ||'; // Am measure has only 2 quarter notes instead of 4
    const invalidResult = parser.parse(invalidInput);
    
    expect(invalidResult.errors.length).toBe(1);
    expect(invalidResult.errors[0].measureIndex).toBe(1); // Second measure (Am[4 4])
  });
});
