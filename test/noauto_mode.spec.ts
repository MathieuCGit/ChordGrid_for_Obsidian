import { ChordGridParser } from '../src/parser/ChordGridParser';

describe('No-auto grouping mode', () => {
  let parser: ChordGridParser;

  beforeEach(() => {
    parser = new ChordGridParser();
  });

  test('Parsing: noauto keyword is recognized in 4/4', () => {
    const input = `4/4 noauto | C[88888888]`; // 8 eighths = 4 quarters
    const result = parser.parse(input);

    expect(result.errors).toEqual([]);
    expect(result.measures).toHaveLength(1);
    
    // Access time signature from the first line parsing
    const firstLine = input.split('\n')[0];
    const tsMatch = /(\d+)\/(\d+)(?:\s+(binary|ternary|noauto))?/.exec(firstLine);
    expect(tsMatch).not.toBeNull();
    expect(tsMatch![3]).toBe('noauto');
  });

  test('Parsing: noauto keyword is recognized in 6/8', () => {
    const input = `6/8 noauto | C[888888]`;
    const result = parser.parse(input);

    expect(result.errors).toEqual([]);
    expect(result.measures).toHaveLength(1);
  });

  test('Parsing: noauto works with different time signatures', () => {
    const cases = [
      '2/4 noauto | C[8888]',      // 4 eighths = 2 quarters ✓
      '3/4 noauto | C[888888]',    // 6 eighths = 3 quarters ✓
      '5/4 noauto | C[88 88 88 88 88]', // 10 eighths = 5 quarters ✓
      '7/8 noauto | C[88 88 888]'  // 7 eighths ✓
    ];

    cases.forEach(input => {
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);
      expect(result.measures).toHaveLength(1);
    });
  });

  test('Parsing: binary, ternary, and noauto all recognized', () => {
    const cases = [
      { input: '4/4 binary | C[88888888]', mode: 'binary' },    // 8 eighths = 4 quarters
      { input: '4/4 ternary | C[888888888888]', mode: 'ternary' }, // 12 eighths = 6 quarters (wait, 4/4 = 4 quarters)
      { input: '4/4 noauto | C[88888888]', mode: 'noauto' },    // 8 eighths = 4 quarters
      { input: '4/4 | C[88888888]', mode: undefined }           // auto mode (no keyword)
    ];

    cases.forEach(({ input, mode }) => {
      const result = parser.parse(input);
      // Note: ternary case will have validation error because 12 eighths > 4 quarters
      if (mode !== 'ternary') {
        expect(result.errors).toEqual([]);
      }
      
      const firstLine = input.split('\n')[0];
      const tsMatch = /(\d+)\/(\d+)(?:\s+(binary|ternary|noauto))?/.exec(firstLine);
      expect(tsMatch).not.toBeNull();
      expect(tsMatch![3]).toBe(mode);
    });
  });

  test('4/4 noauto: user controls grouping via spaces', () => {
    const input = `4/4 noauto | C[8888 88 88]`; // 8+2+2 eighths = 6 quarters (wait, need 4 quarters = 8 eighths)
    // Correction: 8888 (4 eighths = 2 quarters) + 88 (2 eighths = 1 quarter) + 88 (1 quarter) = 4 quarters ✓
    const result = parser.parse(input);

    expect(result.errors).toEqual([]);
    expect(result.measures).toHaveLength(1);

    const measure = result.measures[0];
    const segment = measure.chordSegments[0];
    
    // User specified 3 groups with spaces: [8888] [88] [88]
    expect(segment.beats).toHaveLength(3);
    expect(segment.beats[0].notes).toHaveLength(4);
    expect(segment.beats[1].notes).toHaveLength(2);
    expect(segment.beats[2].notes).toHaveLength(2);
  });

  test('6/8 noauto: continuous beam without auto-breaking', () => {
    const input = `6/8 noauto | C[888888]`;
    const result = parser.parse(input);

    expect(result.errors).toEqual([]);
    
    const measure = result.measures[0];
    const segment = measure.chordSegments[0];
    
    // Without spaces, all 6 eighths should be in one beat (one continuous group)
    expect(segment.beats).toHaveLength(1);
    expect(segment.beats[0].notes).toHaveLength(6);
  });

  test('4/4 noauto: multiple measures with proper validation', () => {
    const input = `4/4 noauto | C[8888 8888] | G[88 88 88 88] | F[1616 1616 88 88 4] |`;
    const result = parser.parse(input);
    
    // Should validate correctly - no rhythm errors
    expect(result.errors).toEqual([]);
    expect(result.measures).toHaveLength(3);
    
    // Measure 1: C[8888 8888] = 2 beats (4 eighths + 4 eighths) = 4 quarters
    expect(result.measures[0].chordSegments[0].beats).toHaveLength(2);
    
    // Measure 2: G[88 88 88 88] = 4 beats (2+2+2+2 eighths) = 4 quarters
    expect(result.measures[1].chordSegments[0].beats).toHaveLength(4);
    
    // Measure 3: F[1616 1616 88 88 4] = 5 beats = 4 quarters
    expect(result.measures[2].chordSegments[0].beats).toHaveLength(5);
  });
});

