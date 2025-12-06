/**
 * Debug script to verify time signature detection in parser
 */

import { ChordGridParser } from '../src/parser/ChordGridParser';

const testCase = `
finger:fr show%
4/4 | Em[88 88 88 88] | D[%] | % | Em[%] | 
Em[88 88] G[88 88] | C[88 88] G[88 88] | 
G[88 88 88 88] | C[88 88] G[88 88] | 
2/4 G[4 -4] | 
4/4 C[88 88 88 88] | % | G[%] | 
G[88 88] Em[88 88] | 
2/4 G[88 88] | 
4/4 D[88 88 88 88] | Em[88 88 88 88]
`;

const parser = new ChordGridParser();
const result = parser.parse(testCase);
const grid = result.grid;

console.log('\n=== GLOBAL TIME SIGNATURE ===');
console.log(`${grid.timeSignature.numerator}/${grid.timeSignature.denominator}`);

console.log('\n=== MEASURES WITH TIME SIGNATURE CHANGES ===');
grid.measures.forEach((measure, index) => {
    if (measure.timeSignature) {
        console.log(`Measure ${index}: ${measure.timeSignature.numerator}/${measure.timeSignature.denominator}`);
        console.log(`  First chord: ${measure.chordSegments?.[0]?.chord || measure.chord}`);
        console.log(`  Source: ${measure.source}`);
        console.log(`  isLineBreak: ${measure.isLineBreak}`);
    }
});

console.log('\n=== ALL MEASURES (with line breaks) ===');
grid.measures.forEach((measure, index) => {
    const ts = measure.timeSignature;
    const tsStr = ts ? `${ts.numerator}/${ts.denominator}` : 'inherit';
    const chord = measure.chordSegments?.[0]?.chord || measure.chord;
    const lineBreak = measure.isLineBreak ? ' [LINE BREAK]' : '';
    console.log(`${index}: ${chord.padEnd(6)} (${tsStr})${lineBreak}`);
});
