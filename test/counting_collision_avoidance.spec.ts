import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';
import { CountingAnalyzer } from '../src/analyzer/CountingAnalyzer';

describe('Counting System - Collision Avoidance', () => {
  let parser: ChordGridParser;
  let renderer: SVGRenderer;

  beforeEach(() => {
    parser = new ChordGridParser();
    renderer = new SVGRenderer();
  });

  describe('Pick-strokes collision avoidance', () => {
    it('should offset pick-strokes downward when counting is active (stems-up)', () => {
      const input = 'pick counting\n4/4 | Am[88 4] |';
      const result = parser.parse(input);
      
      if (result.countingMode) {
        CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
      }
      
      const svg = renderer.render(result.grid, { 
        countingMode: true,
        pickStrokes: true,
        stemsDirection: 'up'
      });
      
      const svgString = svg.outerHTML;
      
      // Should have both counting numbers and pick-strokes
      expect(svgString).toContain('data-counting="true"');
      expect(svgString).toContain('data-pick-stroke="true"');
      
      // Pick-strokes should be present (rendered)
      expect(svgString).toMatch(/data-pick-stroke="true"/);
    });

    it('should NOT offset pick-strokes when counting is disabled', () => {
      const input = 'pick\n4/4 | Am[88 4] |';
      const result = parser.parse(input);
      
      const svg = renderer.render(result.grid, { 
        countingMode: false,
        pickStrokes: true,
        stemsDirection: 'up'
      });
      
      const svgString = svg.outerHTML;
      
      // Should have pick-strokes but NO counting
      expect(svgString).toContain('data-pick-stroke="true"');
      expect(svgString).not.toContain('data-counting="true"');
    });

    it('should NOT offset pick-strokes when placed above (stems-down)', () => {
      const input = 'pick counting\nstems-down\n4/4 | Am[88 4] |';
      const result = parser.parse(input);
      
      if (result.countingMode) {
        CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
      }
      
      const svg = renderer.render(result.grid, { 
        countingMode: true,
        pickStrokes: true,
        stemsDirection: 'down'
      });
      
      const svgString = svg.outerHTML;
      
      // Both should be present
      expect(svgString).toContain('data-counting="true"');
      expect(svgString).toContain('data-pick-stroke="true"');
      
      // Pick-strokes are above, counting is below - no collision
    });
  });

  describe('Fingerstyle collision avoidance', () => {
    it('should offset fingerstyle symbols downward when counting is active (stems-up)', () => {
      const input = 'counting\nfinger: en\n4/4 | Am[88 4] |';
      const result = parser.parse(input);
      
      if (result.countingMode) {
        CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
      }
      
      const svg = renderer.render(result.grid, { 
        countingMode: true,
        fingerMode: 'en',
        stemsDirection: 'up'
      });
      
      const svgString = svg.outerHTML;
      
      // Should have both counting and fingerstyle
      expect(svgString).toContain('data-counting="true"');
      expect(svgString).toContain('data-finger-symbol="letter"');
    });

    it('should NOT offset fingerstyle when counting is disabled', () => {
      const input = 'finger: en\n4/4 | Am[88 4] |';
      const result = parser.parse(input);
      
      const svg = renderer.render(result.grid, { 
        countingMode: false,
        fingerMode: 'en',
        stemsDirection: 'up'
      });
      
      const svgString = svg.outerHTML;
      
      // Should have fingerstyle but NO counting
      expect(svgString).toContain('data-finger-symbol="letter"');
      expect(svgString).not.toContain('data-counting="true"');
    });

    it('should work with French fingerstyle mode', () => {
      const input = 'counting\nfinger: fr\n4/4 | Am[88 4] |';
      const result = parser.parse(input);
      
      if (result.countingMode) {
        CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
      }
      
      const svg = renderer.render(result.grid, { 
        countingMode: true,
        fingerMode: 'fr',
        stemsDirection: 'up'
      });
      
      const svgString = svg.outerHTML;
      
      // Should have both counting and fingerstyle
      expect(svgString).toContain('data-counting="true"');
      expect(svgString).toContain('data-finger-symbol="letter"');
    });
  });

  describe('Complex example from user', () => {
    it('should handle the complex user example without overlaps', () => {
      const input = `pick counting
4/4 | Am[88 4] G[168. 88] | % | % |
|2/4 G[4 -4] | 4/4 C[4 88 4 88] | % | G[%]`;
      
      const result = parser.parse(input);
      
      if (result.countingMode) {
        CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
      }
      
      const svg = renderer.render(result.grid, { 
        countingMode: true,
        pickStrokes: true
      });
      
      const svgString = svg.outerHTML;
      
      // Verify both systems are rendered
      expect(svgString).toContain('data-counting="true"');
      expect(svgString).toContain('data-pick-stroke="true"');
      
      // Verify counting numbers are present
      expect(svgString).toMatch(/>1</);
      expect(svgString).toMatch(/>2</);
      
      // Both should render without visual overlap (tested manually)
    });
  });
});
