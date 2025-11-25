/**
 * Test: Chord-only measures with % repeat notation
 * 
 * Bug: Rhythm validation error when % copies a chord-only measure
 * Fix: Skip rhythm validation for chord-only measures
 */

import { ChordGridParser } from '../src/parser/ChordGridParser';

describe('Chord-only measures with % repeat', () => {
  let parser: ChordGridParser;

  beforeEach(() => {
    parser = new ChordGridParser();
  });

  test('should accept simple chord-only with %', () => {
    const input = `
| Dm | % | E | % | Am | E | Am | E |
    `.trim();

    const result = parser.parse(input);
    
    expect(result.errors).toHaveLength(0);
    expect(result.measures).toHaveLength(8);
    
    // Mesure 1: Dm
    expect(result.measures[0].chord).toBe('Dm');
    expect(result.measures[0].beats.length).toBe(0); // chord-only
    
    // Mesure 2: % (copie Dm)
    expect(result.measures[1].chord).toBe('Dm');
    expect(result.measures[1].beats.length).toBe(0); // chord-only
    expect((result.measures[1] as any).isRepeat).toBe(true);
    
    // Mesure 3: E
    expect(result.measures[2].chord).toBe('E');
    expect(result.measures[2].beats.length).toBe(0); // chord-only
    
    // Mesure 4: % (copie E)
    expect(result.measures[3].chord).toBe('E');
    expect(result.measures[3].beats.length).toBe(0); // chord-only
    expect((result.measures[3] as any).isRepeat).toBe(true);
  });

  test('should accept chord-only followed by rhythm with %', () => {
    const input = `
| Dm | % | E[4 4 4 4] | % |
    `.trim();

    const result = parser.parse(input);
    
    expect(result.errors).toHaveLength(0);
    expect(result.measures).toHaveLength(4);
    
    // Mesure 1: Dm (chord-only)
    expect(result.measures[0].chord).toBe('Dm');
    expect(result.measures[0].beats.length).toBe(0);
    
    // Mesure 2: % (copie Dm, chord-only)
    expect(result.measures[1].chord).toBe('Dm');
    expect(result.measures[1].beats.length).toBe(0);
    
    // Mesure 3: E[4 4 4 4] (avec rythme)
    expect(result.measures[2].chord).toBe('E');
    expect(result.measures[2].beats.length).toBeGreaterThan(0);
    
    // Mesure 4: % (copie E avec rythme)
    expect(result.measures[3].chord).toBe('E');
    expect(result.measures[3].beats.length).toBeGreaterThan(0);
  });

  test('should accept multiple chords per measure with %', () => {
    const input = `
| Dm / F | % | Am / C | % |
    `.trim();

    const result = parser.parse(input);
    
    expect(result.errors).toHaveLength(0);
    expect(result.measures).toHaveLength(4);
    
    // Mesure 1: Dm / F (2 segments chord-only)
    expect(result.measures[0].chordSegments.length).toBe(2);
    expect(result.measures[0].chordSegments[0].chord).toBe('Dm');
    expect(result.measures[0].chordSegments[1].chord).toBe('F');
    
    // Mesure 2: % (copie Dm / F)
    expect(result.measures[1].chordSegments.length).toBe(2);
    expect(result.measures[1].chordSegments[0].chord).toBe('Dm');
    expect(result.measures[1].chordSegments[1].chord).toBe('F');
  });

  test('should handle % cascade (% copying %)', () => {
    const input = `
| Dm | % | % | % |
    `.trim();

    const result = parser.parse(input);
    
    expect(result.errors).toHaveLength(0);
    expect(result.measures).toHaveLength(4);
    
    // Toutes les mesures doivent contenir Dm
    for (let i = 0; i < 4; i++) {
      expect(result.measures[i].chord).toBe('Dm');
      expect(result.measures[i].beats.length).toBe(0); // chord-only
    }
    
    // Mesures 2, 3, 4 sont des répétitions
    expect((result.measures[1] as any).isRepeat).toBe(true);
    expect((result.measures[2] as any).isRepeat).toBe(true);
    expect((result.measures[3] as any).isRepeat).toBe(true);
  });

  test('should still validate rhythm errors when % copies invalid rhythm', () => {
    const input = `
| C[4 4 4] | % |
    `.trim();

    const result = parser.parse(input);
    
    // Devrait avoir 2 erreurs : mesure 1 (invalide) et mesure 2 (copie l'invalide)
    expect(result.errors.length).toBeGreaterThan(0);
    
    // Vérifier que l'erreur mentionne bien un problème de 3 quarter-notes au lieu de 4
    const error = result.errors.find(e => e.measureIndex === 0);
    expect(error).toBeDefined();
    expect(error!.foundQuarterNotes).toBeCloseTo(3, 3);
    expect(error!.expectedQuarterNotes).toBe(4);
  });

  test('should handle complex chord notations with %', () => {
    const input = `
| Cmaj7 | % | Dm7b5 | % | G7#9 | % |
    `.trim();

    const result = parser.parse(input);
    
    expect(result.errors).toHaveLength(0);
    expect(result.measures).toHaveLength(6);
    
    // Vérifier les accords complexes
    expect(result.measures[0].chord).toBe('Cmaj7');
    expect(result.measures[1].chord).toBe('Cmaj7'); // copie via %
    
    expect(result.measures[2].chord).toBe('Dm7b5');
    expect(result.measures[3].chord).toBe('Dm7b5'); // copie via %
    
    expect(result.measures[4].chord).toBe('G7#9');
    expect(result.measures[5].chord).toBe('G7#9'); // copie via %
  });

  test('should preserve __isChordOnlyMode flag when cloning with %', () => {
    const input = `
| Dm | % | E[4 4 4 4] | % |
    `.trim();

    const result = parser.parse(input);
    
    expect(result.errors).toHaveLength(0);
    
    // Mesure 1: Dm (chord-only)
    expect((result.measures[0] as any).__isChordOnlyMode).toBe(true);
    
    // Mesure 2: % copie Dm (doit aussi être chord-only)
    expect((result.measures[1] as any).__isChordOnlyMode).toBe(true);
    expect((result.measures[1] as any).isRepeat).toBe(true);
    
    // Mesure 3: E avec rythme (pas chord-only)
    expect((result.measures[2] as any).__isChordOnlyMode).toBeUndefined();
    
    // Mesure 4: % copie E avec rythme (pas chord-only)
    expect((result.measures[3] as any).__isChordOnlyMode).toBeUndefined();
    expect((result.measures[3] as any).isRepeat).toBe(true);
  });
});
