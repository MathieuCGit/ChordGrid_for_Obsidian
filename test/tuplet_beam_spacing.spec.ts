import { ChordGridParser } from '../src/parser/ChordGridParser';
import { MusicAnalyzer } from '../src/analyzer/MusicAnalyzer';

describe('Tuplet beam spacing', () => {
  
  it('should break level-2 beam at space in sextuplet {161616 161616}6', () => {
    const parser = new ChordGridParser();
    const analyzer = new MusicAnalyzer();
    
    const result = parser.parseForAnalyzer('4/4 | C[{161616 161616}6] |');
    const measure = result.measures[0];
    const analyzed = analyzer.analyze(measure);
    
    // Should have 6 notes total (sextuplet)
    expect(analyzed.allNotes).toHaveLength(6);
    
    // Check that all notes are in the same tuplet group
    const tupletGroupId = analyzed.allNotes[0].tuplet?.groupId;
    expect(tupletGroupId).toBeDefined();
    analyzed.allNotes.forEach(n => {
      expect(n.tuplet?.groupId).toBe(tupletGroupId);
      expect(n.tuplet?.count).toBe(6);
    });
    
    // Check hasLeadingSpace flag on 4th note (index 3)
    expect(analyzed.allNotes[3].hasLeadingSpace).toBe(true);
    
    // Find beam groups
    const level1Beams = analyzed.beamGroups.filter(g => g.level === 1 && !g.isPartial);
    const level2Beams = analyzed.beamGroups.filter(g => g.level === 2 && !g.isPartial);
    
    // Should have ONE level-1 beam connecting all 6 notes
    expect(level1Beams).toHaveLength(1);
    expect(level1Beams[0].notes).toHaveLength(6);
    
    // Should have TWO level-2 beams (one for each group of 3)
    expect(level2Beams).toHaveLength(2);
    expect(level2Beams[0].notes).toHaveLength(3); // first group: 16-16-16
    expect(level2Beams[1].notes).toHaveLength(3); // second group: 16-16-16
    
    // Verify the note indices
    expect(level2Beams[0].notes.map(n => n.noteIndex)).toEqual([0, 1, 2]);
    expect(level2Beams[1].notes.map(n => n.noteIndex)).toEqual([3, 4, 5]);
  });
  
  it('should handle triplet with space {88 8}3', () => {
    const parser = new ChordGridParser();
    const analyzer = new MusicAnalyzer();
    
    const result = parser.parseForAnalyzer('4/4 | C[{88 8}3] |');
    const measure = result.measures[0];
    const analyzed = analyzer.analyze(measure);
    
    // Should have 3 notes total (triplet)
    expect(analyzed.allNotes).toHaveLength(3);
    
    // Check hasLeadingSpace flag on 3rd note (index 2)
    expect(analyzed.allNotes[2].hasLeadingSpace).toBe(true);
    
    // Find beam groups
    const level1Beams = analyzed.beamGroups.filter(g => g.level === 1 && !g.isPartial);
    
    // Should have ONE level-1 beam connecting all 3 notes
    expect(level1Beams).toHaveLength(1);
    expect(level1Beams[0].notes).toHaveLength(3);
    
    // No level-2 beams (all notes are 8th notes)
    const level2Beams = analyzed.beamGroups.filter(g => g.level === 2);
    expect(level2Beams).toHaveLength(0);
  });
  
  it('should handle complex spacing {161616 88}5', () => {
    const parser = new ChordGridParser();
    const analyzer = new MusicAnalyzer();
    
    const result = parser.parseForAnalyzer('4/4 | C[{161616 88}5] |');
    const measure = result.measures[0];
    const analyzed = analyzer.analyze(measure);
    
    // Should have 5 notes total (quintolet)
    expect(analyzed.allNotes).toHaveLength(5);
    
    // Check hasLeadingSpace flag on 4th note (index 3)
    expect(analyzed.allNotes[3].hasLeadingSpace).toBe(true);
    
    // Find beam groups
    const level1Beams = analyzed.beamGroups.filter(g => g.level === 1 && !g.isPartial);
    const level2Beams = analyzed.beamGroups.filter(g => g.level === 2 && !g.isPartial);
    
    // Should have ONE level-1 beam connecting all 5 notes
    expect(level1Beams).toHaveLength(1);
    expect(level1Beams[0].notes).toHaveLength(5);
    
    // Should have ONE level-2 beam for the first group of 16th notes only
    expect(level2Beams).toHaveLength(1);
    expect(level2Beams[0].notes).toHaveLength(3); // 16-16-16
    expect(level2Beams[0].notes.map(n => n.noteIndex)).toEqual([0, 1, 2]);
  });
});
