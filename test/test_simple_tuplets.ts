/**
 * Test simple des tuplets avec ratios par défaut
 */

import { ChordGridParser } from '../src/parser/ChordGridParser';

const parser = new ChordGridParser();

console.log('\n=== Test Simple 1: Triplet de croches (3:2) ===');
const input1 = "4/4 | [{8 8 8}3 4] |";
console.log('Input:', input1);

const result1 = parser.parse(input1);
console.log('Errors:', result1.errors);

// Calcul manuel: 3 croches = 3*(1/8) = 3/8 de ronde
// Ratio 3:2 → 3/8 * 2/3 = 2/8 = 1/4 de ronde
// + 1 noire = 1/4 de ronde
// Total = 1/2 de ronde = 2/4
console.log('Expected: 1/4 (triplet) + 1/4 (noire) = 1/2 de ronde = 2 quarter-notes');

console.log('\n=== Test Simple 2: Quintuplet de croches (5:4) ===');
const input2 = "4/4 | [{8 8 8 8 8}5 4] |";
console.log('Input:', input2);

const result2 = parser.parse(input2);
console.log('Errors:', result2.errors);

// Calcul manuel: 5 croches = 5*(1/8) = 5/8 de ronde
// Ratio 5:4 → 5/8 * 4/5 = 4/8 = 1/2 de ronde
// + 1 noire = 1/4 de ronde
// Total = 3/4 de ronde = 3 quarter-notes
console.log('Expected: 1/2 (quintuplet) + 1/4 (noire) = 3/4 de ronde = 3 quarter-notes');

console.log('\n=== Test Simple 3: Septuplet de croches (7:4) ===');
const input3 = "4/4 | [{8 8 8 8 8 8 8}7] |";
console.log('Input:', input3);

const result3 = parser.parse(input3);
console.log('Errors:', result3.errors);

// Calcul manuel: 7 croches = 7*(1/8) = 7/8 de ronde  
// Ratio 7:4 → 7/8 * 4/7 = 4/8 = 1/2 de ronde = 2 quarter-notes
console.log('Expected: 1/2 de ronde = 2 quarter-notes (donc erreur car il faut 4)');

console.log('\n=== Test Simple 4: Mesure complète 4/4 avec triplet ===');
const input4 = "4/4 | [{8 8 8}3 {8 8 8}3 {8 8 8}3 {8 8 8}3] |";
console.log('Input:', input4);

const result4 = parser.parse(input4);
console.log('Errors:', result4.errors);

// Calcul manuel: 4 triplets de croches
// Chaque triplet = 1/4 de ronde
// Total = 4 * 1/4 = 1 ronde = 4 quarter-notes ✅
console.log('Expected: 4 triplets * 1/4 = 1 ronde = 4 quarter-notes (correct!)');
