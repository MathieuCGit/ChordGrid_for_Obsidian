import { ChordGridParser } from '../src/parser/ChordGridParser';

const parser = new ChordGridParser();

// Test 1: L'exemple de l'utilisateur (devrait être invalide : 3 temps au lieu de 4)
const input1 = `finger
4/4
C | 16 16 16 16 8 8 4 |`;

console.log('=== TEST 1: 16+16+16+16+8+8+4 ===');
console.log('Calcul manuel:');
console.log('  4×16 = 4 × 0.25 = 1.0 temps');
console.log('  2×8  = 2 × 0.5  = 1.0 temps');
console.log('  1×4  = 1 × 1.0  = 1.0 temps');
console.log('  TOTAL           = 3.0 temps ⚠️ (manque 1 temps pour 4/4)');
console.log('');

const result1 = parser.parse(input1);
console.log('Parser result:', result1.errors.length, 'errors');
result1.errors.forEach(err => console.log(`  - ${err.message}`));
console.log('Expected: 1 error (found 3.0 instead of 4.0)');
console.log(result1.errors.length === 1 ? '✅ CORRECT' : '❌ INCORRECT');
console.log('');

// Test 2: Version corrigée (devrait être valide : 4 temps)
const input2 = `finger
4/4
C | 16 16 16 16 8 8 4 4 |`;

console.log('=== TEST 2: 16+16+16+16+8+8+4+4 (corrigé) ===');
console.log('Calcul manuel:');
console.log('  4×16 = 4 × 0.25 = 1.0 temps');
console.log('  2×8  = 2 × 0.5  = 1.0 temps');
console.log('  2×4  = 2 × 1.0  = 2.0 temps');
console.log('  TOTAL           = 4.0 temps ✅');
console.log('');

const result2 = parser.parse(input2);
console.log('Parser result:', result2.errors.length, 'errors');
result2.errors.forEach(err => console.log(`  - ${err.message}`));
console.log('Expected: 0 errors');
console.log(result2.errors.length === 0 ? '✅ CORRECT' : '❌ INCORRECT');
console.log('');

// Test 3: Autre version corrigée avec symboles de doigts
const input3 = `finger
4/4
C | 16t 16h 16t 16h 8t 8h 4t 4h |`;

console.log('=== TEST 3: Avec symboles fingerstyle ===');
const result3 = parser.parse(input3);
console.log('Parser result:', result3.errors.length, 'errors');
result3.errors.forEach(err => console.log(`  - ${err.message}`));
console.log('Expected: 0 errors');
console.log(result3.errors.length === 0 ? '✅ CORRECT' : '❌ INCORRECT');
