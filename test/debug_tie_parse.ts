import { ChordGridParser } from '../src/parser/ChordGridParser';

const parser = new ChordGridParser();

console.log('\n=== Test 1: 88 _88 _888_ (with trailing underscore) ===');
const result1 = parser.parse(`7/8 | C[88 _88 _888_]`);
console.log('Errors:', result1.errors);
const seg1 = result1.measures[0].chordSegments[0];
console.log('Number of beats:', seg1.beats.length);
seg1.beats.forEach((beat, idx) => {
  console.log(`\nBeat ${idx}:`);
  beat.notes.forEach((note, nIdx) => {
    console.log(`  Note ${nIdx}: value=${note.value}, tieStart=${note.tieStart}, tieEnd=${note.tieEnd}, tieToVoid=${note.tieToVoid}, pos=${note.position}`);
  });
});

console.log('\n=== Test 2: 88_88 (no space) ===');
const result2 = parser.parse(`4/4 | C[88_88]`);
console.log('Errors:', result2.errors);
const seg2 = result2.measures[0].chordSegments[0];
console.log('Number of beats:', seg2.beats.length);
seg2.beats.forEach((beat, idx) => {
  console.log(`\nBeat ${idx}:`);
  beat.notes.forEach((note, nIdx) => {
    console.log(`  Note ${nIdx}: value=${note.value}, tieStart=${note.tieStart}, tieEnd=${note.tieEnd}, pos=${note.position}`);
  });
});

console.log('\n=== Test 3: 88 _88 (simple 4/4) ===');
const result3 = parser.parse(`4/4 | C[88 _88]`);
console.log('Errors:', result3.errors);
const seg3 = result3.measures[0].chordSegments[0];
console.log('Number of beats:', seg3.beats.length);
seg3.beats.forEach((beat, idx) => {
  console.log(`\nBeat ${idx}:`);
  beat.notes.forEach((note, nIdx) => {
    console.log(`  Note ${nIdx}: value=${note.value}, tieStart=${note.tieStart}, tieEnd=${note.tieEnd}, pos=${note.position}`);
  });
});
