import { ChordGridParser } from '../src/parser/ChordGridParser';

const parser = new ChordGridParser();
const input = '4/4 ||: C[4 4 4 4] |.1 G[4 4 4 4] :||';
const result = parser.parse(input);

console.log('=== PARSED MEASURES ===');
result.grid.measures.forEach((m, i) => {
  console.log(`\nMeasure ${i}:`);
  console.log('  chord:', m.chord);
  console.log('  barline:', m.barline);
  console.log('  voltaStart:', (m as any).voltaStart);
  console.log('  voltaEnd:', (m as any).voltaEnd);
});
