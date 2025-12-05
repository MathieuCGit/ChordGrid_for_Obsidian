import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';
import { CountingAnalyzer } from '../src/analyzer/CountingAnalyzer';

describe('Counting System Integration', () => {
  let parser: ChordGridParser;
  let renderer: SVGRenderer;

  beforeEach(() => {
    parser = new ChordGridParser();
    renderer = new SVGRenderer();
  });

  describe('Parsing with count directive', () => {
    it('should parse count directive and return countingMode', () => {
      const input = 'count\n4/4 | C[4 4 4 4] |';
      const result = parser.parse(input);
      
      expect(result.countingMode).toBe(true);
    });

    it('should parse counting directive and return countingMode', () => {
      const input = 'counting\n4/4 | C[4 4 4 4] |';
      const result = parser.parse(input);
      
      expect(result.countingMode).toBe(true);
    });

    it('should not activate countingMode without directive', () => {
      const input = '4/4 | C[4 4 4 4] |';
      const result = parser.parse(input);
      
      expect(result.countingMode).toBeUndefined();
    });
  });

  describe('Automatic CountingAnalyzer invocation', () => {
    it('should automatically assign counting numbers when countingMode is true', () => {
      const input = 'count\n4/4 | C[4 4 4 4] |';
      const result = parser.parse(input);
      
      // Simulate what main.ts does: call CountingAnalyzer when countingMode is true
      if (result.countingMode) {
        CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
      }
      
      // Check that notes have counting information
      const notes = result.measures[0].beats.flatMap(b => b.notes);
      
      // All notes should have counting numbers
      expect(notes.every(n => n.countingNumber !== undefined)).toBe(true);
      expect(notes.every(n => n.countingSize !== undefined)).toBe(true);
      
      // Check specific values
      expect(notes[0].countingNumber).toBe(1);
      expect(notes[0].countingSize).toBe('t'); // First note of beat
      expect(notes[1].countingNumber).toBe(2);
      expect(notes[1].countingSize).toBe('t');
      expect(notes[2].countingNumber).toBe(3);
      expect(notes[2].countingSize).toBe('t');
      expect(notes[3].countingNumber).toBe(4);
      expect(notes[3].countingSize).toBe('t');
    });

    it('should handle eighth notes with correct sizing', () => {
      const input = 'count\n4/4 | C[88 88 88 88] |';
      const result = parser.parse(input);
      
      if (result.countingMode) {
        CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
      }
      
      const allNotes = result.measures[0].beats.flatMap(b => b.notes);
      
      // Should have 8 notes with alternating t/m sizing
      expect(allNotes.length).toBe(8);
      
      // First note of each beat should be 't' (tall)
      expect(allNotes[0].countingSize).toBe('t'); // Beat 1 start
      expect(allNotes[1].countingSize).toBe('m'); // Beat 1 subdivision
      expect(allNotes[2].countingSize).toBe('t'); // Beat 2 start
      expect(allNotes[3].countingSize).toBe('m'); // Beat 2 subdivision
      expect(allNotes[4].countingSize).toBe('t'); // Beat 3 start
      expect(allNotes[5].countingSize).toBe('m'); // Beat 3 subdivision
      expect(allNotes[6].countingSize).toBe('t'); // Beat 4 start
      expect(allNotes[7].countingSize).toBe('m'); // Beat 4 subdivision
    });

    it('should mark rests with size s (small)', () => {
      const input = 'count\n4/4 | C[4 -4 4 4] |';
      const result = parser.parse(input);
      
      if (result.countingMode) {
        CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
      }
      
      const allNotes = result.measures[0].beats.flatMap(b => b.notes);
      const restNote = allNotes.find(n => n.isRest);
      
      expect(restNote).toBeDefined();
      expect(restNote?.countingSize).toBe('s');
      expect(restNote?.countingNumber).toBeDefined();
    });
  });

  describe('SVG Rendering with counting', () => {
    it('should render counting numbers in SVG', () => {
      const input = 'count\n4/4 | C[4 4 4 4] |';
      const result = parser.parse(input);
      
      if (result.countingMode) {
        CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
      }
      
      const svg = renderer.render(result.grid, { countingMode: true });
      const svgString = svg.outerHTML;
      
      // Check that counting numbers are present
      expect(svgString).toContain('data-counting="true"');
      expect(svgString).toContain('>1<');
      expect(svgString).toContain('>2<');
      expect(svgString).toContain('>3<');
      expect(svgString).toContain('>4<');
    });

    it('should render counting with different sizes', () => {
      const input = 'count\n4/4 | C[88 88] |';
      const result = parser.parse(input);
      
      if (result.countingMode) {
        CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
      }
      
      const svg = renderer.render(result.grid, { countingMode: true });
      const svgString = svg.outerHTML;
      
      // Should have both 't' and 'm' sized counting numbers
      expect(svgString).toContain('data-counting-size="t"');
      expect(svgString).toContain('data-counting-size="m"');
    });

    it('should render rest counting in gray', () => {
      const input = 'count\n4/4 | C[4 -4 4 4] |';
      const result = parser.parse(input);
      
      if (result.countingMode) {
        CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
      }
      
      const svg = renderer.render(result.grid, { countingMode: true });
      const svgString = svg.outerHTML;
      
      // Should have a small (s) sized counting number with gray color
      expect(svgString).toContain('data-counting-size="s"');
      expect(svgString).toContain('fill="#999"');
    });

    it('should not render counting when countingMode is false', () => {
      const input = '4/4 | C[4 4 4 4] |';
      const result = parser.parse(input);
      const svg = renderer.render(result.grid, { countingMode: false });
      const svgString = svg.outerHTML;
      
      // Should NOT have counting elements
      expect(svgString).not.toContain('data-counting="true"');
    });
  });

  describe('Counting with multiple measures', () => {
    it('should continue counting across measures', () => {
      const input = 'count\n4/4 | C[4 4 4 4] | G[4 4 4 4] |';
      const result = parser.parse(input);
      
      if (result.countingMode) {
        CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
      }
      
      const measure1Notes = result.measures[0].beats.flatMap(b => b.notes);
      const measure2Notes = result.measures[1].beats.flatMap(b => b.notes);
      
      // First measure: 1, 2, 3, 4
      expect(measure1Notes[0].countingNumber).toBe(1);
      expect(measure1Notes[3].countingNumber).toBe(4);
      
      // Second measure: 5, 6, 7, 8 (continues from previous)
      expect(measure2Notes[0].countingNumber).toBe(5);
      expect(measure2Notes[3].countingNumber).toBe(8);
    });
  });

  describe('Counting with stems direction', () => {
    it('should render counting with stems-up (below notes)', () => {
      const input = 'count\nstems-up\n4/4 | C[4 4 4 4] |';
      const result = parser.parse(input);
      
      if (result.countingMode) {
        CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
      }
      
      const svg = renderer.render(result.grid, { 
        countingMode: true,
        stemsDirection: 'up'
      });
      
      // Just verify it renders without errors
      expect(svg).toBeDefined();
      expect(svg.outerHTML).toContain('data-counting="true"');
    });

    it('should render counting with stems-down (above notes)', () => {
      const input = 'count\nstems-down\n4/4 | C[4 4 4 4] |';
      const result = parser.parse(input);
      
      if (result.countingMode) {
        CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
      }
      
      const svg = renderer.render(result.grid, { 
        countingMode: true,
        stemsDirection: 'down'
      });
      
      // Just verify it renders without errors
      expect(svg).toBeDefined();
      expect(svg.outerHTML).toContain('data-counting="true"');
    });
  });
});
