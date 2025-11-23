import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';
import { JSDOM } from 'jsdom';

// Set up DOM
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document as any;
global.window = dom.window as any;
global.SVGElement = dom.window.SVGElement as any;

const parser = new ChordGridParser();
const renderer = new SVGRenderer();

// Test input: simple case with clear rhythm
const input = '4/4 C[4 4 4 4] ||';

const result = parser.parse(input);

if (result.errors.length > 0) {
  console.log('Parse errors:', result.errors);
}

const grid = result.grid;
const svg = renderer.render(grid, 'up');

// Extract chord and stem positions from the rendered SVG
const chordTexts = svg.querySelectorAll('text');
const stems = svg.querySelectorAll('line[stroke-width="2"]');

console.log('\n=== CHORD POSITIONS ===');
chordTexts.forEach((text, idx) => {
  const content = text.textContent;
  if (content && content !== '4/4') { // Skip time signature
    const x = text.getAttribute('x');
    const y = text.getAttribute('y');
    const anchor = text.getAttribute('text-anchor');
    console.log(`Chord "${content}": x=${x}, y=${y}, anchor=${anchor}`);
  }
});

console.log('\n=== STEM POSITIONS ===');
stems.forEach((stem, idx) => {
  const x1 = stem.getAttribute('x1');
  const y1 = stem.getAttribute('y1');
  const x2 = stem.getAttribute('x2');
  const y2 = stem.getAttribute('y2');
  console.log(`Stem ${idx}: x1=${x1}, y1=${y1}, x2=${x2}, y2=${y2}`);
});

console.log('\n=== COMPARISON ===');
// For chord C, compare with first stem
const chordC = Array.from(chordTexts).find(t => t.textContent === 'C');
const firstStem = stems[0];

if (chordC && firstStem) {
  const chordX = parseFloat(chordC.getAttribute('x') || '0');
  const stemX = parseFloat(firstStem.getAttribute('x1') || '0');
  const diff = Math.abs(chordX - stemX);
  
  console.log(`Chord C center: ${chordX}`);
  console.log(`First stem X: ${stemX}`);
  console.log(`Difference: ${diff.toFixed(2)}px`);
  
  if (diff < 1) {
    console.log('✅ PERFECT ALIGNMENT!');
  } else if (diff < 5) {
    console.log('⚠️  Close but not perfect');
  } else {
    console.log('❌ NOT ALIGNED');
  }
}
