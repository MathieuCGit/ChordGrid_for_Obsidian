import { ChordGridParser } from '../src/parser/ChordGridParser';
import { MusicAnalyzer } from '../src/analyzer/MusicAnalyzer';

/**
 * NEW SPECIFICATION - Inline Time Signature Changes and Mode Inheritance
 * 
 * Principe : Les changements de métrique inline héritent du mode global.
 * - Sans directive globale → space-based par défaut
 * - `auto-beam` global → toutes les mesures en auto-beam
 * - `binary` global → toutes les mesures en binary
 * - Mode inline explicite → override le mode global pour cette mesure
 * 
 * Philosophy: Cohérence globale avec possibilité d'override local
 */
describe('NEW SPEC: Inline time signature changes and inheritance', () => {
  let parser: ChordGridParser;
  let analyzer: MusicAnalyzer;

  beforeEach(() => {
    parser = new ChordGridParser();
    analyzer = new MusicAnalyzer();
  });

  describe('Default space-based inheritance', () => {
    test('No directive: all measures use space-based', () => {
      const input = '4/4 | C[88 88 88 88] | 3/4 Am[888 888] | 6/8 G[888 888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      
      // All measures: space-based grouping
      const m0 = analyzer.analyze(parsed.measures[0]);
      expect(m0.beamGroups.length).toBe(4); // 4 spaces
      
      const m1 = analyzer.analyze(parsed.measures[1]);
      expect(m1.beamGroups.length).toBe(2); // 1 space
      
      const m2 = analyzer.analyze(parsed.measures[2]);
      expect(m2.beamGroups.length).toBe(2); // 1 space
    });

    test('Inline time signature without mode inherits default', () => {
      const input = '4/4 | C[88888888] | 3/4 Am[888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      
      // Both: space-based (no spaces = 1 group each)
      const m0 = analyzer.analyze(parsed.measures[0]);
      expect(m0.beamGroups.length).toBe(1);
      
      const m1 = analyzer.analyze(parsed.measures[1]);
      expect(m1.beamGroups.length).toBe(1);
    });
  });

  describe('auto-beam inheritance', () => {
    test('auto-beam: all inline measures inherit auto-beam', () => {
      const input = 'auto-beam\n4/4 | C[88888888] | 3/4 Am[888888] | 6/8 G[888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      
      // All measures: auto-beam
      const m0 = analyzer.analyze(parsed.measures[0]);
      expect(m0.beamGroups.length).toBe(4); // 4/4 binary
      
      const m1 = analyzer.analyze(parsed.measures[1]);
      expect(m1.beamGroups.length).toBe(3); // 3/4 binary
      
      const m2 = analyzer.analyze(parsed.measures[2]);
      expect(m2.beamGroups.length).toBe(2); // 6/8 ternary
    });

    test('auto-beam: spaces are ignored in all measures', () => {
      const input = 'auto-beam\n4/4 | C[8888 8888] | 3/4 Am[888 888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      
      // Spaces ignored in both measures
      const m0 = analyzer.analyze(parsed.measures[0]);
      expect(m0.beamGroups.length).toBe(4); // Not 2
      
      const m1 = analyzer.analyze(parsed.measures[1]);
      expect(m1.beamGroups.length).toBe(3); // Not 2
    });
  });

  describe('binary/ternary inheritance', () => {
    test('binary: all measures use binary grouping', () => {
      const input = 'binary\n4/4 | C[88888888] | 6/8 Am[888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      
      // Both: binary (groups of 2)
      const m0 = analyzer.analyze(parsed.measures[0]);
      expect(m0.beamGroups.length).toBe(4);
      
      const m1 = analyzer.analyze(parsed.measures[1]);
      expect(m1.beamGroups.length).toBe(3); // 6/8 forced to binary
    });

    test('ternary: all measures use ternary grouping', () => {
      const input = 'ternary\n6/8 | C[888888] | 4/4 Am[88888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      
      // Both: ternary (groups of 3)
      const m0 = analyzer.analyze(parsed.measures[0]);
      expect(m0.beamGroups.length).toBe(2);
      
      const m1 = analyzer.analyze(parsed.measures[1]);
      expect(m1.beamGroups.length).toBe(3); // 4/4: 8 eighths in ternary = [888][888][88]
    });
  });

  describe('Inline mode override', () => {
    test('Inline mode overrides global default', () => {
      const input = '4/4 | C[88 88 88 88] | 3/4 auto-beam Am[888 888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      
      // Measure 0: default space-based
      const m0 = analyzer.analyze(parsed.measures[0]);
      expect(m0.beamGroups.length).toBe(4);
      
      // Measure 1: inline auto-beam overrides default
      const m1 = analyzer.analyze(parsed.measures[1]);
      expect(m1.beamGroups.length).toBe(3); // Not 2!
    });

    test('Inline mode overrides global auto-beam', () => {
      const input = 'auto-beam\n4/4 | C[88888888] | 3/4 binary Am[888 888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      
      // Measure 0: auto-beam (binary in 4/4)
      const m0 = analyzer.analyze(parsed.measures[0]);
      expect(m0.beamGroups.length).toBe(4);
      
      // Measure 1: inline binary (explicit) overrides auto-beam
      const m1 = analyzer.analyze(parsed.measures[1]);
      expect(m1.beamGroups.length).toBe(3); // binary, spaces ignored
    });

    test('Mix of inherited and override modes', () => {
      const input = 'auto-beam\n4/4 | C[88888888] | 3/4 Am[888888] | 6/8 binary G[888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      
      // Measure 0: auto-beam → binary
      const m0 = analyzer.analyze(parsed.measures[0]);
      expect(m0.beamGroups.length).toBe(4);
      
      // Measure 1: auto-beam → binary (inherited)
      const m1 = analyzer.analyze(parsed.measures[1]);
      expect(m1.beamGroups.length).toBe(3);
      
      // Measure 2: binary override (6/8 forced to binary)
      const m2 = analyzer.analyze(parsed.measures[2]);
      expect(m2.beamGroups.length).toBe(3); // Not 2
    });

    test('Return to default after inline override', () => {
      const input = '4/4 | C[88 88 88 88] | 3/4 auto-beam Am[888 888] | 2/4 G[88 88] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      
      // Measure 0: default space-based
      const m0 = analyzer.analyze(parsed.measures[0]);
      expect(m0.beamGroups.length).toBe(4);
      
      // Measure 1: inline auto-beam
      const m1 = analyzer.analyze(parsed.measures[1]);
      expect(m1.beamGroups.length).toBe(3);
      
      // Measure 2: back to default space-based
      const m2 = analyzer.analyze(parsed.measures[2]);
      expect(m2.beamGroups.length).toBe(2); // Respects spaces
    });
  });

  describe('Complex inheritance scenarios', () => {
    test('User case: noauto directive should inherit to inline TS', () => {
      // This is the original user bug that triggered the refactor
      // With new spec, 'noauto' is just the default behavior now
      const input = '4/4 | C | G | 3/4 Am[888 888] | 4/4 Em |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      
      // Measure 2: 3/4 with space → 2 groups (space-based is default)
      const m2 = analyzer.analyze(parsed.measures[2]);
      expect(m2.beamGroups.length).toBe(2);
      expect(m2.beamGroups[0].notes.length).toBe(3);
      expect(m2.beamGroups[1].notes.length).toBe(3);
    });

    test('Multiple time signature changes with global binary', () => {
      const input = 'binary\n4/4 | C[88888888] | 3/4 Am[888888] | 6/8 G[888888] | 2/4 D[8888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      
      // All use binary grouping (groups of 2)
      const m0 = analyzer.analyze(parsed.measures[0]);
      expect(m0.beamGroups.length).toBe(4);
      
      const m1 = analyzer.analyze(parsed.measures[1]);
      expect(m1.beamGroups.length).toBe(3);
      
      const m2 = analyzer.analyze(parsed.measures[2]);
      expect(m2.beamGroups.length).toBe(3); // 6/8 forced to binary
      
      const m3 = analyzer.analyze(parsed.measures[3]);
      expect(m3.beamGroups.length).toBe(2);
    });

    test('Alternating inline overrides', () => {
      const input = 'auto-beam\n4/4 | C[88 88 88 88] | 3/4 binary Am[888 888] | 6/8 G[888 888] | 2/4 D[8888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      
      // Measure 0: auto-beam (ignores spaces) → 4 groups
      const m0 = analyzer.analyze(parsed.measures[0]);
      expect(m0.beamGroups.length).toBe(4);
      
      // Measure 1: inline binary (ignores spaces) → 3 groups
      const m1 = analyzer.analyze(parsed.measures[1]);
      expect(m1.beamGroups.length).toBe(3);
      
      // Measure 2: auto-beam (ignores spaces) → 2 groups (ternary auto-detected)
      const m2 = analyzer.analyze(parsed.measures[2]);
      expect(m2.beamGroups.length).toBe(2);
      
      // Measure 3: 2/4 default (space-based) → 2 groups
      const m3 = analyzer.analyze(parsed.measures[3]);
      expect(m3.beamGroups.length).toBe(2);
    });
  });

  describe('Edge cases', () => {
    test('Empty measure inherits mode', () => {
      const input = 'auto-beam\n4/4 | C | 3/4 Am |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      // Chord-only measures don't have rhythm, but mode should be set
      expect(result.measures[0].timeSignature).toBeUndefined(); // Uses grid TS
      expect(result.measures[1].timeSignature).toBeDefined(); // Has inline TS
    });

    test('First measure with inline TS inherits global', () => {
      const input = 'binary\n3/4 Am[888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const m0 = analyzer.analyze(parsed.measures[0]);
      
      // First measure with inline TS uses global binary
      expect(m0.beamGroups.length).toBe(3);
    });
  });
});
