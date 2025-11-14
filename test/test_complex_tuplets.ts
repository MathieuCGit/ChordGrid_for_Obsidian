/**
 * Test des tuplets complexes avec ratios implicites (table par défaut)
 */

import { ChordGridParser } from '../src/parser/ChordGridParser';

const parser = new ChordGridParser();

console.log('\n=== Test 1: Tuplets 5, 7, 3 avec ratios par défaut ===');
const input1 = "4/4 | [{816-16 1616 8 8}5 {16-1688-8 -88 8}7 {32-1632 3232-16 -163232}3 4] |";
console.log('Input:', input1);

const result1 = parser.parse(input1);
console.log('\nErrors:', result1.errors);

if (result1.errors.length > 0) {
  console.log('\n❌ FAILED - Still has errors with default ratios');
} else {
  console.log('\n✅ PASSED - No validation errors with default ratios');
}

// Vérifier les ratios utilisés
const measure = result1.grid.measures[0];
console.log('\nTuplets found in measure:');
for (const beat of measure.beats) {
  for (const note of beat.notes) {
    if (note.tuplet && note.tuplet.position === 'start') {
      console.log(`  - Tuplet with ${note.tuplet.count} notes, ratio: ${note.tuplet.ratio ? 
        `${note.tuplet.ratio.numerator}:${note.tuplet.ratio.denominator} (explicit)` : 
        'default from table'}`);
    }
  }
}

console.log('\n=== Test 2: Tuplet 5 avec ratio explicite 5:3 ===');
const input2 = "4/4 | [{8 8 8 8 8}5:3 4] |";
console.log('Input:', input2);

const result2 = parser.parse(input2);
console.log('\nErrors:', result2.errors);

// Vérifier le ratio explicite
const measure2 = result2.grid.measures[0];
for (const beat of measure2.beats) {
  for (const note of beat.notes) {
    if (note.tuplet && note.tuplet.position === 'start') {
      if (note.tuplet.ratio) {
        console.log(`\n✅ Explicit ratio detected: ${note.tuplet.ratio.numerator}:${note.tuplet.ratio.denominator}`);
      } else {
        console.log('\n❌ Explicit ratio NOT detected');
      }
    }
  }
}

console.log('\n=== Test 3: Vérification durée totale ===');
const input3 = "4/4 | [{8 8 8}3 {8 8 8 8 8}5 {8 8 8 8 8 8 8}7] |";
console.log('Input:', input3);

const result3 = parser.parse(input3);
console.log('\nErrors:', result3.errors);

if (result3.errors.length === 0) {
  console.log('✅ Triplet (3:2) + Quintuplet (5:4) + Septuplet (7:4) = correct duration');
} else {
  console.log('❌ Duration validation failed');
}
