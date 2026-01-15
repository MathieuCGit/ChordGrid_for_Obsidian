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

  // ========== NEW TESTS FOR RESPONSIVE BEHAVIOR FIX (Solution 2) ==========

  it('should maintain responsive width="100%" when zoom is applied', () => {
    const result = parser.parse('zoom:50%\n4/4 | C[4 4 4 4] |');
    const svg = renderer.render(result.grid, {
      zoomPercent: result.zoomPercent
    });
    
    // Critical: width="100%" must be preserved for responsiveness
    const widthAttr = svg.getAttribute('width');
    expect(widthAttr).toBe('100%');
    
    // Critical: style.width and style.height must NOT be set (they break responsiveness)
    expect(svg.style.width).toBe(''); // Should be empty, not "400px"
    expect(svg.style.height).toBe(''); // Should be empty, not "300px"
  });

  it('should apply zoom through viewBox scaling, not CSS dimensions', () => {
    // Test at 50% zoom
    const result50 = parser.parse('zoom:50%\n4/4 | C[4 4 4 4] |');
    const svg50 = renderer.render(result50.grid, {
      zoomPercent: result50.zoomPercent
    });
    
    const viewBox50 = svg50.getAttribute('viewBox');
    const [x50, y50, w50, h50] = viewBox50?.split(' ').map(Number) || [];
    
    // Test at 100% zoom (no zoom)
    const result100 = parser.parse('4/4 | C[4 4 4 4] |');
    const svg100 = renderer.render(result100.grid);
    
    const viewBox100 = svg100.getAttribute('viewBox');
    const [x100, y100, w100, h100] = viewBox100?.split(' ').map(Number) || [];
    
    // At 50% zoom, viewBox should be 2x larger (see 2x more content)
    // Formula: newViewBoxDim = originalDim / zoomScale
    // zoomScale = 0.5, so dimensions should be 2x (divide by 0.5 = multiply by 2)
    expect(w50).toBeCloseTo(w100 * 2, 0);
    expect(h50).toBeCloseTo(h100 * 2, 0);
  });

  it('should correctly scale viewBox for different zoom percentages', () => {
    const testCases = [
      { zoom: 50, expectedMultiplier: 2 },      // 50% → see 2x (1/0.5 = 2)
      { zoom: 100, expectedMultiplier: 1 },     // 100% → see 1x (1/1 = 1)
      { zoom: 200, expectedMultiplier: 0.5 }    // 200% → see 0.5x (1/2 = 0.5)
    ];
    
    const baseResult = parser.parse('4/4 | C[4 4 4 4] |');
    const baseSvg = renderer.render(baseResult.grid);
    const baseViewBox = baseSvg.getAttribute('viewBox');
    const [, , baseW, baseH] = baseViewBox?.split(' ').map(Number) || [];
    
    testCases.forEach(({ zoom, expectedMultiplier }) => {
      const result = parser.parse(`zoom:${zoom}%\n4/4 | C[4 4 4 4] |`);
      const svg = renderer.render(result.grid, {
        zoomPercent: result.zoomPercent
      });
      
      const viewBox = svg.getAttribute('viewBox');
      const [, , w, h] = viewBox?.split(' ').map(Number) || [];
      
      // Verify viewBox scaling matches expected multiplier
      expect(w).toBeCloseTo(baseW * expectedMultiplier, 0);
      expect(h).toBeCloseTo(baseH * expectedMultiplier, 0);
    });
  });

  it('should NOT have fixed CSS width/height that break responsiveness', () => {
    const zoomValues = [25, 50, 75, 100, 150, 200, 300];
    
    zoomValues.forEach(zoom => {
      const result = parser.parse(`zoom:${zoom}%\n4/4 | C[4 4 4 4] |`);
      const svg = renderer.render(result.grid, {
        zoomPercent: result.zoomPercent
      });
      
      // These CSS properties would break responsiveness
      expect(svg.style.width).toBe('', `zoom:${zoom}% should not have style.width`);
      expect(svg.style.height).toBe('', `zoom:${zoom}% should not have style.height`);
      
      // But width="100%" should always be present for responsiveness
      expect(svg.getAttribute('width')).toBe('100%', `zoom:${zoom}% should maintain width="100%"`);
    });
  });

  it('should calculate correct viewBox coordinates when zoom is applied', () => {
    const result = parser.parse('zoom:50%\n4/4 | C[4 4 4 4] |');
    const svg = renderer.render(result.grid, {
      zoomPercent: result.zoomPercent
    });
    
    const viewBox = svg.getAttribute('viewBox');
    const parts = viewBox?.split(' ').map(Number) || [];
    
    // Verify viewBox has all 4 required coordinates (x, y, width, height)
    expect(parts.length).toBe(4);
    expect(parts.every(v => typeof v === 'number')).toBe(true);
    
    // Width and height should be positive and > 0
    const [x, y, w, h] = parts;
    expect(w).toBeGreaterThan(0);
    expect(h).toBeGreaterThan(0);
    
    // y coordinate represents the top boundary (can be negative for chord space)
    expect(typeof y).toBe('number');
  });

  it('responsive behavior restored: SVG adapts to container width', () => {
    const result = parser.parse('zoom:75%\n4/4 | C[4 4 4 4] |');
    const svg = renderer.render(result.grid, {
      zoomPercent: result.zoomPercent
    });
    
    // Simulate container resize scenarios
    // With width="100%", the SVG should adapt to container width
    // (This is browser behavior, but we can verify the attribute exists)
    
    const widthAttr = svg.getAttribute('width');
    const viewBoxAttr = svg.getAttribute('viewBox');
    
    // width="100%" allows container to control width
    expect(widthAttr).toBe('100%');
    
    // viewBox scales content without forcing fixed dimensions
    expect(viewBoxAttr).toBeTruthy();
    
    // No style.width blocking the responsive behavior
    expect(svg.style.width).toBe('');
  });
});
