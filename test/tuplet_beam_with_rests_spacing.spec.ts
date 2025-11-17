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
    
    // Should have ONE level-1 beam connecting all 4 beamable notes (across rests and space)
    expect(level1Beams).toHaveLength(1);
    expect(level1Beams[0].notes).toHaveLength(4); // notes 0, 2, 3, 5
    
    // Should have 4 level-2 beamlets (one for each isolated 16th note)
    // Note 0: beamlet right (toward note 2, before rest)
    // Note 2: beamlet left (after rest, followed by space)
    // Note 3: beamlet right (preceded by space, before rest)
    // Note 5: beamlet left (after rest, at end)
    expect(level2Beamlets).toHaveLength(4);
    expect(level2Beamlets[0].direction).toBe('right');
    expect(level2Beamlets[1].direction).toBe('left');
    expect(level2Beamlets[2].direction).toBe('right');
    expect(level2Beamlets[3].direction).toBe('left');
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
    
    // Should have ONE level-1 beam connecting both notes (across the rest)
    const level1Beams = analyzed.beamGroups.filter(g => g.level === 1 && !g.isPartial);
    expect(level1Beams).toHaveLength(1);
    expect(level1Beams[0].notes).toHaveLength(2);
    
    // Should have TWO level-2 beamlets (rest -16 breaks level 2)
    const level2Beamlets = analyzed.beamGroups.filter(g => g.level === 2 && g.isPartial);
    expect(level2Beamlets).toHaveLength(2);
    expect(level2Beamlets[0].direction).toBe('right');
    expect(level2Beamlets[1].direction).toBe('left');
  });
});
