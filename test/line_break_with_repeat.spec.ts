import { ChordGridParser } from '../src/parser/ChordGridParser';

describe('Line Break with Repeat Barlines', () => {
  let parser: ChordGridParser;

  beforeEach(() => {
    parser = new ChordGridParser();
  });

  test('Explicit line break should be respected even with repeat barlines', () => {
    const input = `finger:fr
4/4 ||: Am[4 4 4 4] | C[%] | G[%] | G[%]
| F[%] | F[%] | Dm[%] | G[%] :||`;
    
    const result = parser.parse(input);
    
    console.log('Parsed measures:', result.measures.length);
    result.measures.forEach((m, i) => {
      console.log(`  Measure ${i}: chord=${m.chord}, isLineBreak=${m.isLineBreak}, barline=${m.barline}`);
    });
    
    // We should have 8 measures total
    expect(result.measures.length).toBe(8);
    
    // The 4th measure (G at end of first line) should have a line break marker
    expect(result.measures[3].chord).toBe('G');
    expect(result.measures[3].isLineBreak).toBe(true);
    
    // The 5th measure (F at start of second line) should NOT have a line break
    expect(result.measures[4].chord).toBe('F');
    expect(result.measures[4].isLineBreak).toBe(false);
  });

  test('Line break without repeat barlines works correctly', () => {
    const input = `4/4 | Am[4 4 4 4] | C[%] | G[%] | G[%]
| F[%] | F[%] | Dm[%] | G[%] |`;
    
    const result = parser.parse(input);
    
    expect(result.measures.length).toBe(8);
    expect(result.measures[3].isLineBreak).toBe(true);
  });
  
  test('Multiple line breaks are preserved', () => {
    const input = `4/4 | Am[4 4 4 4] | C[%]
| G[%] | G[%]
| F[%] | Dm[%] |`;
    
    const result = parser.parse(input);
    
    expect(result.measures.length).toBe(6);
    expect(result.measures[1].isLineBreak).toBe(true); // C at end of line 1
    expect(result.measures[3].isLineBreak).toBe(true); // G at end of line 2
  });
});
