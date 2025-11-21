import { ChordGridParser } from '../src/parser/ChordGridParser';

const input = `4/4 ||: C[4 88_4 4] | % |.1-3 G[%] | % :||.4 G[4 4 4 4] |. Am [16168 81616 4 88] ||`;

console.log('=== Parsing Volta End Test ===');
console.log('Input:', input);
console.log('Note: |. marks the explicit end of volta .4');

// Add debug to see tokens
const parser = new ChordGridParser();

// Monkey-patch to see tokens
const originalParse = parser.parse.bind(parser);
(parser as any).parse = function(input: string) {
  console.log('\n=== Debug: Input Processing ===');
  return originalParse(input);
};

const result = parser.parse(input);

console.log('\n=== Measures ===');
result.measures.forEach((measure: any, index: number) => {
  console.log(`\nMeasure ${index}:`);
  console.log('  Chord:', measure.chord);
  console.log('  voltaStart:', measure.voltaStart);
  console.log('  voltaEnd:', measure.voltaEnd);
  console.log('  voltaEndMarker:', measure.voltaEndMarker);
  console.log('  isRepeatStart:', measure.isRepeatStart);
  console.log('  isRepeatEnd:', measure.isRepeatEnd);
  console.log('  isFinalDoubleBar:', measure.isFinalDoubleBar);
});
