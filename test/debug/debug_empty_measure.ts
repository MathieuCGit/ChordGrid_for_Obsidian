import { ChordGridParser } from '../src/parser/ChordGridParser';

const input = `
picks-auto stems-down
4/4 ||:.1-3 CM7 | Am7b5 / Bb7#5 | Em7/9[161616-16 -4] G6[161616-16 4] | FM7(#11)/A / G7(#9)(b13) :||
|.4 EbM7#11 | | ||
`.trim();

const parser = new ChordGridParser();
const result = parser.parse(input);

console.log('\n=== PARSED MEASURES ===');
console.log('Total measures:', result.grid.measures.length);
result.grid.measures.forEach((m, i) => {
  const measure = m as any;
  console.log(`\nMeasure ${i}:`);
  console.log('  chord:', m.chord);
  console.log('  beats:', m.beats.length);
  console.log('  segments:', m.chordSegments?.length || 0);
  console.log('  barline:', m.barline);
  console.log('  source:', m.source);
  console.log('  __isEmpty:', measure.__isEmpty);
  console.log('  __isChordOnlyMode:', measure.__isChordOnlyMode);
  console.log('  isRepeatStart:', measure.isRepeatStart);
  console.log('  voltaStart:', measure.voltaStart);
});
