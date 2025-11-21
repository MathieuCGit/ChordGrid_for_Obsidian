import { ChordGridParser } from '../src/parser/ChordGridParser';

describe('Volta End Syntax', () => {
  const parser = new ChordGridParser();

  test('|. should explicitly mark the end of a volta', () => {
    const input = `4/4 ||: C[4] |.1-3 G[4] :||.4 G[4] |. Am[4] ||`;
    const result = parser.parse(input);

    // Measure 0: C - repeat start, no volta
    expect(result.measures[0].chord).toBe('C');
    expect((result.measures[0] as any).voltaStart).toBeUndefined();
    expect((result.measures[0] as any).voltaEnd).toBeUndefined();

    // Measure 1: G - volta 1-3 starts here
    expect(result.measures[1].chord).toBe('G');
    expect((result.measures[1] as any).voltaStart).toBeDefined();
    expect((result.measures[1] as any).voltaStart.text).toBe('1-3');
    expect((result.measures[1] as any).voltaStart.isClosed).toBe(true);
    expect((result.measures[1] as any).voltaEnd).toBeDefined(); // Also ends here (single measure with :||)
    expect((result.measures[1] as any).isRepeatEnd).toBe(true);

    // Measure 2: G - volta 4 starts here
    expect(result.measures[2].chord).toBe('G');
    expect((result.measures[2] as any).voltaStart).toBeDefined();
    expect((result.measures[2] as any).voltaStart.text).toBe('4');
    expect((result.measures[2] as any).voltaStart.isClosed).toBe(false);

    // Measure 3: Am - volta 4 ends here (marked by |.)
    expect(result.measures[3].chord).toBe('Am');
    expect((result.measures[3] as any).voltaStart).toBeUndefined();
    expect((result.measures[3] as any).voltaEnd).toBeDefined();
    expect((result.measures[3] as any).voltaEnd.text).toBe('4');
  });

  test('Without |., open volta (after :||) spans only one measure', () => {
    const input = `4/4 ||: C[4] :||.4 G[4] | Am[4] ||`;
    const result = parser.parse(input);

    // Measure 1: G - volta 4 starts and ends here
    expect(result.measures[1].chord).toBe('G');
    expect((result.measures[1] as any).voltaStart).toBeDefined();
    expect((result.measures[1] as any).voltaStart.text).toBe('4');
    expect((result.measures[1] as any).voltaEnd).toBeDefined();

    // Measure 2: Am - no volta
    expect(result.measures[2].chord).toBe('Am');
    expect((result.measures[2] as any).voltaStart).toBeUndefined();
    expect((result.measures[2] as any).voltaEnd).toBeUndefined();
  });

  test('|. can extend volta across multiple measures', () => {
    const input = `4/4 ||: C[4] :||.4 G[4] | F[4] | Em[4] |. Am[4] ||`;
    const result = parser.parse(input);

    // Measure 1: G - volta 4 starts
    expect((result.measures[1] as any).voltaStart).toBeDefined();
    expect((result.measures[1] as any).voltaStart.text).toBe('4');

    // Measure 2: F - no start/end
    expect((result.measures[2] as any).voltaStart).toBeUndefined();
    expect((result.measures[2] as any).voltaEnd).toBeUndefined();

    // Measure 3: Em - no start/end
    expect((result.measures[3] as any).voltaStart).toBeUndefined();
    expect((result.measures[3] as any).voltaEnd).toBeUndefined();

    // Measure 4: Am - volta 4 ends here
    expect((result.measures[4] as any).voltaStart).toBeUndefined();
    expect((result.measures[4] as any).voltaEnd).toBeDefined();
    expect((result.measures[4] as any).voltaEnd.text).toBe('4');
  });
});
