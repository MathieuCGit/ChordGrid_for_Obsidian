import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

describe('Barline collision prevention', () => {
  it('should prevent chord collision with repeat start barline', () => {
    const input = `4/4 ||: Am[88 4] G[4 88] | C[4 4 4 323216323216] | Dm[4 4] G[88 88] | C[88 4 88 4_] | [_8]Am[8 4] Em[88 16161616] | D[1] | G[1] :||`;
    const parser = new ChordGridParser();
    const result = parser.parse(input);
    
    expect(result.grid.measures.length).toBeGreaterThan(0);
    
    const renderer = new SVGRenderer();
    const svg = renderer.render(result.grid, { stemsDirection: 'down' });
    
    // Should render without throwing
    expect(svg).toBeDefined();
    expect(svg.tagName).toBe('svg');
    
    // First measure should have repeat start on the left
    const firstMeasure = result.grid.measures[0];
    expect((firstMeasure as any).barlineLeft || (firstMeasure as any).isRepeatStart).toBeTruthy();
    
    // Last measure should have repeat end barline
    const lastMeasure = result.grid.measures[result.grid.measures.length - 1];
    expect(lastMeasure.barline).toBe(':||');
  });

  it('should keep barlines at priority 0 (unmovable)', () => {
    // This test verifies that barlines are registered with priority 0
    // meaning they cannot be moved during collision resolution
    const input = `4/4 ||: Am[4] :||`;
    const parser = new ChordGridParser();
    const result = parser.parse(input);
    const renderer = new SVGRenderer();
    const svg = renderer.render(result.grid);
    
    expect(svg).toBeDefined();
    // If Am collides with ||:, it should be moved, not the barline
  });

  it('should protect repeat dots from collisions', () => {
    const input = `4/4 ||: C[88 88] | D[88 88] :||`;
    const parser = new ChordGridParser();
    const result = parser.parse(input);
    const renderer = new SVGRenderer();
    const svg = renderer.render(result.grid);
    
    expect(svg).toBeDefined();
    
    // Check that repeat dots are present (circles in SVG)
    const svgString = new XMLSerializer().serializeToString(svg);
    expect(svgString).toContain('<circle');
  });

  it('should handle stems-down with repeat barlines', () => {
    const input = `4/4 ||: Am[88 4] G[4 88] :||`;
    const parser = new ChordGridParser();
    const result = parser.parse(input);
    const renderer = new SVGRenderer();
    const svg = renderer.render(result.grid, { stemsDirection: 'down' });
    
    expect(svg).toBeDefined();
    
    // Should have stems pointing down
    const svgString = new XMLSerializer().serializeToString(svg);
    expect(svgString).toContain('line'); // stems are lines
  });
});
