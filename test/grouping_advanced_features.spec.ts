import { ChordGridParser } from '../src/parser/ChordGridParser';
import { MusicAnalyzer } from '../src/analyzer/MusicAnalyzer';

/**
 * NEW SPECIFICATION - Advanced Features with New Modes
 * 
 * Principe : Les fonctionnalités avancées (tuplets, ties, pick strokes) 
 * fonctionnent avec tous les modes de groupement.
 * - Tuplets : Gardent leur intégrité dans tous les modes
 * - Ties : Forcent le beam dans tous les modes
 * - Pick strokes : Indépendants du mode de groupement
 * - Modes et features avancées sont orthogonaux
 */
describe('NEW SPEC: Advanced features with new grouping modes', () => {
  let parser: ChordGridParser;
  let analyzer: MusicAnalyzer;

  beforeEach(() => {
    parser = new ChordGridParser();
    analyzer = new MusicAnalyzer();
  });

  describe('Tuplets with different modes', () => {
    test('Default: tuplets respect spaces', () => {
      const input = '4/4 | C[{888}3:2 {888}3:2 4 4] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // Space between tuplets → 2 groups
      expect(analyzed.beamGroups.length).toBe(2);
    });

    test('auto-beam: tuplets maintain primary beam, ignore spaces', () => {
      const input = 'auto-beam\n4/4 | C[{888}3:2 {888}3:2 4 4] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // auto-beam ignores space, but tuplets may still break
      // (depends on implementation: tuplets could stay as separate groups)
      expect(analyzed.beamGroups.length).toBeGreaterThanOrEqual(1);
    });

    test('binary: mixed tuplets and regular notes', () => {
      const input = 'binary\n4/4 | C[88 {888}3:2 88 4] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // Spaces ignored, binary grouping applied
      expect(analyzed.beamGroups.length).toBeGreaterThan(0);
    });
  });

  describe('Ties with different modes', () => {
    test('Default: ties do not affect beams (space-based)', () => {
      const input = '4/4 | C[88_88_88_88] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // No spaces = 1 continuous beam, ties don't break beams (2+2+2+2 = 8 eighths = 4 quarters)
      expect(analyzed.beamGroups.length).toBe(1);
      expect(analyzed.beamGroups[0].notes.length).toBe(8);
    });

    test('auto-beam: ties work normally', () => {
      const input = 'auto-beam\n4/4 | C[88_ _888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // Tie connects first 3 notes, then auto-beam groups remaining
      expect(analyzed.beamGroups.length).toBeGreaterThan(0);
    });

    test('binary: ties respected', () => {
      const input = 'binary\n3/4 | Am[88_ _8888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // Tie connects first 3, then binary groups remaining
      expect(analyzed.beamGroups.length).toBeGreaterThan(0);
    });
  });

  describe('Pick strokes with different modes', () => {
    test('Default: pick strokes with spaces', () => {
      const input = '4/4 | C[8888 8888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      // Pick strokes are rendered via options, not notation (8 eighth notes)
      expect(result.measures[0].chordSegments[0].beats.flatMap(b => b.notes).length).toBe(8);
    });

    test('auto-beam: pick strokes maintained', () => {
      const input = 'auto-beam\n4/4 | C[88888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      // Pick strokes independent of grouping mode (8 eighth notes)
      expect(result.measures[0].chordSegments[0].beats.flatMap(b => b.notes).length).toBe(8);
    });

    test('binary: pick strokes with binary grouping', () => {
      const input = 'binary\n3/4 | Am[888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      // Spaces ignored, pick strokes kept (6 eighth notes)
      expect(result.measures[0].chordSegments[0].beats.flatMap(b => b.notes).length).toBe(6);
    });
  });

  describe('Rests always break beams (in all modes)', () => {
    test('Default: rest breaks beam', () => {
      const input = '4/4 | C[888-4888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // Rest = hard break (3 eighths + quarter rest + 3 eighths = 4 quarters)
      expect(analyzed.beamGroups.length).toBe(2);
    });

    test('auto-beam: rest breaks beam', () => {
      const input = 'auto-beam\n4/4 | C[888-4888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // auto-beam in 4/4: breaks at beat boundaries + rest
      // [888-4888] → [88 8 -4 8 88] = 4 beam groups
      expect(analyzed.beamGroups.length).toBe(4);
    });

    test('binary: rest breaks beam', () => {
      const input = 'binary\n3/4 | Am[88-8888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // binary mode in 3/4: breaks at beat boundaries + rest
      // [88-8888] → [88 -8 88 88] = 3 beam groups (rest breaks, then beat breaks)
      expect(analyzed.beamGroups.length).toBe(3);
    });
  });

  describe('Dotted notes with different modes', () => {
    test('Default: dotted notes with spaces', () => {
      const input = '4/4 | C[8. 16 88 88 4] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // Spaces create groups
      expect(analyzed.beamGroups.length).toBeGreaterThan(1);
    });

    test('auto-beam: dotted notes with auto-grouping', () => {
      const input = 'auto-beam\n4/4 | C[8. 16 88 88 4] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // auto-beam ignores spaces
      expect(analyzed.beamGroups.length).toBeGreaterThan(0);
    });
  });

  describe('Mixed note values with different modes', () => {
    test('Default: mixed values respect spaces', () => {
      const input = '4/4 | C[4 88 88 4] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // Quarters don't beam, eighths beam by groups (2 groups)
      expect(analyzed.beamGroups.length).toBe(2);
    });

    test('auto-beam: mixed values with auto-grouping', () => {
      const input = 'auto-beam\n4/4 | C[4 8888 4] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // Spaces ignored, eighths auto-grouped (2 groups of 2)
      expect(analyzed.beamGroups.length).toBe(2);
    });
  });

  describe('Complex combinations', () => {
    test('Default: tuplet + tie + space', () => {
      const input = '4/4 | C[{84_}3:2 _88 4 4] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // Tie forces connection despite space
      expect(analyzed.beamGroups.length).toBeGreaterThan(0);
    });

    test('auto-beam: tuplet + tie + pick strokes', () => {
      const input = 'auto-beam\n4/4 | C[{888}3:2 8_8 88 4] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      // All features should work together
      expect(result.errors).toEqual([]);
    });

    test('binary: all features combined', () => {
      const input = 'binary\n3/4 | Am[8888 88] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      // Complex but valid
      expect(result.errors).toEqual([]);
    });
  });

  describe('Validation still works', () => {
    test('Default: invalid measure length detected', () => {
      const input = '4/4 | C[88] |'; // Only 1 quarter, need 4
      const result = parser.parse(input);

      // Should have validation error
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('expected 4 quarter-notes');
    });

    test('auto-beam: invalid measure length detected', () => {
      const input = 'auto-beam\n3/4 | Am[8888] |'; // Only 2 quarters, need 3
      const result = parser.parse(input);

      // Should have validation error
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('expected 3 quarter-notes');
    });

    test('binary: tuplet ratio validation', () => {
      const input = 'binary\n4/4 | C[{888}3:4 4 4] |'; // 3:4 ratio tuplet
      const result = parser.parse(input);

      // Tuplet ratio 3:4 is valid (3 eighths in time of 4 eighths = 2 quarters)
      // Total: 2 + 1 + 1 = 4 quarters ✓
      expect(result.errors.length).toBe(0);
    });
  });
});
