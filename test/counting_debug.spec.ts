import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';
import { CountingAnalyzer } from '../src/analyzer/CountingAnalyzer';

describe('Counting System Debug', () => {
  let parser: ChordGridParser;
  let renderer: SVGRenderer;

  beforeEach(() => {
    parser = new ChordGridParser();
    renderer = new SVGRenderer();
  });

  describe('Parsing with count directive', () => {
    it('should parse count directive', () => {
      const input = 'count\n4/4 | C[4 4 4 4] |';
      const result = parser.parse(input);
      
      console.log('Parse result:', result);
      console.log('countingMode in result:', (result as any).countingMode);
      console.log('Measures:', result.measures);
      console.log('First measure notes:', result.measures[0]?.beats[0]?.notes);
    });

    it('should parse counting directive', () => {
      const input = 'counting\n4/4 | C[4 4 4 4] |';
      const result = parser.parse(input);
      
      console.log('Parse result with counting:', result);
      console.log('countingMode in result:', (result as any).countingMode);
    });
  });

  describe('CountingAnalyzer', () => {
    it('should assign counting numbers and sizes to notes', () => {
      const input = '4/4 | C[4 4 4 4] |';
      const result = parser.parse(input);
      
      // Manually call CountingAnalyzer
      CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
      
      console.log('After CountingAnalyzer:');
      console.log('Measure 0, Beat 0, Notes:', result.measures[0].beats[0].notes);
      
      const notes = result.measures[0].beats[0].notes;
      expect(notes[0].countingNumber).toBeDefined();
      expect(notes[0].countingSize).toBeDefined();
      
      // First note of beat should be 't' (tall)
      expect(notes[0].countingSize).toBe('t');
      expect(notes[0].countingNumber).toBe(1);
    });

    it('should handle subdivisions correctly', () => {
      const input = '4/4 | C[8 8 8 8 8 8 8 8] |';
      const result = parser.parse(input);
      
      CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
      
      console.log('8th notes analysis:');
      result.measures[0].beats.forEach((beat, beatIdx) => {
        console.log(`Beat ${beatIdx}:`, beat.notes.map(n => ({
          num: n.countingNumber,
          size: n.countingSize
        })));
      });
      
      // Should have 8 notes with counting
      const allNotes = result.measures[0].beats.flatMap(b => b.notes);
      expect(allNotes.length).toBe(8);
      expect(allNotes.every(n => n.countingNumber !== undefined)).toBe(true);
    });

    it('should handle rests with small size', () => {
      const input = '4/4 | C[4 -4 4 4] |';
      const result = parser.parse(input);
      
      CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
      
      const notes = result.measures[0].beats.flatMap(b => b.notes);
      const restNote = notes.find(n => n.isRest);
      
      console.log('Rest note:', restNote);
      expect(restNote?.countingSize).toBe('s');
    });
  });

  describe('Rendering with counting', () => {
    it('should render counting numbers (manual call)', () => {
      const input = '4/4 | C[4 4 4 4] |';
      const result = parser.parse(input);
      
      // Manually apply counting
      CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
      
      // Check that notes have counting info
      const notes = result.measures[0].beats[0].notes;
      console.log('Notes with counting:', notes);
      
      const svg = renderer.render(result.grid);
      const svgString = svg.outerHTML;
      
      console.log('SVG output length:', svgString.length);
      console.log('Does SVG contain counting?', svgString.includes('counting'));
    });
  });
});
