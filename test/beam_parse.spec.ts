import { ChordGridParser } from '../src/parser/ChordGridParser';
import { MusicAnalyzer } from '../src/analyzer/MusicAnalyzer';

declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;

describe('ChordGridParser - beam detection', () => {
  let parser: ChordGridParser;
  let analyzer: MusicAnalyzer;

  beforeEach(() => {
    parser = new ChordGridParser();
    analyzer = new MusicAnalyzer();
  });

  it('should handle chord ligature continuity correctly', () => {
    // Version >=2.0.1 : Le parser retourne des chordSegments
    
    // Test: 8]G[8 - pas d'espace avant G
    const result1 = parser.parse('4/4\nAm[4 8]G[8] |');
    const measure1 = result1.grid.measures[0];
    expect(measure1.chordSegments).toHaveLength(2);
    expect(measure1.chordSegments[0].chord).toBe('Am');
    expect(measure1.chordSegments[1].chord).toBe('G');
    expect(measure1.chordSegments[1].leadingSpace).toBe(false);

    // Test: 8] G[8 - espace avant G
    const result2 = parser.parse('4/4\nAm[4 8] G[8] |');
    const measure2 = result2.grid.measures[0];
    expect(measure2.chordSegments).toHaveLength(2);
    expect(measure2.chordSegments[1].leadingSpace).toBe(true);
  });

  it('should keep beam groups within the same chord segment', () => {
    // Version >=2.0.1 : Vérifie la structure des segments parsés
    const result = parser.parse('4/4\nAm[8 8]G[8 8] |');
    const measure = result.grid.measures[0];
    
    // Deux segments avec des notes
    expect(measure.chordSegments).toHaveLength(2);
    expect(measure.chordSegments[0].chord).toBe('Am');
    expect(measure.chordSegments[0].beats).toHaveLength(2);
    expect(measure.chordSegments[1].chord).toBe('G');
    expect(measure.chordSegments[1].beats).toHaveLength(2);
  });
});