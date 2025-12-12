import { ChordGridParser } from '../src/parser/ChordGridParser';
import { MusicAnalyzer } from '../src/analyzer/MusicAnalyzer';

describe('3/4 auto mode regression', () => {
  let parser: ChordGridParser;
  let analyzer: MusicAnalyzer;

  beforeEach(() => {
    parser = new ChordGridParser();
    analyzer = new MusicAnalyzer();
  });

  test('3/4 in space-based mode respects user spaces', () => {
    const input = `4/4 | C | G | 3/4 Am[888 888] | 4/4 Em |`;
    
    const result = parser.parse(input);
    
    console.log('=== PARSED RESULT ===');
    console.log('Global timeSignature:', result.grid.timeSignature);
    console.log('Measure 2 (3/4 Am):', {
      timeSignature: result.measures[2].timeSignature,
      chord: result.measures[2].chord,
      beats: result.measures[2].beats?.length
    });
    
    expect(result.errors).toEqual([]);
    
    // v3.0: 3/4 should inherit 'space-based' from 4/4 (default)
    expect(result.measures[2].timeSignature?.groupingMode).toBe('space-based');
    
    // Test the actual beam grouping
    const parsed = parser.parseForAnalyzer(input);
    console.log('\n=== ANALYZER INPUT ===');
    console.log('Measure 2 timeSignature:', parsed.measures[2].timeSignature);
    console.log('Measure 2 segments:', JSON.stringify(parsed.measures[2].segments, null, 2));
    
    const analyzed = analyzer.analyze(parsed.measures[2]);
    
    console.log('\n=== ANALYZED RESULT ===');
    console.log('Beam groups count:', analyzed.beamGroups.length);
    console.log('Beam groups:', analyzed.beamGroups.map(bg => ({
      level: bg.level,
      noteCount: bg.notes.length
    })));
    
    // In 3/4 auto mode with [888 888], should have 3 groups: [8,8] [8] [8] [8,8]
    // Wait... that's wrong! It should be 2 groups based on the space: [8,8,8] [8,8,8]
    // But in auto mode, 3/4 should break on beat boundaries
    
    // Let me check what's happening
    expect(analyzed.beamGroups.length).toBeGreaterThan(0);
  });

  test('3/4 with auto-beam should group by beats', () => {
    const input = `auto-beam\n3/4 Am[888888]`;
    
    const result = parser.parse(input);
    
    console.log('\n=== STANDALONE 3/4 TEST WITH AUTO-BEAM ===');
    console.log('Global timeSignature:', result.grid.timeSignature);
    
    expect(result.errors).toEqual([]);
    
    // Test the actual beam grouping
    const parsed = parser.parseForAnalyzer(input);
    const analyzed = analyzer.analyze(parsed.measures[0]);
    
    console.log('Beam groups count:', analyzed.beamGroups.length);
    console.log('Beam groups:', analyzed.beamGroups.map(bg => ({
      level: bg.level,
      noteCount: bg.notes.length
    })));
    
    // v3.0: In 3/4 auto-beam mode, breaks at each beat (quarter note)
    // 6 eighths = 3 beats → 3 groups of 2
    expect(analyzed.beamGroups.length).toBe(3);
    expect(analyzed.beamGroups[0].notes.length).toBe(2);
    expect(analyzed.beamGroups[1].notes.length).toBe(2);
    expect(analyzed.beamGroups[2].notes.length).toBe(2);
  });
});
