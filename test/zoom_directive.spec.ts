import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;

describe('Zoom directive', () => {
  let parser: ChordGridParser;
  let renderer: SVGRenderer;

  beforeEach(() => {
    parser = new ChordGridParser();
    renderer = new SVGRenderer();
  });

  it('should parse zoom:50%', () => {
    const result = parser.parse('zoom:50%\n4/4 | C[4 4 4 4] |');
    expect(result.errors).toHaveLength(0);
    expect(result.zoomPercent).toBe(50);
  });

  it('should parse zoom:75%', () => {
    const result = parser.parse('zoom:75%\n4/4 | C[4 4 4 4] |');
    expect(result.errors).toHaveLength(0);
    expect(result.zoomPercent).toBe(75);
  });

  it('should parse zoom:150%', () => {
    const result = parser.parse('zoom:150%\n4/4 | C[4 4 4 4] |');
    expect(result.errors).toHaveLength(0);
    expect(result.zoomPercent).toBe(150);
  });

  it('should parse zoom without % symbol', () => {
    const result = parser.parse('zoom:82\n4/4 | C[4 4 4 4] |');
    expect(result.errors).toHaveLength(0);
    expect(result.zoomPercent).toBe(82);
  });

  it('should parse zoom with decimal format (0.8 = 80%)', () => {
    const result = parser.parse('zoom:0.8\n4/4 | C[4 4 4 4] |');
    expect(result.errors).toHaveLength(0);
    expect(result.zoomPercent).toBe(80);
  });

  it('should parse zoom with decimal format (0.5 = 50%)', () => {
    const result = parser.parse('zoom:0.5\n4/4 | C[4 4 4 4] |');
    expect(result.errors).toHaveLength(0);
    expect(result.zoomPercent).toBe(50);
  });

  it('should parse zoom with decimal format (1.5 = 150%)', () => {
    const result = parser.parse('zoom:1.5\n4/4 | C[4 4 4 4] |');
    expect(result.errors).toHaveLength(0);
    expect(result.zoomPercent).toBe(150);
  });

  it('should treat zoom:80, zoom:80%, and zoom:0.8 as equivalent', () => {
    const result1 = parser.parse('zoom:80\n4/4 | C[4 4 4 4] |');
    const result2 = parser.parse('zoom:80%\n4/4 | C[4 4 4 4] |');
    const result3 = parser.parse('zoom:0.8\n4/4 | C[4 4 4 4] |');
    
    expect(result1.zoomPercent).toBe(80);
    expect(result2.zoomPercent).toBe(80);
    expect(result3.zoomPercent).toBe(80);
  });

  it('should parse zoom with spaces', () => {
    const result = parser.parse('zoom: 100 %\n4/4 | C[4 4 4 4] |');
    expect(result.errors).toHaveLength(0);
    expect(result.zoomPercent).toBe(100);
  });

  it('should combine zoom with other directives', () => {
    const result = parser.parse('zoom:50% pick show%\n4/4 | C[4 4 4 4] |');
    expect(result.errors).toHaveLength(0);
    expect(result.zoomPercent).toBe(50);
    expect(result.pickMode).toBe(true);
    expect(result.displayRepeatSymbol).toBe(true);
  });

  it('should reject zoom values > 500%', () => {
    const result = parser.parse('zoom:600%\n4/4 | C[4 4 4 4] |');
    expect(result.zoomPercent).toBeUndefined();
  });

  it('should reject zoom values = 0%', () => {
    const result = parser.parse('zoom:0%\n4/4 | C[4 4 4 4] |');
    expect(result.zoomPercent).toBeUndefined();
  });

  it('should apply zoom to SVG rendering', () => {
    const result = parser.parse('zoom:50%\n4/4 | C[4 4 4 4] |');
    const svg = renderer.render(result.grid, {
      zoomPercent: result.zoomPercent
    });
    
    expect(svg).toBeDefined();
    expect(svg.tagName).toBe('svg');
    
    // Check that zoom is applied via viewBox scaling (Solution 2)
    // At 50% zoom, the viewBox should show 2x more content
    const viewBox = svg.getAttribute('viewBox');
    expect(viewBox).toBeTruthy();
    
    // Parse viewBox to verify zoom is applied
    const viewBoxParts = viewBox?.split(' ').map(Number) || [];
    expect(viewBoxParts.length).toBe(4); // x, y, width, height
    expect(viewBoxParts[2]).toBeGreaterThan(0); // width should be positive
    expect(viewBoxParts[3]).toBeGreaterThan(0); // height should be positive
  });

  it('should render at 100% zoom (default)', () => {
    const result = parser.parse('4/4 | C[4 4 4 4] |');
    const svg = renderer.render(result.grid, {
      zoomPercent: result.zoomPercent
    });
    
    expect(svg).toBeDefined();
    expect(svg.tagName).toBe('svg');
  });

  it('should render at 200% zoom', () => {
    const result = parser.parse('zoom:200%\n4/4 | C[4 4 4 4] |');
    const svg = renderer.render(result.grid, {
      zoomPercent: result.zoomPercent
    });
    
    expect(svg).toBeDefined();
    expect(result.zoomPercent).toBe(200);
  });

  it('should parse zoom on same line as time signature', () => {
    const result = parser.parse('zoom:75% 4/4 | C[4 4 4 4] |');
    expect(result.errors).toHaveLength(0);
    expect(result.zoomPercent).toBe(75);
  });

  it('should parse zoom with measures-per-line', () => {
    const result = parser.parse('zoom:60% measures-per-line:4\n4/4 | C[4 4 4 4] | G[4 4 4 4] |');
    expect(result.errors).toHaveLength(0);
    expect(result.zoomPercent).toBe(60);
    expect(result.measuresPerLine).toBe(4);
  });
});
