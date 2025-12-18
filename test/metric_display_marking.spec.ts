/**
 * Test for time signature display marking logic
 */

import { SVGRenderer } from '../src/renderer/SVGRenderer';
import { ChordGridParser } from '../src/parser/ChordGridParser';

describe('Time Signature Display Marking', () => {
  let parser: ChordGridParser;
  let renderer: SVGRenderer;

  beforeEach(() => {
    parser = new ChordGridParser();
    renderer = new SVGRenderer();
  });

  test('should mark measures for time signature display', () => {
    const input = `
4/4 | Em[88 88 88 88] | D[88 88 88 88] | Em[88 88 88 88] |
2/4 G[88 88] | C[88 88] |
G[88 88] | D[88 88] |
4/4 Em[88 88 88 88] | D[88 88 88 88]
`;
    
    const result = parser.parse(input);
    const grid = result.grid;
    
    // Render to trigger the marking logic
    const svg = renderer.render(grid, 'up');
    
    console.log('\n=== MEASURES WITH __shouldShowTimeSignature FLAG ===');
    grid.measures.forEach((measure, index) => {
      const shouldShow = (measure as any).__shouldShowTimeSignature;
      const ts = measure.timeSignature;
      const tsStr = ts ? `${ts.numerator}/${ts.denominator}` : 'inherit';
      const chord = measure.chordSegments?.[0]?.chord || measure.chord;
      
      if (shouldShow || ts) {
        console.log(`Measure ${index}: ${chord.padEnd(4)} (${tsStr}) - shouldShow: ${shouldShow}`);
      }
    });
    
    // Count how many measures should show time signature
    const markedMeasures = grid.measures.filter((m: any) => m.__shouldShowTimeSignature);
    console.log(`\nTotal measures marked for display: ${markedMeasures.length}`);
    
    // Should have at least 2 marks: 2/4 change and 4/4 change
    expect(markedMeasures.length).toBeGreaterThanOrEqual(2);
  });

  test('should mark user example correctly', () => {
    const input = `
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
    
    const result = parser.parse(input);
    const grid = result.grid;
    
    console.log('\n=== BEFORE RENDERING ===');
    console.log('Measures with timeSignature from parser:');
    grid.measures.forEach((measure, index) => {
      if (measure.timeSignature) {
        const chord = measure.chordSegments?.[0]?.chord || measure.chord;
        console.log(`  Measure ${index}: ${chord} - ${measure.timeSignature.numerator}/${measure.timeSignature.denominator}`);
      }
    });
    
    // Render to trigger the marking logic
    const svg = renderer.render(grid, 'up');
    
    console.log('\n=== AFTER RENDERING ===');
    console.log('Measures with __shouldShowTimeSignature:');
    grid.measures.forEach((measure, index) => {
      const shouldShow = (measure as any).__shouldShowTimeSignature;
      if (shouldShow) {
        const chord = measure.chordSegments?.[0]?.chord || measure.chord;
        const ts = measure.timeSignature;
        const tsStr = ts ? `${ts.numerator}/${ts.denominator}` : 'NO TS!';
        console.log(`  Measure ${index}: ${chord} - ${tsStr} - SHOULD SHOW`);
      }
    });
    
    const markedMeasures = grid.measures.filter((m: any) => m.__shouldShowTimeSignature);
    console.log(`\nTotal marked: ${markedMeasures.length}`);
    
    // Should mark: first 2/4, then 4/4, then 2/4 again, then 4/4 again
    expect(markedMeasures.length).toBeGreaterThanOrEqual(3);
  });
});
