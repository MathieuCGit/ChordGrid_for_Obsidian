import { ChordGridParser } from '../src/parser/ChordGridParser';
import { MusicAnalyzer } from '../src/analyzer/MusicAnalyzer';

declare const describe: any;
declare const it: any;
declare const expect: any;

describe('Tuplet beam spacing with rests', () => {
  
  it('should handle spacing in tuplet with rests: {16-1616 16-1616}6', () => {
    const parser = new ChordGridParser();
    const analyzer = new MusicAnalyzer();
    
    const result = parser.parseForAnalyzer('4/4 | C[{16-1616 16-1616}6] |');
    const measure = result.measures[0];
    const analyzed = analyzer.analyze(measure);
    
    // Should have 6 notes/rests total (sextuplet: 16, -16, 16, space, 16, -16, 16)
    expect(analyzed.allNotes).toHaveLength(6);
    
    // 4 beamable notes (indices 0, 2, 3, 5)
    const beamableNotes = analyzed.allNotes.filter(n => !n.isRest);
    expect(beamableNotes).toHaveLength(4);
    
    // Check hasLeadingSpace flag on first note after space (index 3)
    expect(analyzed.allNotes[3].hasLeadingSpace).toBe(true);
    
    // Find beam groups
    const level1Beams = analyzed.beamGroups.filter(g => g.level === 1 && !g.isPartial);
    const level2Beamlets = analyzed.beamGroups.filter(g => g.level === 2 && g.isPartial);
    
    // v3.0: Rests do NOT break level-1 beams, only secondary beams (level 2+)
    // Pattern: [16 -16 16 16 -16 16] - all 4 notes connected at level 1
    // Should have ONE level-1 beam connecting all 4 notes
    expect(level1Beams).toHaveLength(1);
    expect(level1Beams[0].notes).toHaveLength(4); // notes 0, 2, 3, 5
    
    // Level 2: Rests block secondary beams
    // Pattern at level 2: [16 16] (rest blocks) [16] (space blocks) [16 16] (rest blocks) [16]
    // Should have multiple level-2 segments based on rest positions
    // The exact count depends on hasLeadingSpace and rest blocking logic
    expect(level2Beamlets.length).toBeGreaterThan(0);
  });
  
  it('should handle simple case with rest: {16-1616}3', () => {
    const parser = new ChordGridParser();
    const analyzer = new MusicAnalyzer();
    
    // Triplet with 3 notes without spaces: 16, rest, 16
    const result = parser.parseForAnalyzer('4/4 | C[{16-1616}3] |');
    const measure = result.measures[0];
    const analyzed = analyzer.analyze(measure);
    
    // Should have 3 notes total (triplet: 16, -16, 16)
    expect(analyzed.allNotes).toHaveLength(3);
    
    // 2 beamable notes (indices 0 and 2)
    const beamableNotes = analyzed.allNotes.filter(n => !n.isRest);
    expect(beamableNotes).toHaveLength(2);
    
    // v3.0: Rests do NOT break level-1 beams, only secondary beams (level 2+)
    // Pattern: [16 -16 16] - both notes connected at level 1
    // Should have ONE level-1 beam connecting both notes
    const level1Beams = analyzed.beamGroups.filter(g => g.level === 1 && !g.isPartial);
    expect(level1Beams).toHaveLength(1);
    expect(level1Beams[0].notes).toHaveLength(2);
    
    // Level 2: Rest blocks secondary beam between the two notes
    // Should have TWO level-2 beamlets (one for each note, separated by rest)
    const level2Beamlets = analyzed.beamGroups.filter(g => g.level === 2 && g.isPartial);
    expect(level2Beamlets).toHaveLength(2);
  });
});
