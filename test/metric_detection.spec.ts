/**
 * Tests for time signature detection and display logic
 */

import { ChordGridParser } from '../src/parser/ChordGridParser';

describe('Time Signature Detection', () => {
  let parser: ChordGridParser;

  beforeEach(() => {
    parser = new ChordGridParser();
  });

  test('should detect global time signature', () => {
    const input = `4/4 | C[8888] | D[8888]`;
    const result = parser.parse(input);
    
    expect(result.grid.timeSignature.numerator).toBe(4);
    expect(result.grid.timeSignature.denominator).toBe(4);
  });

  test('should detect inline time signature changes', () => {
    const input = `4/4 | C[8888] | 3/4 D[888] | 2/4 G[88]`;
    const result = parser.parse(input);
    
    // First measure: no inline change (uses global)
    expect(result.grid.measures[0].timeSignature).toBeUndefined();
    
    // Second measure: change to 3/4
    expect(result.grid.measures[1].timeSignature).toBeDefined();
    expect(result.grid.measures[1].timeSignature!.numerator).toBe(3);
    expect(result.grid.measures[1].timeSignature!.denominator).toBe(4);
    
    // Third measure: change to 2/4
    expect(result.grid.measures[2].timeSignature).toBeDefined();
    expect(result.grid.measures[2].timeSignature!.numerator).toBe(2);
    expect(result.grid.measures[2].timeSignature!.denominator).toBe(4);
  });

  test('should detect time signature with line breaks', () => {
    const input = `
finger:fr show%
4/4 | Em[88 88 88 88] | D[%] | % | Em[%] | 
Em[88 88] G[88 88] | C[88 88] G[88 88] | 
G[88 88 88 88] | C[88 88] G[88 88] | 
2/4 G[4 -4] | 
4/4 C[88 88 88 88] | % | G[%] | 
G[88 88] Em[88 88] | 
2/4 G[88 88] | 
4/4 D[88 88 88 88] | Em[88 88 88 88]
`;
    const result = parser.parse(input);
    const measures = result.grid.measures;
    
    // Find measures with time signature changes
    const measuresWithTS = measures
      .map((m, i) => ({ index: i, ts: m.timeSignature, chord: m.chordSegments?.[0]?.chord || m.chord }))
      .filter(m => m.ts);
    
    console.log('\nMeasures with time signature:');
    measuresWithTS.forEach(m => {
      console.log(`  Measure ${m.index}: ${m.chord} - ${m.ts!.numerator}/${m.ts!.denominator}`);
    });
    
    // Should have 3 time signature changes: 2/4, 4/4, 2/4, 4/4
    expect(measuresWithTS.length).toBeGreaterThan(0);
    
    // Check that 2/4 appears on G chord
    const firstTwoFour = measuresWithTS.find(m => m.ts!.numerator === 2 && m.ts!.denominator === 4);
    expect(firstTwoFour).toBeDefined();
    expect(firstTwoFour!.chord).toBe('G');
  });

  test('should preserve time signature through line breaks', () => {
    const input = `
4/4 | C[88 88 88 88] | D[88 88 88 88] | 
3/4 G[88 88 88] | Em[88 88 88] |
D[88 88 88] | G[88 88 88] |
2/4 Am[88 88] | C[88 88]
`;
    const result = parser.parse(input);
    const measures = result.grid.measures;
    
    // Find all time signature changes
    const tsChanges = measures
      .map((m, i) => ({ index: i, ts: m.timeSignature }))
      .filter(m => m.ts);
    
    console.log('\nTime signature changes:');
    tsChanges.forEach(m => {
      console.log(`  Measure ${m.index}: ${m.ts!.numerator}/${m.ts!.denominator}`);
    });
    
    // Should detect both 3/4 and 2/4 changes
    const threeQuarter = tsChanges.find(m => m.ts!.numerator === 3);
    const twoQuarter = tsChanges.find(m => m.ts!.numerator === 2);
    
    expect(threeQuarter).toBeDefined();
    expect(twoQuarter).toBeDefined();
  });
});
