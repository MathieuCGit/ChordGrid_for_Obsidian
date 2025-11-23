import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';
import * as fs from 'fs';

const parser = new ChordGridParser();
const renderer = new SVGRenderer();

// Test simple: un accord avec rythme explicite
const input1 = `4/4 | C[4 4 4 4] | G[8 8 8 8 8 8 8 8] |`;
const result1 = parser.parse(input1);
const svg1 = renderer.render(result1.grid);

// Chercher les accords rendus
const chordTexts1 = Array.from(svg1.querySelectorAll('text.chord-symbol'));
console.log('\n=== TEST 1: Simple chords with rhythm ===');
console.log('Input:', input1);
console.log('Chord elements found:', chordTexts1.length);
chordTexts1.forEach((el, i) => {
    console.log(`  Chord ${i + 1}: "${el.textContent}" at x=${el.getAttribute('x')}, y=${el.getAttribute('y')}`);
});

// Test 2: Multi-segments
const input2 = `4/4 | C[8 8] D[8 8] E[8 8] F[8 8] |`;
const result2 = parser.parse(input2);
const svg2 = renderer.render(result2.grid);

const chordTexts2 = Array.from(svg2.querySelectorAll('text.chord-symbol'));
console.log('\n=== TEST 2: Multiple chord segments ===');
console.log('Input:', input2);
console.log('Chord elements found:', chordTexts2.length);
chordTexts2.forEach((el, i) => {
    console.log(`  Chord ${i + 1}: "${el.textContent}" at x=${el.getAttribute('x')}, y=${el.getAttribute('y')}`);
});

// Test 3: Sans rythme explicite (ancien format)
const input3 = `4/4 | C | G | Am | F |`;
const result3 = parser.parse(input3);
const svg3 = renderer.render(result3.grid);

const chordTexts3 = Array.from(svg3.querySelectorAll('text.chord-symbol'));
console.log('\n=== TEST 3: Chords without explicit rhythm ===');
console.log('Input:', input3);
console.log('Chord elements found:', chordTexts3.length);
chordTexts3.forEach((el, i) => {
    console.log(`  Chord ${i + 1}: "${el.textContent}" at x=${el.getAttribute('x')}, y=${el.getAttribute('y')}`);
});

// Sauvegarder les SVG pour inspection visuelle
fs.writeFileSync('test_chord_render_1.html', `<!DOCTYPE html><html><body>${svg1.outerHTML}</body></html>`);
fs.writeFileSync('test_chord_render_2.html', `<!DOCTYPE html><html><body>${svg2.outerHTML}</body></html>`);
fs.writeFileSync('test_chord_render_3.html', `<!DOCTYPE html><html><body>${svg3.outerHTML}</body></html>`);

console.log('\n✅ HTML files saved for visual inspection');
