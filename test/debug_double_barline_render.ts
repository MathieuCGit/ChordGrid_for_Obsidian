import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';
import * as fs from 'fs';

const parser = new ChordGridParser();
const renderer = new SVGRenderer();

const input = `4/4 | C[8888 _8888] | G[%] | F[1616 1616 88 88 4] | % ||`;
console.log('Input:', input);

const result = parser.parse(input);

console.log('\nParsed measures:');
result.measures.forEach((m, i) => {
  console.log(`  Measure ${i}: chord="${m.chord}" barline="${m.barline}" isRepeat=${m.isRepeat}`);
});

const svg = renderer.render(result.grid);

// Count line elements by their attributes
const lines = svg.querySelectorAll('line');
console.log(`\nTotal line elements in SVG: ${lines.length}`);

// Find barlines (vertical lines with height ~120)
const barlines: Array<{x: number, strokeWidth: number, y1: number, y2: number}> = [];
Array.from(lines).forEach((line: any) => {
  const x1 = parseFloat(line.getAttribute('x1') || '0');
  const x2 = parseFloat(line.getAttribute('x2') || '0');
  const y1 = parseFloat(line.getAttribute('y1') || '0');
  const y2 = parseFloat(line.getAttribute('y2') || '0');
  const strokeWidth = parseFloat(line.getAttribute('stroke-width') || '1');
  
  // Vertical lines (x1 === x2) with significant height
  if (x1 === x2 && Math.abs(y2 - y1) > 50) {
    barlines.push({x: x1, strokeWidth, y1, y2});
  }
});

console.log('\nBarlines found (vertical lines):');
barlines.forEach((b, i) => {
  console.log(`  ${i}: x=${b.x.toFixed(1)}, strokeWidth=${b.strokeWidth}, height=${(b.y2 - b.y1).toFixed(1)}`);
});

// Look for double bar pattern (two lines close together)
console.log('\nDouble bar patterns (lines within 10px):');
for (let i = 0; i < barlines.length - 1; i++) {
  const b1 = barlines[i];
  const b2 = barlines[i + 1];
  const distance = Math.abs(b2.x - b1.x);
  
  if (distance < 10) {
    console.log(`  Barline ${i} and ${i+1}: distance=${distance.toFixed(1)}px, widths=${b1.strokeWidth} & ${b2.strokeWidth}`);
    
    // Check if it's the final double bar pattern (thin + thick, 4px apart)
    if (distance === 4 && b1.strokeWidth === 1 && b2.strokeWidth === 4) {
      console.log('    ✓ THIS IS THE FINAL DOUBLE BAR (thin + thick)');
    }
    // Check if it's a repeat double bar pattern (two equal, 6px apart)
    else if (distance === 6 && b1.strokeWidth === 1.5 && b2.strokeWidth === 1.5) {
      console.log('    ✓ THIS IS A REPEAT DOUBLE BAR (two equal lines)');
    }
  }
}

// Save SVG to file for manual inspection
const svgString = svg.outerHTML;
fs.writeFileSync('test/debug_double_barline_output.svg', svgString);
console.log('\nSVG saved to test/debug_double_barline_output.svg');
