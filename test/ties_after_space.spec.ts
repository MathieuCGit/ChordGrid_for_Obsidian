import { ChordGridParser } from '../src/parser/ChordGridParser';

describe('Ties after spaces', () => {
  let parser: ChordGridParser;

  beforeEach(() => {
    parser = new ChordGridParser();
  });

  test('7/8 with ties after spaces: C[88 _88 _888_]', () => {
    const input = `7/8 | C[88 _88 _888_]`;
    const result = parser.parse(input);

    expect(result.errors).toEqual([]);
    expect(result.measures).toHaveLength(1);

    const measure = result.measures[0];
    const segment = measure.chordSegments[0];
    
    console.log('Measure structure:', JSON.stringify(segment.beats, null, 2));
    
    // Expected structure: 3 beats: [88], [88], [888]
    expect(segment.beats).toHaveLength(3);
    
    // First beat: two eighths, no tie
    expect(segment.beats[0].notes).toHaveLength(2);
    expect(segment.beats[0].notes[0].tieStart).toBe(false);
    expect(segment.beats[0].notes[1].tieStart).toBe(false);
    
    // Second beat: two eighths
    // First note should have tieEnd (from "_" before it)
    // Second note should have tieStart (from "_" after it)
    expect(segment.beats[1].notes).toHaveLength(2);
    expect(segment.beats[1].notes[0].tieEnd).toBe(true);
    expect(segment.beats[1].notes[0].tieStart).toBe(false);
    expect(segment.beats[1].notes[1].tieStart).toBe(true);
    expect(segment.beats[1].notes[1].tieEnd).toBe(false);
    
    // Third beat: three eighths
    // First note should have tieEnd (from "_" before it)
    // Last note should have tieStart (from "_" after it in tieToVoid)
    expect(segment.beats[2].notes).toHaveLength(3);
    expect(segment.beats[2].notes[0].tieEnd).toBe(true);
    expect(segment.beats[2].notes[2].tieStart).toBe(true);
    expect(segment.beats[2].notes[2].tieToVoid).toBe(true);
  });

  test('Simple case: C[88 _88]', () => {
    const input = `4/4 | C[88 _88]`;
    const result = parser.parse(input);

    expect(result.errors).toEqual([]);
    
    const segment = result.measures[0].chordSegments[0];
    console.log('Simple case structure:', JSON.stringify(segment.beats, null, 2));
    
    // Two beats: [88], [88]
    expect(segment.beats).toHaveLength(2);
    
    // First beat: last note should have tieStart
    expect(segment.beats[0].notes[1].tieStart).toBe(true);
    
    // Second beat: first note should have tieEnd
    expect(segment.beats[1].notes[0].tieEnd).toBe(true);
  });

  test('4/4 with ties: C[88_88 88 88]', () => {
    const input = `4/4 | C[88_88 88 88]`;
    const result = parser.parse(input);

    expect(result.errors).toEqual([]);
    
    const segment = result.measures[0].chordSegments[0];
    console.log('4/4 case structure:', JSON.stringify(segment.beats, null, 2));
    
    // Expected: [88_88], [88], [88]
    expect(segment.beats).toHaveLength(3);
    
    // First beat: notes 0 and 1, note 0 should have tieStart
    expect(segment.beats[0].notes[0].tieStart).toBe(true);
    expect(segment.beats[0].notes[1].tieEnd).toBe(true);
  });
});
