import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

describe('Repeat Count x8 Layout Issue', () => {
  let parser: ChordGridParser;
  let renderer: SVGRenderer;

  beforeEach(() => {
    parser = new ChordGridParser();
    renderer = new SVGRenderer();
  });

  test('x8 repeat count should not overflow SVG bounds', () => {
    const input = '4/4 ||: Em | C / D |Em |G / D :||x8';
    const result = parser.parse(input);
    
    // Verify parsing
    expect(result.grid.measures).toHaveLength(4);
    const lastMeasure = result.grid.measures[3];
    expect((lastMeasure as any).repeatCount).toBe(8);
    expect((lastMeasure as any).isRepeatEnd).toBe(true);
    
    // Render
    const svg = renderer.render(result.grid);
    expect(svg).toBeDefined();
    expect(svg.tagName).toBe('svg');
    
    // Extract viewBox dimensions
    const viewBox = svg.getAttribute('viewBox');
    expect(viewBox).toBeTruthy();
    
    const viewBoxParts = viewBox!.split(' ').map(parseFloat);
    const svgWidth = viewBoxParts[2];
    
    // Find the x8 text element
    const textElements = Array.from(svg.querySelectorAll('text'));
    const x8Text = textElements.find(el => el.textContent === 'x8');
    
    expect(x8Text).toBeTruthy();
    
    if (x8Text) {
      const textX = parseFloat(x8Text.getAttribute('x') || '0');
      const fontSize = parseFloat(x8Text.getAttribute('font-size') || '22');
      
      // Approximate text width: "x8" at 22px ≈ 30px
      const estimatedTextWidth = 30;
      const textRightEdge = textX + estimatedTextWidth;
      
      // The text should be fully contained within the SVG viewBox
      expect(textRightEdge).toBeLessThanOrEqual(svgWidth);
      
      console.log(`SVG Width: ${svgWidth}px, x8 position: ${textX}px, right edge: ${textRightEdge}px`);
    }
  });

  test('x10 (double digit) repeat count should not overflow', () => {
    const input = '4/4 ||: Em | C / D :||x10';
    const result = parser.parse(input);
    
    expect((result.grid.measures[1] as any).repeatCount).toBe(10);
    
    const svg = renderer.render(result.grid);
    const viewBox = svg.getAttribute('viewBox');
    const svgWidth = parseFloat(viewBox!.split(' ')[2]);
    
    const textElements = Array.from(svg.querySelectorAll('text'));
    const x10Text = textElements.find(el => el.textContent === 'x10');
    
    expect(x10Text).toBeTruthy();
    
    if (x10Text) {
      const textX = parseFloat(x10Text.getAttribute('x') || '0');
      // Double digit: "x10" at 22px ≈ 40px
      const estimatedTextWidth = 40;
      const textRightEdge = textX + estimatedTextWidth;
      
      expect(textRightEdge).toBeLessThanOrEqual(svgWidth);
      
      console.log(`SVG Width: ${svgWidth}px, x10 position: ${textX}px, right edge: ${textRightEdge}px`);
    }
  });

  test('Multiple lines with repeat counts should all fit', () => {
    const input = `4/4 ||: Em | C / D :||x3
| G | Am :||x5`;
    const result = parser.parse(input);
    
    const svg = renderer.render(result.grid);
    const viewBox = svg.getAttribute('viewBox');
    const svgWidth = parseFloat(viewBox!.split(' ')[2]);
    
    const textElements = Array.from(svg.querySelectorAll('text'));
    
    // Check x3
    const x3Text = textElements.find(el => el.textContent === 'x3');
    expect(x3Text).toBeTruthy();
    if (x3Text) {
      const textX = parseFloat(x3Text.getAttribute('x') || '0');
      expect(textX + 30).toBeLessThanOrEqual(svgWidth);
    }
    
    // Check x5
    const x5Text = textElements.find(el => el.textContent === 'x5');
    expect(x5Text).toBeTruthy();
    if (x5Text) {
      const textX = parseFloat(x5Text.getAttribute('x') || '0');
      expect(textX + 30).toBeLessThanOrEqual(svgWidth);
    }
  });
});
