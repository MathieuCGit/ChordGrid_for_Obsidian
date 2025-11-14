import { ChordGridParser } from '../src/parser/ChordGridParser';

const parser = new ChordGridParser();
const result = parser.parse('4/4 | C[4 4 4 4_] | C[{_8 8 8_}3 _4 4 4] |');

console.log('Errors:', result.errors);

console.log('\n=== MESURE 1 ===');
const measure1 = result.grid.measures[0].chordSegments[0].beats.flatMap(b => b.notes);
measure1.forEach((n, i) => {
  console.log(`Note ${i}: value=${n.value}, tieStart=${n.tieStart}, tieEnd=${n.tieEnd}, tuplet=${n.tuplet?.position || 'none'}`);
});

console.log('\n=== MESURE 2 ===');
const measure2 = result.grid.measures[1].chordSegments[0].beats.flatMap(b => b.notes);
measure2.forEach((n, i) => {
  console.log(`Note ${i}: value=${n.value}, tieStart=${n.tieStart}, tieEnd=${n.tieEnd}, tuplet=${n.tuplet?.position || 'none'}`);
});
