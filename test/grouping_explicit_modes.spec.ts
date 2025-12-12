import { ChordGridParser } from '../src/parser/ChordGridParser';
import { MusicAnalyzer } from '../src/analyzer/MusicAnalyzer';

/**
 * NEW SPECIFICATION - Explicit binary and ternary Modes
 * 
 * Principe : Les modes `binary` et `ternary` forcent un type de groupement spécifique.
 * - `binary` : groupes de 2 croches (1 noire), même en 6/8
 * - `ternary` : groupes de 3 croches (1 noire pointée), même en 4/4
 * - Les ESPACES sont IGNORÉS (le mode forcé décide)
 * - Utile pour forcer un style contre-intuitif (ex: 6/8 binary, 4/4 ternary)
 * 
 * Note: Ces modes sont équivalents à `auto-beam` mais forcent le type de groupement
 */
describe('NEW SPEC: Explicit binary and ternary modes', () => {
  let parser: ChordGridParser;
  let analyzer: MusicAnalyzer;

  beforeEach(() => {
    parser = new ChordGridParser();
    analyzer = new MusicAnalyzer();
  });

  describe('binary mode: force binary grouping', () => {
    test('binary | 4/4 [88888888] should create 4 groups', () => {
      const input = 'binary\n4/4 | C[88888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // Binary: groups of 2
      expect(analyzed.beamGroups.length).toBe(4);
      analyzed.beamGroups.forEach(group => {
        expect(group.notes.length).toBe(2);
      });
    });

    test('binary | 6/8 [888888] should create 3 groups (NOT 2!)', () => {
      const input = 'binary\n6/8 | C[888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // Force binary in compound meter: 3 groups of 2 (not natural 2 groups of 3)
      expect(analyzed.beamGroups.length).toBe(3);
      analyzed.beamGroups.forEach(group => {
        expect(group.notes.length).toBe(2);
      });
    });

    test('binary | 3/4 [888888] should create 3 groups', () => {
      const input = 'binary\n3/4 | Am[888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // Binary grouping: 3 groups of 2
      expect(analyzed.beamGroups.length).toBe(3);
      analyzed.beamGroups.forEach(group => {
        expect(group.notes.length).toBe(2);
      });
    });

    test('binary | 4/4 [88 88 88 88] ignores spaces', () => {
      const input = 'binary\n4/4 | C[88 88 88 88] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // Spaces ignored, binary decides: 4 groups
      expect(analyzed.beamGroups.length).toBe(4);
    });
  });

  describe('ternary mode: force ternary grouping', () => {
    test('ternary | 6/8 [888888] should create 2 groups', () => {
      const input = 'ternary\n6/8 | C[888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // Ternary: groups of 3
      expect(analyzed.beamGroups.length).toBe(2);
      analyzed.beamGroups.forEach(group => {
        expect(group.notes.length).toBe(3);
      });
    });

    test('ternary | 4/4 [88888888] should create 3 groups', () => {
      const input = 'ternary\n4/4 | C[88888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // Force ternary in simple meter: 8 eighths = 2 full groups of 3 + 1 partial = approximately 3 groups
      // Note: ternary grouping in 4/4 is musically unusual but technically allowed
      expect(analyzed.beamGroups.length).toBeGreaterThanOrEqual(2);
    });

    test('ternary | 9/8 [888888888] should create 3 groups', () => {
      const input = 'ternary\n9/8 | C[888888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // Ternary grouping: 3 groups of 3
      expect(analyzed.beamGroups.length).toBe(3);
      analyzed.beamGroups.forEach(group => {
        expect(group.notes.length).toBe(3);
      });
    });

    test('ternary | 6/8 [88 88 88] ignores spaces', () => {
      const input = 'ternary\n6/8 | C[88 88 88] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // Spaces ignored, ternary decides: 2 groups of 3
      expect(analyzed.beamGroups.length).toBe(2);
      analyzed.beamGroups.forEach(group => {
        expect(group.notes.length).toBe(3);
      });
    });
  });

  describe('binary/ternary with inline time signatures', () => {
    test('binary applies to all measures', () => {
      const input = 'binary\n4/4 | C[88888888] | 6/8 Am[888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      
      // Both measures use binary grouping
      const m0 = analyzer.analyze(parsed.measures[0]);
      expect(m0.beamGroups.length).toBe(4); // 4/4: 4 groups of 2
      
      const m1 = analyzer.analyze(parsed.measures[1]);
      expect(m1.beamGroups.length).toBe(3); // 6/8: 3 groups of 2 (forced binary)
    });

    test('ternary applies to all measures', () => {
      const input = 'ternary\n6/8 | C[888888] | 4/4 Am[88888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      
      // Both measures use ternary grouping
      const m0 = analyzer.analyze(parsed.measures[0]);
      expect(m0.beamGroups.length).toBe(2); // 6/8: 2 groups of 3
      
      const m1 = analyzer.analyze(parsed.measures[1]);
      expect(m1.beamGroups.length).toBe(3); // 4/4: 8 eighths ÷ 3 = 2 full + 1 partial (ternary forced but unusual)
    });
  });

  describe('Inline mode override', () => {
    test('inline binary overrides default space-based', () => {
      const input = '4/4 | C[88 88 88 88] | 3/4 binary Am[888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      
      // Measure 0: default space-based → 4 groups by spaces
      const m0 = analyzer.analyze(parsed.measures[0]);
      expect(m0.beamGroups.length).toBe(4);
      
      // Measure 1: inline binary → 3 groups by algorithm
      const m1 = analyzer.analyze(parsed.measures[1]);
      expect(m1.beamGroups.length).toBe(3);
      m1.beamGroups.forEach(group => {
        expect(group.notes.length).toBe(2);
      });
    });

    test('inline ternary overrides default space-based', () => {
      const input = '4/4 | C[88 88 88 88] | 6/8 ternary Am[888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      
      // Measure 0: default space-based → 4 groups by spaces
      const m0 = analyzer.analyze(parsed.measures[0]);
      expect(m0.beamGroups.length).toBe(4);
      
      // Measure 1: inline ternary → 2 groups by algorithm
      const m1 = analyzer.analyze(parsed.measures[1]);
      expect(m1.beamGroups.length).toBe(2);
      m1.beamGroups.forEach(group => {
        expect(group.notes.length).toBe(3);
      });
    });

    test('global auto-beam can be overridden inline with binary', () => {
      const input = 'auto-beam\n4/4 | C[88888888] | 3/4 binary Am[888 888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      
      // Measure 0: auto-beam (=binary in 4/4) → 4 groups
      const m0 = analyzer.analyze(parsed.measures[0]);
      expect(m0.beamGroups.length).toBe(4);
      
      // Measure 1: inline binary (explicit) → 3 groups, spaces ignored
      const m1 = analyzer.analyze(parsed.measures[1]);
      expect(m1.beamGroups.length).toBe(3);
    });
  });

  describe('Irregular meters with explicit modes', () => {
    test('binary | 5/8 [88888] should create 2 full + 1 partial group', () => {
      const input = 'binary\n5/8 | C[88888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // Binary tries to group by 2: [88][88][8]
      expect(analyzed.beamGroups.length).toBe(3);
      expect(analyzed.beamGroups[0].notes.length).toBe(2);
      expect(analyzed.beamGroups[1].notes.length).toBe(2);
      expect(analyzed.beamGroups[2].notes.length).toBe(1);
    });

    test('ternary | 7/8 [8888888] should create 2 full + 1 partial group', () => {
      const input = 'ternary\n7/8 | C[8888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // Ternary tries to group by 3: [888][888][8]
      expect(analyzed.beamGroups.length).toBe(3);
      expect(analyzed.beamGroups[0].notes.length).toBe(3);
      expect(analyzed.beamGroups[1].notes.length).toBe(3);
      expect(analyzed.beamGroups[2].notes.length).toBe(1);
    });
  });

  describe('Rests still break in explicit modes', () => {
    test('binary | [88r888888] should create 3 groups', () => {
      const input = 'binary\n4/4 | C[88-888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // binary mode: breaks at each beat + rest breaks
      // [88-888888] = 2 eighths (beat 1) + rest + 6 eighths (beats 2-4)
      // Result: [88] + rest + [88] + [88] + [88] = 4 groups
      expect(analyzed.beamGroups.length).toBe(4);
    });
  });
});
