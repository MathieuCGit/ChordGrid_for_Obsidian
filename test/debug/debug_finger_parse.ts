import { ChordGridParser } from '../src/parser/ChordGridParser';

const parser = new ChordGridParser();

// Test case 1: Original problematic input
const input1 = `finger
4/4
C | 4t 8h8tu 4h 4t |`;

console.log('=== TEST 1: Concatenated notes with finger symbols ===');
console.log(input1);
const result1 = parser.parse(input1);
console.log('Errors:', result1.errors.length);
result1.errors.forEach(err => console.log(`  - ${err.message}`));
console.log('Expected: 0 errors');
console.log(result1.errors.length === 0 ? '✅ PASS' : '❌ FAIL');
console.log('');

// Test case 2: Concatenated notes with pick directions
const input2 = `pick
4/4
C | 4d 8u8d 4u 4d |`;

console.log('=== TEST 2: Concatenated notes with pick directions ===');
console.log(input2);
const result2 = parser.parse(input2);
console.log('Errors:', result2.errors.length);
result2.errors.forEach(err => console.log(`  - ${err.message}`));
console.log('Expected: 0 errors');
console.log(result2.errors.length === 0 ? '✅ PASS' : '❌ FAIL');
console.log('');

// Test case 3: Mixed single and double-char symbols concatenated
const input3 = `finger
4/4
C | 8t8tu8h8hu |`;

console.log('=== TEST 3: Mixed single and double-char symbols ===');
console.log(input3);
const result3 = parser.parse(input3);
console.log('Errors:', result3.errors.length);
result3.errors.forEach(err => console.log(`  - ${err.message}`));
console.log('Expected: 0 errors (4 notes = 2 quarters)');
console.log(result3.errors.length === 0 ? '✅ PASS' : '❌ FAIL');
console.log('');

// Test case 4: Symbols followed by different note values
const input4 = `finger
4/4
C | 8t16tu4h2hu |`;

console.log('=== TEST 4: Symbols followed by different note values ===');
console.log(input4);
const result4 = parser.parse(input4);
console.log('Errors:', result4.errors.length);
result4.errors.forEach(err => console.log(`  - ${err.message}`));
console.log('Expected: 0 errors (0.5 + 0.25 + 1 + 2 = 3.75 quarters)');
console.log(result4.errors.length === 0 ? '✅ PASS' : '❌ FAIL');

