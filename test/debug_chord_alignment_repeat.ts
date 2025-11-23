import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';
import { JSDOM } from 'jsdom';

// Set up DOM
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document as any;
global.window = dom.window as any;
global.SVGElement = dom.window.SVGElement as any;

const input = `picks-auto
4/4 ||: C[4 88_4 4] | % | G[%] | % :||`;

console.log('Testing input:', input);
console.log('');

const parser = new ChordGridParser();
const result = parser.parse(input);

if (result.errors.length > 0) {
  console.log('Parse errors:', result.errors);
}

console.log('Parsed measures:', result.grid.lines[0].length);
console.log('');

const renderer = new SVGRenderer();
const svg = renderer.render(result.grid, 'up');

// Extract chord and stem positions from the rendered SVG
const allTexts = svg.querySelectorAll('text');
const chordTexts = svg.querySelectorAll('text.chord-symbol');
const stems = svg.querySelectorAll('line[stroke-width="2"]');

console.log(`Found ${allTexts.length} total texts, ${chordTexts.length} chord-symbols, and ${stems.length} stems`);
console.log('');

// Check all text elements
console.log('=== ALL TEXT ELEMENTS ===');
allTexts.forEach((text) => {
  const classes = text.getAttribute('class');
  const x = text.getAttribute('x');
  const content = text.textContent;
  console.log(`Text: "${content}", class="${classes}", x=${x}`);
});
console.log('');

console.log('=== CHORD POSITIONS ===');
chordTexts.forEach((chordText) => {
  const x = parseFloat(chordText.getAttribute('x') || '0');
  const y = parseFloat(chordText.getAttribute('y') || '0');
  const anchor = chordText.getAttribute('text-anchor');
  const text = chordText.textContent;
  console.log(`Chord "${text}": x=${x}, y=${y}, anchor=${anchor}`);
});

console.log('\n=== STEM POSITIONS (first 8 stems) ===');
Array.from(stems).slice(0, 8).forEach((stem, i) => {
  const x1 = parseFloat(stem.getAttribute('x1') || '0');
  const y1 = parseFloat(stem.getAttribute('y1') || '0');
  const x2 = parseFloat(stem.getAttribute('x2') || '0');
  const y2 = parseFloat(stem.getAttribute('y2') || '0');
  console.log(`Stem ${i}: x1=${x1}, y1=${y1}, x2=${x2}, y2=${y2}`);
});

console.log('\n=== COMPARISON ===');
if (chordTexts.length > 0 && stems.length > 0) {
  const firstChord = chordTexts[0];
  const firstStem = stems[0];
  
  const chordX = parseFloat(firstChord.getAttribute('x') || '0');
  const stemX = parseFloat(firstStem.getAttribute('x1') || '0');
  const diff = chordX - stemX;
  
  console.log(`Chord C x: ${chordX}`);
  console.log(`First stem X: ${stemX}`);
  console.log(`Difference: ${diff.toFixed(2)}px`);
  
  if (Math.abs(diff) < 0.5) {
    console.log('✅ PERFECT ALIGNMENT!');
  } else {
    console.log(`❌ MISALIGNMENT: ${diff > 0 ? 'chord is too far RIGHT' : 'chord is too far LEFT'}`);
  }
}
