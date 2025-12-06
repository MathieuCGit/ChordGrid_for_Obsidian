import { ChordGridParser } from '../src/parser/ChordGridParser';

const parser = new ChordGridParser();

// Test 1: Directives sur lignes séparées (cas utilisateur)
const input1 = `finger
stems-down
4/4
C | 4 8 8 4 4 |`;

console.log('=== TEST 1: Directives sur lignes séparées ===');
console.log(input1);
const result1 = parser.parse(input1);
console.log('Errors:', result1.errors.length);
console.log('fingerMode:', result1.fingerMode);
console.log('stemsDirection:', result1.stemsDirection);
console.log(result1.errors.length === 0 && result1.fingerMode === 'en' && result1.stemsDirection === 'down' ? '✅ PASS' : '❌ FAIL');
console.log('');

// Test 2: Directives sur une seule ligne (ancien format)
const input2 = `finger stems-down 4/4
C | 4 8 8 4 4 |`;

console.log('=== TEST 2: Directives sur une ligne (compatibilité) ===');
console.log(input2);
const result2 = parser.parse(input2);
console.log('Errors:', result2.errors.length);
console.log('fingerMode:', result2.fingerMode);
console.log('stemsDirection:', result2.stemsDirection);
console.log(result2.errors.length === 0 && result2.fingerMode === 'en' && result2.stemsDirection === 'down' ? '✅ PASS' : '❌ FAIL');
console.log('');

// Test 3: Multiples directives sur lignes séparées
const input3 = `finger:fr
pick
stems-down
show%
measures-per-line:3
4/4
C | 4 8 8 4 4 |`;

console.log('=== TEST 3: Toutes les directives sur lignes séparées ===');
console.log(input3);
const result3 = parser.parse(input3);
console.log('Errors:', result3.errors.length);
console.log('fingerMode:', result3.fingerMode);
console.log('pickMode:', result3.pickMode);
console.log('stemsDirection:', result3.stemsDirection);
console.log('displayRepeatSymbol:', result3.displayRepeatSymbol);
console.log('measuresPerLine:', result3.measuresPerLine);
const allCorrect = result3.errors.length === 0 && 
                   result3.fingerMode === 'fr' && 
                   result3.pickMode === true &&
                   result3.stemsDirection === 'down' &&
                   result3.displayRepeatSymbol === true &&
                   result3.measuresPerLine === 3;
console.log(allCorrect ? '✅ PASS' : '❌ FAIL');
console.log('');

// Test 4: Ligne vide entre directives (devrait ignorer)
const input4 = `finger

stems-down
4/4
C | 4 8 8 4 4 |`;

console.log('=== TEST 4: Ligne vide entre directives ===');
console.log(input4);
const result4 = parser.parse(input4);
console.log('Errors:', result4.errors.length);
console.log('fingerMode:', result4.fingerMode);
console.log('stemsDirection:', result4.stemsDirection);
console.log(result4.errors.length === 0 && result4.fingerMode === 'en' && result4.stemsDirection === 'down' ? '✅ PASS' : '❌ FAIL');

