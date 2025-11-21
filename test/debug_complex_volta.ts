import { ChordGridParser } from '../src/parser/ChordGridParser';

const parser = new ChordGridParser();
const input = '4/4 ||: C[4 88_4 4] | % |.1-3 G[%] | % :||.4 G[4 4 4 4] ||';
const result = parser.parse(input);

console.log('=== PARSED MEASURES ===');
console.log(`Total measures: ${result.grid.measures.length}`);
result.grid.measures.forEach((m, i) => {
  console.log(`\nMeasure ${i}:`);
  console.log('  chord:', m.chord);
  console.log('  barline:', m.barline);
  console.log('  isRepeat:', (m as any).isRepeat);
  console.log('  isRepeatStart:', (m as any).isRepeatStart);
  console.log('  isRepeatEnd:', (m as any).isRepeatEnd);
  console.log('  voltaStart:', (m as any).voltaStart);
  console.log('  voltaEnd:', (m as any).voltaEnd);
});
