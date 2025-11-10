import { ChordGridParser } from '../src/parser/ChordGridParser';
import { ParseResult } from '../src/parser/type';

declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;

describe('ChordGridParser - beam detection', () => {
  let parser: ChordGridParser;

  beforeEach(() => {
    parser = new ChordGridParser();
  });

  it('should handle chord ligature continuity correctly', () => {
    // Test: 8]G[8 - pas d'espace avant G, les croches devraient être liées
    const result1 = parser.parse('4/4\nAm[4 8]G[8] |');
    const measure1 = result1.measures[0];
    expect(measure1.beats[1].hasBeam).toBe(true);
    expect(measure1.beats[1].beamGroups.length).toBe(1);
    expect(measure1.beats[1].beamGroups[0].noteCount).toBe(2);

    // Test: 8] G[8 - espace avant G, les croches ne devraient pas être liées
    const result2 = parser.parse('4/4\nAm[4 8] G[8] |');
    const measure2 = result2.measures[0];
    expect(measure2.beats[1].hasBeam).toBe(false);
    expect(measure2.beats[1].beamGroups.length).toBe(0);
  });

  it('should keep beam groups within the same chord segment', () => {
    const result = parser.parse('4/4\nAm[8 8]G[8 8] |');
    const measure = result.measures[0];
    
    // Premier segment (Am)
    expect(measure.chordSegments[0].beats[0].hasBeam).toBe(true);
    expect(measure.chordSegments[0].beats[0].beamGroups.length).toBe(1);
    expect(measure.chordSegments[0].beats[0].beamGroups[0].noteCount).toBe(2);

    // Deuxième segment (G)
    expect(measure.chordSegments[1].beats[0].hasBeam).toBe(true);
    expect(measure.chordSegments[1].beats[0].beamGroups.length).toBe(1);
    expect(measure.chordSegments[1].beats[0].beamGroups[0].noteCount).toBe(2);
  });
});