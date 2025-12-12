import { ChordGridParser } from '../src/parser/ChordGridParser';
import { MusicAnalyzer } from '../src/analyzer/MusicAnalyzer';

/**
 * NEW SPECIFICATION - auto-beam Mode
 * 
 * Principe : Le mode `auto-beam` (ou `auto-beams`) active le groupement algorithmique.
 * - Binary meters (4/4, 3/4, 2/4) → groupes de 2 croches (1 noire)
 * - Ternary meters (6/8, 9/8, 12/8) → groupes de 3 croches (1 noire pointée)
 * - Les ESPACES sont IGNORÉS (l'algorithme décide)
 * - Métriques complexes (5/8, 7/8) → pas d'auto-break (1 groupe)
 * 
 * Philosophy: "Let the algorithm handle beaming" - espaces purement visuels
 */
describe('NEW SPEC: auto-beam mode', () => {
  let parser: ChordGridParser;
  let analyzer: MusicAnalyzer;

  beforeEach(() => {
    parser = new ChordGridParser();
    analyzer = new MusicAnalyzer();
  });

  describe('auto-beam in simple meters (binary)', () => {
    test('auto-beam | 4/4 [88888888] should create 4 groups', () => {
      const input = 'auto-beam\n4/4 | C[88888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // Binary auto-break: groups of 2 eighths (1 quarter)
      expect(analyzed.beamGroups.length).toBe(4);
      analyzed.beamGroups.forEach(group => {
        expect(group.notes.length).toBe(2);
      });
    });

    test('auto-beam | 3/4 [888888] should create 3 groups', () => {
      const input = 'auto-beam\n3/4 | Am[888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // 3 beats, binary grouping: 3 groups of 2
      expect(analyzed.beamGroups.length).toBe(3);
      analyzed.beamGroups.forEach(group => {
        expect(group.notes.length).toBe(2);
      });
    });

    test('auto-beam | 2/4 [8888] should create 2 groups', () => {
      const input = 'auto-beam\n2/4 | C[8888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // 2 beats, binary grouping: 2 groups of 2
      expect(analyzed.beamGroups.length).toBe(2);
      analyzed.beamGroups.forEach(group => {
        expect(group.notes.length).toBe(2);
      });
    });

    test('auto-beam | 4/4 [16161616 16161616] should create 4 groups', () => {
      const input = 'auto-beam\n4/4 | C[1616161616161616 1616161616161616] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // auto-beam breaks at each beat (4 beats in 4/4), sixteenths create 2 beam levels
      // Total: 4 beats × 2 levels = 8 BeamGroups
      expect(analyzed.beamGroups.length).toBe(8);
      // Check level 1 groups (primary beams) have 4 notes each (4 sixteenths = 1 beat)
      const level1Groups = analyzed.beamGroups.filter(g => g.level === 1);
      expect(level1Groups.length).toBe(4);
      level1Groups.forEach(group => {
        expect(group.notes.length).toBe(4);
      });
    });
  });

  describe('auto-beam in compound meters (ternary)', () => {
    test('auto-beam | 6/8 [888888] should create 2 groups', () => {
      const input = 'auto-beam\n6/8 | C[888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // Ternary grouping: 2 groups of 3 (dotted quarter beats)
      expect(analyzed.beamGroups.length).toBe(2);
      analyzed.beamGroups.forEach(group => {
        expect(group.notes.length).toBe(3);
      });
    });

    test('auto-beam | 9/8 [888888888] should create 3 groups', () => {
      const input = 'auto-beam\n9/8 | C[888888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // 3 dotted quarter beats: 3 groups of 3
      expect(analyzed.beamGroups.length).toBe(3);
      analyzed.beamGroups.forEach(group => {
        expect(group.notes.length).toBe(3);
      });
    });

    test('auto-beam | 12/8 [888888888888] should create 4 groups', () => {
      const input = 'auto-beam\n12/8 | C[888888888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // 4 dotted quarter beats: 4 groups of 3
      expect(analyzed.beamGroups.length).toBe(4);
      analyzed.beamGroups.forEach(group => {
        expect(group.notes.length).toBe(3);
      });
    });
  });

  describe('auto-beam IGNORES user spaces', () => {
    test('auto-beam | 3/4 [888 888] should create 3 groups (NOT 2)', () => {
      const input = 'auto-beam\n3/4 | Am[888 888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // Space is ignored, algorithm decides: 3 binary groups
      expect(analyzed.beamGroups.length).toBe(3);
      analyzed.beamGroups.forEach(group => {
        expect(group.notes.length).toBe(2);
      });
    });

    test('auto-beam | 4/4 [8888 8888] should create 4 groups (NOT 2)', () => {
      const input = 'auto-beam\n4/4 | C[8888 8888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // Space is ignored, algorithm decides: 4 binary groups
      expect(analyzed.beamGroups.length).toBe(4);
      analyzed.beamGroups.forEach(group => {
        expect(group.notes.length).toBe(2);
      });
    });

    test('auto-beam | 6/8 [88 88 88] should create 2 groups (NOT 3)', () => {
      const input = 'auto-beam\n6/8 | C[88 88 88] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // Spaces ignored, ternary grouping: 2 groups of 3
      expect(analyzed.beamGroups.length).toBe(2);
      analyzed.beamGroups.forEach(group => {
        expect(group.notes.length).toBe(3);
      });
    });
  });

  describe('auto-beam in complex/irregular meters', () => {
    test('auto-beam | 5/8 [88888] should create 1 group (irregular)', () => {
      const input = 'auto-beam\n5/8 | C[88888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // Irregular meter: no auto-break, user must use spaces
      expect(analyzed.beamGroups.length).toBe(1);
      expect(analyzed.beamGroups[0].notes.length).toBe(5);
    });

    test('auto-beam | 7/8 [8888888] should create 1 group (irregular)', () => {
      const input = 'auto-beam\n7/8 | C[8888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // Irregular meter: no auto-break
      expect(analyzed.beamGroups.length).toBe(1);
      expect(analyzed.beamGroups[0].notes.length).toBe(7);
    });

    test('auto-beam | 5/4 [8888888888] should create 5 groups (binary)', () => {
      const input = 'auto-beam\n5/4 | C[8888888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // 5/4 is simple meter (denominator=4), binary grouping
      expect(analyzed.beamGroups.length).toBe(5);
      analyzed.beamGroups.forEach(group => {
        expect(group.notes.length).toBe(2);
      });
    });
  });

  describe('auto-beams as alias', () => {
    test('auto-beams (plural) should work same as auto-beam', () => {
      const input = 'auto-beams\n4/4 | C[88888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // Same behavior as auto-beam
      expect(analyzed.beamGroups.length).toBe(4);
    });
  });

  describe('auto-beam with inline time signature changes', () => {
    test('auto-beam applies to all measures', () => {
      const input = 'auto-beam\n4/4 | C[88888888] | 3/4 Am[888888] | 6/8 G[888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      
      // Measure 0: 4/4 binary → 4 groups
      const m0 = analyzer.analyze(parsed.measures[0]);
      expect(m0.beamGroups.length).toBe(4);
      
      // Measure 1: 3/4 binary → 3 groups
      const m1 = analyzer.analyze(parsed.measures[1]);
      expect(m1.beamGroups.length).toBe(3);
      
      // Measure 2: 6/8 ternary → 2 groups
      const m2 = analyzer.analyze(parsed.measures[2]);
      expect(m2.beamGroups.length).toBe(2);
    });
  });

  describe('Rests still break beams in auto-beam mode', () => {
    test('auto-beam | [88r88 8888] should create 3 groups', () => {
      const input = 'auto-beam\n4/4 | C[88-888 888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // Rest always breaks, plus auto-beam creates binary groups
      expect(analyzed.beamGroups.length).toBeGreaterThan(1);
    });
  });
});
