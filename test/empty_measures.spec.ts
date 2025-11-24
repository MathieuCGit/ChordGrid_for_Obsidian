/**
 * Tests for empty measures rendering
 */

import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

describe('Empty Measures', () => {
  it('should parse and create empty measures without measures-per-line directive', () => {
    const input = `
4/4 ||:.1-3 CM7 | Am7 | | FM7 :||
    `.trim();
    
    const parser = new ChordGridParser();
    const result = parser.parse(input);
    
    // Should have 4 measures: CM7, Am7, empty, FM7
    expect(result.grid.measures.length).toBe(4);
    
    // Third measure should be marked as empty
    const emptyMeasure = result.grid.measures[2] as any;
    expect(emptyMeasure.__isEmpty).toBe(true);
    expect(emptyMeasure.beats.length).toBe(0);
    expect(emptyMeasure.chord).toBe('');
  });
  
  it('should render empty measures correctly', () => {
    const input = `
picks-auto stems-down
4/4 ||:.1-3 CM7 | Am7b5 / Bb7#5 | Em7/9[161616-16 -4] G6[161616-16 4] | FM7(#11)/A / G7(#9)(b13) :||
|.4 EbM7#11 | | ||
    `.trim();
    
    const parser = new ChordGridParser();
    const result = parser.parse(input);
    
    // Should have 7 measures total (including potential final empty measure from ||)
    expect(result.grid.measures.length).toBe(7);
    
    // Sixth measure (second line, second position) should be empty
    const emptyMeasure = result.grid.measures[5] as any;
    expect(emptyMeasure.__isEmpty).toBe(true);
    
    // Should render without errors
    const renderer = new SVGRenderer();
    const svg = renderer.render(result.grid, {
      stemsDirection: 'down',
      pickStrokes: 'auto'
    });
    
    expect(svg).toBeDefined();
    expect(svg.tagName).toBe('svg');
  });
  
  it('should handle multiple consecutive empty measures', () => {
    const input = `
4/4 CM7 | | | FM7 | ||
    `.trim();
    
    const parser = new ChordGridParser();
    const result = parser.parse(input);
    
    // Should have 5 measures: CM7, empty, empty, FM7, (possibly last empty before ||)
    expect(result.grid.measures.length).toBeGreaterThanOrEqual(4);
    
    // Second and third measures should be empty
    expect((result.grid.measures[1] as any).__isEmpty).toBe(true);
    expect((result.grid.measures[2] as any).__isEmpty).toBe(true);
  });
  
  it('should handle empty measures with volta brackets', () => {
    const input = `
4/4 ||:.1 CM7 | | :|
|.2 | FM7 | ||
    `.trim();
    
    const parser = new ChordGridParser();
    const result = parser.parse(input);
    
    // Should create empty measures with volta markers
    expect(result.grid.measures.length).toBeGreaterThanOrEqual(4);
    
    // Check that volta markers are preserved on empty measures
    const firstEmpty = result.grid.measures[1] as any;
    expect(firstEmpty.__isEmpty).toBe(true);
    
    const secondLineFirstMeasure = result.grid.measures[3] as any;
    expect(secondLineFirstMeasure.__isEmpty).toBe(true);
    expect(secondLineFirstMeasure.voltaStart).toBeDefined();
  });
});
