import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

describe('Debug double barline rendering', () => {
  test('Analyze SVG output for double barline', () => {
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
    
    // Count line elements
    const lines = svg.querySelectorAll('line');
    console.log(`\nTotal line elements in SVG: ${lines.length}`);
    
    // Find barlines (vertical lines with height ~120)
    const barlines: Array<{x: number, strokeWidth: number, y1: number, y2: number, index: number}> = [];
    Array.from(lines).forEach((line: any, index: number) => {
      const x1 = parseFloat(line.getAttribute('x1') || '0');
      const x2 = parseFloat(line.getAttribute('x2') || '0');
      const y1 = parseFloat(line.getAttribute('y1') || '0');
      const y2 = parseFloat(line.getAttribute('y2') || '0');
      const strokeWidth = parseFloat(line.getAttribute('stroke-width') || '1');
      
      // Vertical lines (x1 === x2) with significant height (barlines)
      if (x1 === x2 && Math.abs(y2 - y1) > 50) {
        barlines.push({x: x1, strokeWidth, y1, y2, index});
      }
    });
    
    console.log('\nBarlines found (vertical lines):');
    barlines.forEach((b, i) => {
      console.log(`  ${i}: x=${b.x.toFixed(1)}, strokeWidth=${b.strokeWidth}, height=${(b.y2 - b.y1).toFixed(1)}, lineIndex=${b.index}`);
    });
    
    // Look for double bar pattern (two lines close together)
    console.log('\nDouble bar patterns (lines within 10px):');
    let foundFinalDoubleBar = false;
    for (let i = 0; i < barlines.length - 1; i++) {
      const b1 = barlines[i];
      const b2 = barlines[i + 1];
      const distance = Math.abs(b2.x - b1.x);
      
      if (distance < 10) {
        console.log(`  Barline ${i} and ${i+1}: distance=${distance.toFixed(1)}px, widths=${b1.strokeWidth} & ${b2.strokeWidth}`);
        
        // Check if it's the final double bar pattern (thin + thick, 6px apart)
        if (distance === 6 && b1.strokeWidth === 1.5 && b2.strokeWidth === 5) {
          console.log('    ✓ THIS IS THE FINAL DOUBLE BAR (thin + thick)');
          foundFinalDoubleBar = true;
        }
        // Check if it's a repeat double bar pattern (two equal, 6px apart)
        else if (distance === 6 && b1.strokeWidth === 1.5 && b2.strokeWidth === 1.5) {
          console.log('    ✓ THIS IS A REPEAT DOUBLE BAR (two equal lines)');
        }
      }
    }
    
    console.log(`\nFinal double bar found: ${foundFinalDoubleBar}`);
    
    // This test just logs information, always passes
    expect(result.measures.length).toBe(4);
  });
});
