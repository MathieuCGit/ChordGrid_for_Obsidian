import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

describe('Repeat Count Notation', () => {
  let parser: ChordGridParser;
  let renderer: SVGRenderer;

  beforeEach(() => {
    parser = new ChordGridParser();
    renderer = new SVGRenderer();
  });

  describe('Parsing', () => {
    it('should parse :||x3 and extract repeat count', () => {
      const input = '4/4 | C[4 4 4 4] :||x3';
      const result = parser.parse(input);
      
      expect(result.grid.measures).toHaveLength(1);
      expect(result.grid.measures[0].barline).toBe(':||');
      expect((result.grid.measures[0] as any).isRepeatEnd).toBe(true);
      expect((result.grid.measures[0] as any).repeatCount).toBe(3);
    });

    it('should parse :||x2 with different numbers', () => {
      const input = '4/4 | C[4 4 4 4] :||x2';
      const result = parser.parse(input);
      
      expect((result.grid.measures[0] as any).repeatCount).toBe(2);
    });

    it('should work with repeat measures', () => {
      const input = '4/4 ||: C[4 4 4 4] | % :||x3';
      const result = parser.parse(input);
      
      expect(result.grid.measures).toHaveLength(2);
      expect((result.grid.measures[1] as any).repeatCount).toBe(3);
      expect((result.grid.measures[1] as any).isRepeatEnd).toBe(true);
      expect((result.grid.measures[1] as any).isRepeat).toBe(true);
    });

    it('should work with complex repeat patterns', () => {
      const input = '4/4 ||: C[4 88_4 4] | % | G[%] | % :||x3';
      const result = parser.parse(input);
      
      expect(result.grid.measures).toHaveLength(4);
      expect(result.grid.measures[0].chord).toBe('C');
      expect((result.grid.measures[0] as any).isRepeatStart).toBe(true);
      expect(result.grid.measures[3].chord).toBe('G');
      expect((result.grid.measures[3] as any).isRepeatEnd).toBe(true);
      expect((result.grid.measures[3] as any).repeatCount).toBe(3);
    });
  });

  describe('Rendering', () => {
    it('should render x3 text after :|| barline', () => {
      const input = '4/4 | C[4 4 4 4] :||x3';
      const result = parser.parse(input);
      const svg = renderer.render(result.grid);
      const svgString = svg.outerHTML;
      
      expect(svgString).toContain('>x3<');
      expect(svgString).toMatch(/<text[^>]*font-size="22px"[^>]*>x3<\/text>/);
    });

    it('should render x2 text correctly', () => {
      const input = '4/4 | C[4 4 4 4] :||x2';
      const result = parser.parse(input);
      const svg = renderer.render(result.grid);
      const svgString = svg.outerHTML;
      
      expect(svgString).toContain('>x2<');
    });

    it('should render repeat count with show% directive', () => {
      const input = 'show%\n4/4 ||: C[4 4 4 4] | % :||x3';
      const result = parser.parse(input);
      const svg = renderer.render(result.grid, { displayRepeatSymbol: true });
      const svgString = svg.outerHTML;
      
      expect(svgString).toContain('>x3<');
      // Should also have repeat symbol
      expect(svgString).toContain('data-repeat-symbol="true"');
    });

    it('should position repeat count to the right of barline', () => {
      const input = '4/4 | C[4 4 4 4] :||x3';
      const result = parser.parse(input);
      const svg = renderer.render(result.grid);
      const svgString = svg.outerHTML;
      
      // Extract x attribute from text element
      const match = /<text x="(\d+)"[^>]*>x3<\/text>/.exec(svgString);
      expect(match).toBeTruthy();
      if (match) {
        const xPos = parseInt(match[1], 10);
        // x should be > 0 (positioned somewhere on the canvas)
        expect(xPos).toBeGreaterThan(0);
      }
    });
  });

  describe('Edge cases', () => {
    it('should not add repeat count to normal barlines', () => {
      const input = '4/4 | C[4 4 4 4] |';
      const result = parser.parse(input);
      
      expect((result.grid.measures[0] as any).repeatCount).toBeUndefined();
    });

    it('should not add repeat count to || barlines', () => {
      const input = '4/4 | C[4 4 4 4] ||';
      const result = parser.parse(input);
      
      expect((result.grid.measures[0] as any).repeatCount).toBeUndefined();
    });

    it('should not add repeat count to ||: barlines', () => {
      const input = '4/4 ||: C[4 4 4 4] |';
      const result = parser.parse(input);
      
      expect((result.grid.measures[0] as any).repeatCount).toBeUndefined();
    });
  });
});
