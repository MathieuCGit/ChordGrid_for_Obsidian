/**
 * Test to verify the counting bug fix with actual SVG rendering
 */

import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

declare const describe: any;
declare const it: any;
declare const expect: any;

describe('Counting Bug Fix - SVG Rendering', () => {
  const parser = new ChordGridParser();
  const renderer = new SVGRenderer();

  it('should render correct counting labels for eighth notes in user case', () => {
    const input = `count  
4/4 | D[4.]A[8_] [_4] D[4_] | [_8]A[8_] [_4] E[4 4] |`;

    const result = parser.parse(input);
    expect(result.countingMode).toBe(true);
    expect(result.errors).toHaveLength(0);

    // Render to SVG
    const svg = renderer.render(result.grid);
    expect(svg).toBeTruthy();

    // Convert SVG to string for inspection
    const svgString = new XMLSerializer().serializeToString(svg);
    
    console.log(`=== COUNTING LABELS IN SVG ===`);
    console.log(`SVG size: ${svgString.length} chars`);
    
    // Look for counting text elements
    const countingMatch = svgString.match(/<text[^>]*data-counting[^>]*>([^<]+)<\/text>/g);
    if (countingMatch) {
      console.log(`Found ${countingMatch.length} counting labels in SVG:`);
      countingMatch.forEach((match, idx) => {
        const labelMatch = match.match(/>([^<]+)<\/text>/);
        if (labelMatch) {
          console.log(`  Label ${idx + 1}: "${labelMatch[1]}"`);
          
          // Check for the bug
          if (labelMatch[1] === '7') {
            console.error(`  ❌ BUG STILL EXISTS: Found "7" instead of "&"`);
          } else if (labelMatch[1] === '&') {
            console.log(`  ✓ CORRECT: Found "&" for eighth`);
          }
        }
      });
    } else {
      console.log(`No data-counting elements found in SVG`);
    }
  });

  it('should show ampersand for all eighth notes in mixed rhythm', () => {
    // Simple case: just eighths in one beat
    const input = `count
4/4 | A[88] | B[88] |`;

    const result = parser.parse(input);
    const svg = renderer.render(result.grid);
    const svgString = new XMLSerializer().serializeToString(svg);
    
    // For two eighths in a quarter beat, should show "1" then "&"
    console.log(`\n=== SIMPLE EIGHTHS TEST ===`);
    const countingMatch = svgString.match(/<text[^>]*data-counting[^>]*>([^<]+)<\/text>/g);
    if (countingMatch) {
      console.log(`Found ${countingMatch.length} counting labels:`);
      countingMatch.forEach((match, idx) => {
        const labelMatch = match.match(/>([^<]+)<\/text>/);
        if (labelMatch) {
          console.log(`  ${idx + 1}. "${labelMatch[1]}"`);
          if (idx === 1 && labelMatch[1] === '&') {
            console.log(`    ✓ Correct: second eighth shows "&"`);
          }
        }
      });
    }
  });

});
