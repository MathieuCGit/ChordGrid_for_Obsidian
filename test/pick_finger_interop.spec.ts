import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

describe('Pick/Finger Notation Interoperability', () => {
  let parser: ChordGridParser;

  beforeEach(() => {
    parser = new ChordGridParser();
  });

  describe('Using finger notation in pick mode', () => {
    test('should normalize md/mu to d/u in pick mode', () => {
      const input = 'pick\n4/4| C[4md4mu4md4mu] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      
      // md → d, mu → u
      expect(notes[0].pickDirection).toBe('d');
      expect(notes[1].pickDirection).toBe('u');
      expect(notes[2].pickDirection).toBe('d');
      expect(notes[3].pickDirection).toBe('u');
      
      // Should NOT set fingerSymbol in pick mode
      expect(notes[0].fingerSymbol).toBeUndefined();
      expect(notes[1].fingerSymbol).toBeUndefined();
    });

    test('should normalize pd/pu to d/u in pick mode', () => {
      const input = 'pick\n4/4| C[8pd8pu8pd8pu8pd8pu8pd8pu] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      
      expect(notes[0].pickDirection).toBe('d');
      expect(notes[1].pickDirection).toBe('u');
      expect(notes[2].pickDirection).toBe('d');
      expect(notes[3].pickDirection).toBe('u');
    });

    test('should normalize hd/hu to d/u in pick mode', () => {
      const input = 'pick\n4/4| C[16hd16hu16hd16hu 16hd16hu16hd16hu 16hd16hu16hd16hu 16hd16hu16hd16hu] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      
      expect(notes[0].pickDirection).toBe('d');
      expect(notes[1].pickDirection).toBe('u');
      expect(notes[2].pickDirection).toBe('d');
      expect(notes[3].pickDirection).toBe('u');
    });

    test('should normalize td/tu to d/u in pick mode', () => {
      const input = 'pick\n4/4| C[4td4tu4td4tu] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      
      expect(notes[0].pickDirection).toBe('d');
      expect(notes[1].pickDirection).toBe('u');
      expect(notes[2].pickDirection).toBe('d');
      expect(notes[3].pickDirection).toBe('u');
    });

    test('should handle real-world mixed notation from finger mode', () => {
      const input = `pick
7/8| D |4/4 G / C | D[4u 4u 8md8mu 4u] |
|7/8 D[8d8mu8d 8u8u 8md8d] |4/4 G / C | Em[16161616 88 16161616 88] |`;

      const result = parser.parse(input);
      expect(result.errors).toHaveLength(0);
      
      // Check measure 1 (D with 4u 4u 8md8mu 4u)
      const measure1Notes = result.measures[2].chordSegments![0].beats.flatMap(b => b.notes);
      const attackNotes1 = measure1Notes.filter(n => !n.isRest && !n.tieEnd && !n.tieFromVoid);
      
      expect(attackNotes1[0].pickDirection).toBe('u');  // 4u
      expect(attackNotes1[1].pickDirection).toBe('u');  // 4u
      expect(attackNotes1[2].pickDirection).toBe('d');  // 8md → d
      expect(attackNotes1[3].pickDirection).toBe('u');  // 8mu → u
      expect(attackNotes1[4].pickDirection).toBe('u');  // 4u
      
      // Check measure 2 (7/8 D with 8d8mu8d 8u8u 8md8d)
      const measure2Notes = result.measures[3].chordSegments![0].beats.flatMap(b => b.notes);
      const attackNotes2 = measure2Notes.filter(n => !n.isRest && !n.tieEnd && !n.tieFromVoid);
      
      expect(attackNotes2[0].pickDirection).toBe('d');  // 8d
      expect(attackNotes2[1].pickDirection).toBe('u');  // 8mu → u
      expect(attackNotes2[2].pickDirection).toBe('d');  // 8d
      expect(attackNotes2[3].pickDirection).toBe('u');  // 8u
      expect(attackNotes2[4].pickDirection).toBe('u');  // 8u
      expect(attackNotes2[5].pickDirection).toBe('d');  // 8md → d
      expect(attackNotes2[6].pickDirection).toBe('d');  // 8d
    });

    test('should render pick strokes correctly with normalized directions', () => {
      const input = 'pick\n4/4| C[8md8mu8md8mu8md8mu8md8mu] |';
      const result = parser.parse(input);
      const renderer = new SVGRenderer();
      const svg = renderer.render(result.grid, { pickStrokes: true });

      const groups = svg.querySelectorAll('g[data-pick-stroke="true"]');
      expect(groups.length).toBe(8);

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

      // md → down, mu → up (repeated 4 times)
      expect(pickDirections).toEqual(['down', 'up', 'down', 'up', 'down', 'up', 'down', 'up']);
    });
  });

  describe('Backward compatibility', () => {
    test('should still work with simple d/u in pick mode', () => {
      const input = 'pick\n4/4| C[8d8u8d8u8d8u8d8u] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      
      expect(notes[0].pickDirection).toBe('d');
      expect(notes[1].pickDirection).toBe('u');
      expect(notes[2].pickDirection).toBe('d');
      expect(notes[3].pickDirection).toBe('u');
    });

    test('should still work with complex notation in finger mode', () => {
      const input = 'finger\n4/4| C[4md4mu4md4mu] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      
      // md → hd, mu → hu in finger mode
      expect(notes[0].fingerSymbol).toBe('hd');
      expect(notes[1].fingerSymbol).toBe('hu');
      expect(notes[2].fingerSymbol).toBe('hd');
      expect(notes[3].fingerSymbol).toBe('hu');
    });
  });
});
