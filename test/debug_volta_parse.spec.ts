import { ChordGridParser } from '../src/parser/ChordGridParser';

describe('Debug volta parsing', () => {
  test('Parse simple volta from doc', () => {
    const input = `4/4 ||: C[4 4 4 4] |.1,2,3 G[4 4 4 4] :||`;

    const parser = new ChordGridParser();
    const result = parser.parse(input);
    
    console.log('Total measures:', result.grid.measures.length);
    result.grid.measures.forEach((m, i) => {
      const volt = m.voltaStart ? `START:${m.voltaStart.text}` : m.voltaEnd ? `END:${m.voltaEnd.text}` : 'no';
      console.log(`M${i}: ${m.chord} volta=${volt}`);
    });
    
    expect(result.grid.measures.length).toBeGreaterThan(0);
  });
});
