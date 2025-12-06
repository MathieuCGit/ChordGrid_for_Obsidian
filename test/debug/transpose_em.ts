import { ChordGridParser } from '../src/parser/ChordGridParser';

const testCase = 'transpose:+5\n4/4\n| Em | D | G | C |';
console.log('=== Test Em with transpose:+5 ===');
console.log('Input:', testCase);

const parser = new ChordGridParser();
const result = parser.parse(testCase);

console.log('\nChords found:');
result.measures.forEach((m, i) => {
  if (m.chordSegments) {
    m.chordSegments.forEach(seg => {
      console.log('  Measure', i+1, ':', seg.chord);
    });
  }
});

console.log('\nExpected: Am, G, C, F');
