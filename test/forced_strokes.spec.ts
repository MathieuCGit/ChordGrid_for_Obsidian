import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

describe('Forced Pick and Finger Strokes', () => {
  let parser: ChordGridParser;

  beforeEach(() => {
    parser = new ChordGridParser();
  });

  describe('Pick Mode - Forced Directions', () => {
    test('should parse d suffix as downstroke in pick mode', () => {
      const input = 'pick\n4/4| C[8d8u8d8u8d8u8d8u] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      expect(result.measures).toHaveLength(1);
      
      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      expect(notes).toHaveLength(8);
      
      // Check pickDirection is set
      expect(notes[0].pickDirection).toBe('d');
      expect(notes[1].pickDirection).toBe('u');
      expect(notes[2].pickDirection).toBe('d');
      expect(notes[3].pickDirection).toBe('u');
      
      // Check fingerSymbol is NOT set in pick mode
      expect(notes[0].fingerSymbol).toBeUndefined();
      expect(notes[1].fingerSymbol).toBeUndefined();
    });

    test('should parse u suffix as upstroke in pick mode', () => {
      const input = 'pick\n4/4| C[4u4d4u4d] |';
      const result = parser.parse(input);

      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      expect(notes[0].pickDirection).toBe('u');
      expect(notes[1].pickDirection).toBe('d');
      expect(notes[2].pickDirection).toBe('u');
      expect(notes[3].pickDirection).toBe('d');
    });

    test('should NOT parse td/tu/pd/pu as valid in pick mode', () => {
      const input = 'pick\n4/4| C[4td4tu4pd4pu] |';
      const result = parser.parse(input);

      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      
      // td, tu, pd, pu should not be recognized as pickDirection in pick mode
      // They should either be ignored or parsed as fingerSymbol (which shouldn't be used in pick mode)
      expect(notes[0].pickDirection).toBeUndefined();
      expect(notes[1].pickDirection).toBeUndefined();
      expect(notes[2].pickDirection).toBeUndefined();
      expect(notes[3].pickDirection).toBeUndefined();
    });

    test('should mix forced and automatic pick strokes', () => {
      const input = 'pick\n4/4| C[8d8 8u8 8d8 8u8] |';
      const result = parser.parse(input);

      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      expect(notes[0].pickDirection).toBe('d'); // Forced down
      expect(notes[1].pickDirection).toBeUndefined(); // Automatic (will be 'u' by alternation)
      expect(notes[2].pickDirection).toBe('u'); // Forced up
      expect(notes[3].pickDirection).toBeUndefined(); // Automatic (will be 'd' by alternation)
    });
  });

  describe('Finger Mode - Forced Symbols', () => {
    test('should parse d suffix as thumb down (td) in finger mode', () => {
      const input = 'finger\n4/4| C[8d8u8d8u4d4u] |';
      const result = parser.parse(input);

      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      
      // d should be interpreted as 'td' (thumb down) in finger mode
      expect(notes[0].fingerSymbol).toBe('td'); // or 'pd' depending on language
      expect(notes[1].fingerSymbol).toBe('tu'); // or 'pu'
      expect(notes[2].fingerSymbol).toBe('td');
      expect(notes[3].fingerSymbol).toBe('tu');
      
      // pickDirection should NOT be set in finger mode
      expect(notes[0].pickDirection).toBeUndefined();
      expect(notes[1].pickDirection).toBeUndefined();
    });

    test('should parse u suffix as thumb up (tu) in finger mode', () => {
      const input = 'finger\n4/4| C[4u4d4u4d] |';
      const result = parser.parse(input);

      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      expect(notes[0].fingerSymbol).toBe('tu');
      expect(notes[1].fingerSymbol).toBe('td');
    });

    test('should parse td suffix explicitly in finger mode', () => {
      const input = 'finger\n4/4| C[4td4tu4td4tu] |';
      const result = parser.parse(input);

      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      expect(notes[0].fingerSymbol).toBe('td');
      expect(notes[1].fingerSymbol).toBe('tu');
    });

    test('should parse pd/pu (French notation) in finger mode', () => {
      const input = 'finger\n4/4| C[4pd4pu4pd4pu] |';
      const result = parser.parse(input);

      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      expect(notes[0].fingerSymbol).toBe('td');
      expect(notes[1].fingerSymbol).toBe('tu');
    });

    test('should parse hd/hu (hand down/up) in finger mode', () => {
      const input = 'finger\n4/4| C[4hd4hu4hd4hu] |';
      const result = parser.parse(input);

      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      expect(notes[0].fingerSymbol).toBe('hd');
      expect(notes[1].fingerSymbol).toBe('hu');
    });

    test('should parse md/mu (main down/up - French) in finger mode', () => {
      const input = 'finger\n4/4| C[4md4mu4md4mu] |';
      const result = parser.parse(input);

      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      expect(notes[0].fingerSymbol).toBe('hd');
      expect(notes[1].fingerSymbol).toBe('hu');
    });

    test('should mix forced and automatic finger symbols', () => {
      const input = 'finger\n4/4| C[8d8 8hu8 8d8 8hu8] |';
      const result = parser.parse(input);

      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      expect(notes[0].fingerSymbol).toBe('td'); // Forced thumb down
      expect(notes[1].fingerSymbol).toBeUndefined(); // Automatic (pattern)
      expect(notes[2].fingerSymbol).toBe('hu'); // Forced hand up
      expect(notes[3].fingerSymbol).toBeUndefined(); // Automatic (pattern)
    });

    test('should handle all finger symbols in sequence', () => {
      const input = 'finger\n4/4| C[8d8u8td8tu8pd8pu8hd8hu] |';
      const result = parser.parse(input);

      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      expect(notes).toHaveLength(8);
      expect(notes[0].fingerSymbol).toBe('td');
      expect(notes[1].fingerSymbol).toBe('tu');
      expect(notes[2].fingerSymbol).toBe('td');
      expect(notes[3].fingerSymbol).toBe('tu');
      expect(notes[4].fingerSymbol).toBe('td'); // pd normalized to td
      expect(notes[5].fingerSymbol).toBe('tu'); // pu normalized to tu
      expect(notes[6].fingerSymbol).toBe('hd');
      expect(notes[7].fingerSymbol).toBe('hu');
    });
  });

  describe('Rendering - Pick Mode with Forced Directions', () => {
    test('should render forced down/up strokes instead of automatic alternation', () => {
      const input = 'pick\n4/4| C[8u8u8d8d8u8u8d8d] |';
      const result = parser.parse(input);
      const renderer = new SVGRenderer();
      const svg = renderer.render(result.grid, { pickStrokes: true });

      // Extract pick stroke symbols
      const groups = svg.querySelectorAll('g[data-pick-stroke="true"]');
      expect(groups.length).toBe(8);

      const pickDirections: string[] = [];
      groups.forEach(g => {
        const transform = g.getAttribute('transform') || '';
        const path = g.querySelector('path[fill="#000"]');
        if (path) {
          const d = path.getAttribute('d') || '';
          // Downstroke path contains "m 99,44"
          // Upstroke path contains "M 125.6,4.1"
          if (d.includes('m 99,44') || d.includes('99,44')) {
            pickDirections.push('down');
          } else if (d.includes('M 125.6,4.1') || d.includes('125.6,4.1')) {
            pickDirections.push('up');
          }
        }
      });

      // Should be: up, up, down, down, up, up, down, down (not automatic)
      expect(pickDirections).toEqual(['up', 'up', 'down', 'down', 'up', 'up', 'down', 'down']);
    });

    test('should use automatic alternation when no forced direction specified', () => {
      const input = 'pick\n4/4| C[8 8 8 8 8 8 8 8] |';
      const result = parser.parse(input);
      const renderer = new SVGRenderer();
      const svg = renderer.render(result.grid, { pickStrokes: true });

      const groups = svg.querySelectorAll('g[data-pick-stroke="true"]');
      const pickDirections: string[] = [];
      groups.forEach(g => {
        const path = g.querySelector('path[fill="#000"]');
        if (path) {
          const d = path.getAttribute('d') || '';
          if (d.includes('m 99,44') || d.includes('99,44')) {
            pickDirections.push('down');
          } else if (d.includes('M 125.6,4.1') || d.includes('125.6,4.1')) {
            pickDirections.push('up');
          }
        }
      });

      // Should be automatic: down, up, down, up, down, up, down, up
      expect(pickDirections).toEqual(['down', 'up', 'down', 'up', 'down', 'up', 'down', 'up']);
    });

    test('should mix forced and automatic pick directions correctly', () => {
      const input = 'pick\n4/4| C[8d8 8u8 8d8 8u8] |';
      const result = parser.parse(input);
      const renderer = new SVGRenderer();
      const svg = renderer.render(result.grid, { pickStrokes: true });

      const groups = svg.querySelectorAll('g[data-pick-stroke="true"]');
      const pickDirections: string[] = [];
      groups.forEach(g => {
        const path = g.querySelector('path[fill="#000"]');
        if (path) {
          const d = path.getAttribute('d') || '';
          if (d.includes('m 99,44') || d.includes('99,44')) {
            pickDirections.push('down');
          } else if (d.includes('M 125.6,4.1') || d.includes('125.6,4.1')) {
            pickDirections.push('up');
          }
        }
      });

      // Should be: down (forced), auto, up (forced), auto, down (forced), auto, up (forced), auto
      expect(pickDirections).toEqual(['down', 'up', 'up', 'down', 'down', 'up', 'up', 'down']);
    });
  });

  describe('Rendering - Finger Mode with Forced Symbols', () => {
    test('should render forced finger symbols instead of automatic pattern', () => {
      const input = 'finger\n4/4| C[4d4hu4d4hu] |';
      const result = parser.parse(input);
      const renderer = new SVGRenderer();
      const svg = renderer.render(result.grid, { fingerMode: 'en' });

      // Extract finger symbol texts
      const textElements = svg.querySelectorAll('text[data-finger-symbol="true"]');
      expect(textElements.length).toBe(4);

      const symbols: string[] = [];
      textElements.forEach(text => {
        symbols.push(text.textContent || '');
      });

      // English mode: d → t, hu → hu, d → t, mu → mu
      // (assuming td displays as 't', hu as 'hu', etc.)
      expect(symbols).toEqual(['t', 'hu', 't', 'mu']);
    });

    test('should use automatic pattern when no forced symbol specified', () => {
      const input = 'finger\n4/4| C[8 8 8 8 8 8 8 8] |';
      const result = parser.parse(input);
      const renderer = new SVGRenderer();
      const svg = renderer.render(result.grid, { fingerMode: 'en' });

      const textElements = svg.querySelectorAll('text[data-finger-symbol="true"]');
      const symbols: string[] = [];
      textElements.forEach(text => {
        symbols.push(text.textContent || '');
      });

      // Automatic pattern for 4/4: t, tu, h, tu (repeats)
      expect(symbols.length).toBe(8);
    });

    test('should render French notation correctly', () => {
      const input = 'finger:fr\n4/4| C[4pd4pu4hd4hu] |';
      const result = parser.parse(input);
      const renderer = new SVGRenderer();
      const svg = renderer.render(result.grid, { fingerMode: 'fr' });

      const textElements = svg.querySelectorAll('text[data-finger-symbol="true"]');
      const symbols: string[] = [];
      textElements.forEach(text => {
        symbols.push(text.textContent || '');
      });

      // pd and pu should be normalized to td/tu, hd/hu remain as is
      expect(symbols.length).toBe(4);
    });
  });

  describe('Edge Cases', () => {
    test('should handle forced strokes with dotted notes', () => {
      const input = 'pick\n4/4| C[8.d16u8.d16u8.d16u] |';
      const result = parser.parse(input);

      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      expect(notes[0].dotted).toBe(true);
      expect(notes[0].pickDirection).toBe('d');
      expect(notes[1].pickDirection).toBe('u');
    });

    test('should handle forced strokes with ghost notes', () => {
      const input = 'finger\n4/4| C[4xd4xu4xd4xu] |';
      const result = parser.parse(input);

      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      expect(notes[0].isGhost).toBe(true);
      expect(notes[0].fingerSymbol).toBe('td');
      expect(notes[1].isGhost).toBe(true);
      expect(notes[1].fingerSymbol).toBe('tu');
    });

    test('should handle forced strokes with rests (should be ignored)', () => {
      const input = 'pick\n4/4| C[8d-8 8u-8 8d-8 8u-8] |';
      const result = parser.parse(input);

      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      expect(notes[0].isRest).toBe(false);
      expect(notes[0].pickDirection).toBe('d');
      expect(notes[1].isRest).toBe(true);
      expect(notes[1].pickDirection).toBeUndefined(); // Rests don't have directions
      expect(notes[2].isRest).toBe(false);
      expect(notes[2].pickDirection).toBe('u');
    });

    test('should handle consecutive forced strokes without spaces', () => {
      const input = 'finger\n4/4| C[8d8hu8td8hu8d8hu8td8hu] |';
      const result = parser.parse(input);

      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      expect(notes).toHaveLength(4);
      expect(notes[0].fingerSymbol).toBe('td');
      expect(notes[1].fingerSymbol).toBe('hu');
      expect(notes[2].fingerSymbol).toBe('pd');
      expect(notes[3].fingerSymbol).toBe('mu');
    });

    test('should not confuse forced strokes with note values', () => {
      const input = 'pick\n4/4| C[4d2u8d8u8d8u16d16u] |';
      const result = parser.parse(input);

      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      expect(notes).toHaveLength(8);
      expect(notes[0].value).toBe(4);
      expect(notes[0].pickDirection).toBe('d');
      expect(notes[1].value).toBe(2);
      expect(notes[1].pickDirection).toBe('u');
    });
  });

  describe('Mode Isolation', () => {
    test('pick mode should not interfere with finger mode', () => {
      const pickInput = 'pick\n4/4| C[4d4u4d4u] |';
      const fingerInput = 'finger\n4/4| C[4d4u4d4u] |';
      
      const pickResult = parser.parse(pickInput);
      const fingerResult = parser.parse(fingerInput);

      const pickNotes = pickResult.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      const fingerNotes = fingerResult.measures[0].chordSegments![0].beats.flatMap(b => b.notes);

      // Pick mode: d/u → pickDirection
      expect(pickNotes[0].pickDirection).toBe('d');
      expect(pickNotes[0].fingerSymbol).toBeUndefined();

      // Finger mode: d/u → fingerSymbol (td/tu)
      expect(fingerNotes[0].fingerSymbol).toBe('td');
      expect(fingerNotes[0].pickDirection).toBeUndefined();
    });

    test('should handle no mode specified (no forced strokes)', () => {
      const input = '4/4| C[8d8u8td8hu8d8u8td8hu] |';
      const result = parser.parse(input);

      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      
      // Without pick or finger mode, suffixes might be ignored or parsed differently
      // Current behavior: they're parsed but not used
      // We should verify they don't cause parsing errors
      expect(result.errors).toHaveLength(0);
      expect(notes).toHaveLength(4);
    });
  });
});
