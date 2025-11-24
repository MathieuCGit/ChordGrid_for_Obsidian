import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

describe('Debug volta rendering', () => {
  test('User case: volta render on multiple lines', () => {
    const input = `measures-per-line:4 picks-auto
4/4 ||:.1-3 C[88 81616_16-161616 88] | G[%] | 
| F[16161616_88 88 4] :||.4 Am[88_4 4.8] ||`;

    const parser = new ChordGridParser();
    const result = parser.parse(input);
    
    console.log('\n=== MEASURES ===');
    result.grid.measures.forEach((measure: any, i) => {
      console.log(`Measure ${i}:`);
      console.log('  chord:', measure.chord);
      console.log('  voltaStart:', measure.voltaStart);
      console.log('  voltaEnd:', measure.voltaEnd);
    });

    const renderer = new SVGRenderer();
    const svg = renderer.render(result.grid);
    
    // Debug: check PlaceAndSizeManager
    console.log('\n=== SVG INFO ===');
    console.log('SVG width:', svg.getAttribute('width'));
    console.log('SVG height:', svg.getAttribute('height'));
    console.log('SVG has content:', svg.children.length > 0);
    
    // Find all g elements
    const groups = svg.querySelectorAll('g');
    console.log('Total g elements:', groups.length);
    
    // Find all volta-related elements
    const voltaBrackets = svg.querySelectorAll('[data-volta]');
    console.log('\n=== VOLTA ELEMENTS ===');
    console.log('Total volta elements:', voltaBrackets.length);
    voltaBrackets.forEach((el, i) => {
      console.log(`Element ${i}:`, el.tagName, el.getAttribute('data-volta'));
    });
    
    expect(svg).toBeDefined();
  });
});
