import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;

describe('Zoom height scaling - prevents transparent space and double-zoom', () => {
  let parser: ChordGridParser;
  let renderer: SVGRenderer;

  beforeEach(() => {
    parser = new ChordGridParser();
    renderer = new SVGRenderer();
  });

  it('zoom:50% - SVG height is 50% of normal, content at 50% (prevents double-zoom)', () => {
    // Parse with zoom:50%
    const result50 = parser.parse('zoom:50%\n|[8.16_ 88 -88 4]|');
    const svg50 = renderer.render(result50.grid, {
      zoomPercent: result50.zoomPercent
    });

    // Parse at 100% (no zoom)
    const result100 = parser.parse('|[8.16_ 88 -88 4]|');
    const svg100 = renderer.render(result100.grid);

    // Get SVG heights and viewBox dimensions
    const height50 = parseInt(svg50.getAttribute('height')!);
    const height100 = parseInt(svg100.getAttribute('height')!);
    
    const viewBox50 = svg50.getAttribute('viewBox')!.split(' ').map(Number);
    const viewBox100 = svg100.getAttribute('viewBox')!.split(' ').map(Number);

    // SVG height should scale by zoomScale: height = totalHeight * 0.5
    expect(height50).toBeCloseTo(height100 * 0.5, 0);

    // ViewBox must remain constant (no division by zoomScale to prevent double-zoom)
    expect(viewBox50[2]).toBeCloseTo(viewBox100[2], 0); // width
    expect(viewBox50[3]).toBeCloseTo(viewBox100[3], 0); // height
  });

  it('zoom:150% - SVG height is 150% of normal, content at 150%', () => {
    // Parse with zoom:150%
    const result150 = parser.parse('zoom:150%\n|[8.16_ 88 -88 4]|');
    const svg150 = renderer.render(result150.grid, {
      zoomPercent: result150.zoomPercent
    });

    // Parse at 100% (no zoom)
    const result100 = parser.parse('|[8.16_ 88 -88 4]|');
    const svg100 = renderer.render(result100.grid);

    // Get SVG heights and viewBox
    const height150 = parseInt(svg150.getAttribute('height')!);
    const height100 = parseInt(svg100.getAttribute('height')!);
    
    const viewBox150 = svg150.getAttribute('viewBox')!.split(' ').map(Number);
    const viewBox100 = svg100.getAttribute('viewBox')!.split(' ').map(Number);

    // SVG height should scale by zoomScale: height = totalHeight * 1.5
    expect(height150).toBeCloseTo(height100 * 1.5, 0);

    // ViewBox must remain constant
    expect(viewBox150[2]).toBeCloseTo(viewBox100[2], 0);
    expect(viewBox150[3]).toBeCloseTo(viewBox100[3], 0);
  });

  it('background rect matches viewBox dimensions - no double-zoom effect', () => {
    // At zoom:50%, verify background rect matches viewBox exactly
    const result = parser.parse('zoom:50%\n|[8.16_ 88 -88 4]|');
    const svg = renderer.render(result.grid, {
      zoomPercent: result.zoomPercent
    });

    // Get viewBox dimensions
    const viewBox = svg.getAttribute('viewBox');
    const [vbX, vbY, vbW, vbH] = viewBox?.split(' ').map(Number) || [];

    // Get background rect dimensions
    const bg = svg.querySelector('rect');
    if (!bg) throw new Error('No background rect found');

    const bgX = parseFloat(bg.getAttribute('x') || '0');
    const bgY = parseFloat(bg.getAttribute('y') || '0');
    const bgW = parseFloat(bg.getAttribute('width') || '0');
    const bgH = parseFloat(bg.getAttribute('height') || '0');

    // Rectangle must match viewBox exactly (staying at normal scale, not divided)
    expect(bgX).toBeCloseTo(0, 1);
    expect(bgY).toBeCloseTo(vbY, 1);
    expect(bgW).toBeCloseTo(vbW, 1);
    expect(bgH).toBeCloseTo(vbH, 1);
  });

  it('aspect ratio is preserved at all zoom levels', () => {
    // Verify aspect ratio doesn't change regardless of zoom level
    const baseResult = parser.parse('|[8.16_ 88 -88 4]|');
    const baseSvg = renderer.render(baseResult.grid);
    const baseViewBox = baseSvg.getAttribute('viewBox')!.split(' ').map(Number);
    const baseAspectRatio = baseViewBox[2] / baseViewBox[3]; // width / height

    const zoomLevels = [25, 50, 75, 100, 150, 200];

    zoomLevels.forEach(zoom => {
      const result = parser.parse(`zoom:${zoom}%\n|[8.16_ 88 -88 4]|`);
      const svg = renderer.render(result.grid, {
        zoomPercent: result.zoomPercent
      });

      const viewBox = svg.getAttribute('viewBox')!.split(' ').map(Number);
      const aspectRatio = viewBox[2] / viewBox[3];

      // Aspect ratio must remain identical at all zoom levels
      expect(aspectRatio).toBeCloseTo(baseAspectRatio, 2);
    });
  });

  it('width="100%" remains responsive across all zoom levels', () => {
    // Verify SVG stays responsive (width=100%) while height is fixed
    const zoomLevels = [25, 50, 75, 100, 150, 200];

    zoomLevels.forEach(zoom => {
      const result = parser.parse(`zoom:${zoom}%\n|[8.16_ 88 -88 4]|`);
      const svg = renderer.render(result.grid, {
        zoomPercent: result.zoomPercent
      });

      // Width must always be 100% for responsiveness
      expect(svg.getAttribute('width')).toBe('100%');

      // Height should be a numeric value (scaled), not a percentage
      const height = svg.getAttribute('height');
      expect(height).toBeTruthy();
      expect(!isNaN(parseInt(height!))).toBe(true);
    });
  });

  it('no inline CSS styles that would break responsiveness', () => {
    // Verify style attributes don't override responsive behavior
    const zoomLevels = [25, 50, 75, 100, 150, 200];

    zoomLevels.forEach(zoom => {
      const result = parser.parse(`zoom:${zoom}%\n|[8.16_ 88 -88 4]|`);
      const svg = renderer.render(result.grid, {
        zoomPercent: result.zoomPercent
      });

      // Inline styles would override responsive dimensions
      expect(svg.style.width).toBe('');
      expect(svg.style.height).toBe('');
    });
  });

  it('SVG height scales correctly for all zoom percentages', () => {
    // Verify height scaling formula: height = totalHeight * zoomScale
    const testCases = [
      { zoom: 25, expectedMultiplier: 0.25 },
      { zoom: 50, expectedMultiplier: 0.5 },
      { zoom: 100, expectedMultiplier: 1 },
      { zoom: 150, expectedMultiplier: 1.5 },
      { zoom: 200, expectedMultiplier: 2 }
    ];

    const baseResult = parser.parse('|[8.16_ 88 -88 4]|');
    const baseSvg = renderer.render(baseResult.grid);
    const baseHeight = parseFloat(baseSvg.getAttribute('height')!);

    testCases.forEach(({ zoom, expectedMultiplier }) => {
      const result = parser.parse(`zoom:${zoom}%\n|[8.16_ 88 -88 4]|`);
      const svg = renderer.render(result.grid, {
        zoomPercent: result.zoomPercent
      });

      const height = parseFloat(svg.getAttribute('height')!);
      
      // Height must scale accurately by zoom multiplier
      expect(height).toBeCloseTo(baseHeight * expectedMultiplier, 0);
    });
  });

  it('content is left-aligned via preserveAspectRatio', () => {
    // Verify SVG content aligns to left (not centered) at all zoom levels
    const zoomLevels = [25, 50, 75, 100, 150, 200];

    zoomLevels.forEach(zoom => {
      const result = parser.parse(`zoom:${zoom}%\n|[8.16_ 88 -88 4]|`);
      const svg = renderer.render(result.grid, {
        zoomPercent: result.zoomPercent
      });

      // preserveAspectRatio="xMinYMid meet" aligns viewBox to left (xMin)
      const preserveAR = svg.getAttribute('preserveAspectRatio');
      expect(preserveAR).toBe('xMinYMid meet');
    });
  });
});


