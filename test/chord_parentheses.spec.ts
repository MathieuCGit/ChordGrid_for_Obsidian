import { ChordGridParser } from '../src/parser/ChordGridParser';

describe('Chord Name Parsing - Parentheses Support', () => {
  let parser: ChordGridParser;

  beforeEach(() => {
    parser = new ChordGridParser();
  });

  test('Chord names with parentheses should be accepted (e.g., C(add9))', () => {
    const input = `4/4 | C(add9)[4 4 4 4] | D(sus4)[2 2] | Em7(b5)[1] |`;
    
    const result = parser.parse(input);
    
    expect(result.measures.length).toBe(3);
    expect(result.measures[0].chord).toBe('C(add9)');
    expect(result.measures[1].chord).toBe('D(sus4)');
    expect(result.measures[2].chord).toBe('Em7(b5)');
  });

  test('Complex chord names with parentheses should work', () => {
    const input = `finger:fr
4/4 | Dsus2[88 88 88 88] | Dsus2/F | G6/B | C(add9) |`;
    
    const result = parser.parse(input);
    
    console.log('Parsed measures:', result.measures.length);
    result.measures.forEach((m, i) => {
      console.log(`  Measure ${i}: chord="${m.chord}"`);
    });
    
    expect(result.measures.length).toBe(4);
    expect(result.measures[0].chord).toBe('Dsus2');
    expect(result.measures[1].chord).toBe('Dsus2/F');
    expect(result.measures[2].chord).toBe('G6/B');
    expect(result.measures[3].chord).toBe('C(add9)');
  });

  test('Chord-only mode with parentheses', () => {
    const input = `4/4 | C(add9) | D(sus4) | Em7(b5) | G |`;
    
    const result = parser.parse(input);
    
    expect(result.measures.length).toBe(4);
    expect(result.measures[0].chord).toBe('C(add9)');
    expect((result.measures[0] as any).__isChordOnlyMode).toBe(true);
  });

  test('Parentheses in chord segments', () => {
    const input = `4/4 | C[88] D(sus4)[88 88] | G[4 4] |`;
    
    const result = parser.parse(input);
    
    expect(result.measures.length).toBe(2);
    expect(result.measures[0].chordSegments.length).toBe(2);
    expect(result.measures[0].chordSegments[0].chord).toBe('C');
    expect(result.measures[0].chordSegments[1].chord).toBe('D(sus4)');
  });
});
