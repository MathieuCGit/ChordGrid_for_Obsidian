import { ChordGridParser } from '../src/parser/ChordGridParser';
import { MusicAnalyzer } from '../src/analyzer/MusicAnalyzer';

/**
 * NEW SPECIFICATION - Default Behavior: Space-Based Grouping
 * 
 * Principe : Par défaut (sans directive), le script respecte STRICTEMENT les espaces.
 * - Espaces → coupures de barres
 * - Pas d'espace → pas de coupure
 * - Aucun auto-break algorithmique
 * 
 * Philosophy: "What you write is what you get" (markdown spirit)
 */
describe('NEW SPEC: Default space-based grouping', () => {
  let parser: ChordGridParser;
  let analyzer: MusicAnalyzer;

  beforeEach(() => {
    parser = new ChordGridParser();
    analyzer = new MusicAnalyzer();
  });

  describe('Basic space-based grouping in 4/4', () => {
    test('[88 88 88 88] should create 4 groups (one per space)', () => {
      const input = '4/4 | C[88 88 88 88] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // 4 spaces = 4 groups
      expect(analyzed.beamGroups.length).toBe(4);
      expect(analyzed.beamGroups[0].notes.length).toBe(2);
      expect(analyzed.beamGroups[1].notes.length).toBe(2);
      expect(analyzed.beamGroups[2].notes.length).toBe(2);
      expect(analyzed.beamGroups[3].notes.length).toBe(2);
    });

    test('[88888888] should create 1 group (no spaces = no breaks)', () => {
      const input = '4/4 | C[88888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // No spaces = 1 continuous beam
      expect(analyzed.beamGroups.length).toBe(1);
      expect(analyzed.beamGroups[0].notes.length).toBe(8);
    });

    test('[8888 8888] should create 2 groups', () => {
      const input = '4/4 | C[8888 8888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // 1 space = 2 groups
      expect(analyzed.beamGroups.length).toBe(2);
      expect(analyzed.beamGroups[0].notes.length).toBe(4);
      expect(analyzed.beamGroups[1].notes.length).toBe(4);
    });

    test('[88 8888 88] should create 3 groups (irregular spacing)', () => {
      const input = '4/4 | C[88 8888 88] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // 2 spaces = 3 groups of different sizes
      expect(analyzed.beamGroups.length).toBe(3);
      expect(analyzed.beamGroups[0].notes.length).toBe(2);
      expect(analyzed.beamGroups[1].notes.length).toBe(4);
      expect(analyzed.beamGroups[2].notes.length).toBe(2);
    });
  });

  describe('Space-based grouping in 3/4', () => {
    test('[888 888] should create 2 groups (NOT 3 or 4!)', () => {
      const input = '3/4 | Am[888 888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // 1 space = 2 groups, no auto-break at beat boundaries
      expect(analyzed.beamGroups.length).toBe(2);
      expect(analyzed.beamGroups[0].notes.length).toBe(3);
      expect(analyzed.beamGroups[1].notes.length).toBe(3);
    });

    test('[888888] should create 1 group (no auto-break)', () => {
      const input = '3/4 | Am[888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // No space = 1 continuous beam of 6 eighth notes
      expect(analyzed.beamGroups.length).toBe(1);
      expect(analyzed.beamGroups[0].notes.length).toBe(6);
    });

    test('[88 88 88] should create 3 groups', () => {
      const input = '3/4 | Am[88 88 88] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // 2 spaces = 3 groups
      expect(analyzed.beamGroups.length).toBe(3);
      expect(analyzed.beamGroups[0].notes.length).toBe(2);
      expect(analyzed.beamGroups[1].notes.length).toBe(2);
      expect(analyzed.beamGroups[2].notes.length).toBe(2);
    });
  });

  describe('Space-based grouping in 6/8', () => {
    test('[888 888] should create 2 groups (no ternary auto-break)', () => {
      const input = '6/8 | C[888 888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // 1 space = 2 groups, even in compound meter
      expect(analyzed.beamGroups.length).toBe(2);
      expect(analyzed.beamGroups[0].notes.length).toBe(3);
      expect(analyzed.beamGroups[1].notes.length).toBe(3);
    });

    test('[888888] should create 1 group', () => {
      const input = '6/8 | C[888888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // No space = 1 continuous beam
      expect(analyzed.beamGroups.length).toBe(1);
      expect(analyzed.beamGroups[0].notes.length).toBe(6);
    });
  });

  describe('Complex meters with space-based grouping', () => {
    test('5/8 [88 88 8] should create 3 groups', () => {
      const input = '5/8 | C[88 88 8] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // User decides grouping: 2+2+1
      expect(analyzed.beamGroups.length).toBe(3);
      expect(analyzed.beamGroups[0].notes.length).toBe(2);
      expect(analyzed.beamGroups[1].notes.length).toBe(2);
      expect(analyzed.beamGroups[2].notes.length).toBe(1);
    });

    test('7/8 [88 88 888] should create 3 groups', () => {
      const input = '7/8 | C[88 88 888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // User decides grouping: 2+2+3
      expect(analyzed.beamGroups.length).toBe(3);
      expect(analyzed.beamGroups[0].notes.length).toBe(2);
      expect(analyzed.beamGroups[1].notes.length).toBe(2);
      expect(analyzed.beamGroups[2].notes.length).toBe(3);
    });

    test('7/8 [888 88 88] should create 3 groups (alternative grouping)', () => {
      const input = '7/8 | C[888 88 88] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // User decides grouping: 3+2+2
      expect(analyzed.beamGroups.length).toBe(3);
      expect(analyzed.beamGroups[0].notes.length).toBe(3);
      expect(analyzed.beamGroups[1].notes.length).toBe(2);
      expect(analyzed.beamGroups[2].notes.length).toBe(2);
    });
  });

  describe('Mixed note values with spaces', () => {
    test('[16161616 16161616] should create 2 groups', () => {
      const input = '4/4 | C[1616161616161616 1616161616161616] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // 1 space = 2 segments, but sixteenths create 2 beam levels each (level 1 + level 2)
      // Total: 2 segments × 2 levels = 4 BeamGroups
      expect(analyzed.beamGroups.length).toBe(4);
      // Check level 1 groups (primary beams) have 8 notes each
      const level1Groups = analyzed.beamGroups.filter(g => g.level === 1);
      expect(level1Groups.length).toBe(2);
      expect(level1Groups[0].notes.length).toBe(8);
      expect(level1Groups[1].notes.length).toBe(8);
    });

    test('[4 88 88 4] should create 3 groups (mixed values)', () => {
      const input = '4/4 | C[4 88 88 4] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // Quarters don't beam, but groups are still separated by spaces
      // Group 1: quarter (no beam)
      // Group 2: 2 eighths (beam)
      // Group 3: 2 eighths (beam)
      // Group 4: quarter (no beam)
      expect(analyzed.beamGroups.length).toBe(2); // Only beamable groups
    });
  });

  describe('Rests respect spacing', () => {
    test('[88 r 88] should create 2 groups (rest creates natural break)', () => {
      const input = '4/4 | C[8888 -8 888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // Rest always breaks beams (4 eighths + eighth rest + 3 eighths = 8 eighths = 4 quarters)
      expect(analyzed.beamGroups.length).toBe(2);
      expect(analyzed.beamGroups[0].notes.length).toBe(4);
      expect(analyzed.beamGroups[1].notes.length).toBe(3);
    });

    test('[8888r8888] should create 2 groups (rest breaks even without space)', () => {
      const input = '4/4 | C[888-4888] |';
      const result = parser.parse(input);
      expect(result.errors).toEqual([]);

      const parsed = parser.parseForAnalyzer(input);
      const analyzed = analyzer.analyze(parsed.measures[0]);

      // Rest is a hard break (3 eighths + quarter rest + 3 eighths = 4 quarters total)
      expect(analyzed.beamGroups.length).toBe(2);
      expect(analyzed.beamGroups[0].notes.length).toBe(3);
      expect(analyzed.beamGroups[1].notes.length).toBe(3);
    });
  });
});
