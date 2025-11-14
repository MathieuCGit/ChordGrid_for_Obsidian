/**
 * Test du cas utilisateur avec ratios explicites
 */

import { ChordGridParser } from '../src/parser/ChordGridParser';

const parser = new ChordGridParser();

console.log('\n=== Cas utilisateur - Compte du nombre de notes ===');
const input = "4/4 | [{816-16 1616 8 8}5 {16-1688-8 -88 8}7 {32-1632 3232-16 -163232}3 4] |";
console.log('Input:', input);

const result = parser.parse(input);

console.log('\nMesure 0:');
let noteCount1 = 0, noteCount2 = 0, noteCount3 = 0;
for (const beat of result.grid.measures[0].beats) {
  for (const note of beat.notes) {
    if (note.tuplet) {
      if (note.tuplet.groupId.includes('T1_')) noteCount1++;
      else if (note.tuplet.groupId.includes('T')) {
        // Find second tuplet
        const groups = result.grid.measures[0].beats.flatMap(b => 
          b.notes.filter(n => n.tuplet).map(n => n.tuplet!.groupId)
        );
        const uniqueGroups = [...new Set(groups)];
        if (note.tuplet.groupId === uniqueGroups[1]) noteCount2++;
        else if (note.tuplet.groupId === uniqueGroups[2]) noteCount3++;
      }
    }
  }
}

console.log(`Tuplet 1 : ${noteCount1} notes/silences (déclaré comme 5)`);
console.log(`Tuplet 2 : ${noteCount2} notes/silences (déclaré comme 7)`);
console.log(`Tuplet 3 : ${noteCount3} notes/silences (déclaré comme 3)`);

console.log('\n=== Solution proposée: Utiliser les ratios explicites ===');
console.log('Si les tuplets sont correctement comptés, la validation devrait passer.');
console.log('Sinon, utiliser des ratios explicites comme {...}7:6 au lieu de {...}7');

// Test avec un exemple corrigé
console.log('\n=== Test avec ratios explicites ===');
const input2 = "4/4 | [{8 8 8}3:2 {8 8 8 8 8}5:4 {8 8}2:3 4] |";
console.log('Input:', input2);

const result2 = parser.parse(input2);
console.log('Errors:', result2.errors);

// Calculs:
// Triplet 3:2 : 3*(1/8) * 2/3 = 1/4
// Quintuplet 5:4 : 5*(1/8) * 4/5 = 1/2
// Duplet 2:3 : 2*(1/8) * 3/2 = 3/8
// Noire : 1/4
// Total = 1/4 + 1/2 + 3/8 + 1/4 = 2/8 + 4/8 + 3/8 + 2/8 = 11/8 (≠ 4/4)
console.log('Note: cet exemple ne fait pas 4/4 intentionnellement pour montrer la validation');
