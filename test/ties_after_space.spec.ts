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
    
    // First beat: two eighths
    // Last note should have tieStart (will tie to first note of next beat)
    expect(segment.beats[0].notes).toHaveLength(2);
    expect(segment.beats[0].notes[0].tieStart).toBe(false);
    expect(segment.beats[0].notes[1].tieStart).toBe(true); // Changed: last note has tieStart
    
    // Second beat: two eighths
    // First note should have tieEnd (from previous beat's last note)
    // Second note should have tieStart (will tie to first note of next beat)
    expect(segment.beats[1].notes).toHaveLength(2);
    expect(segment.beats[1].notes[0].tieEnd).toBe(true);
    expect(segment.beats[1].notes[0].tieStart).toBe(false);
    expect(segment.beats[1].notes[1].tieStart).toBe(true); // Changed: last note has tieStart
    expect(segment.beats[1].notes[1].tieEnd).toBe(false);
    
    // Third beat: three eighths
    // First note should have tieEnd (from previous beat's last note)
    // Last note should have tieStart (tie to void at end of measure)
    expect(segment.beats[2].notes).toHaveLength(3);
    expect(segment.beats[2].notes[0].tieEnd).toBe(true);
    expect(segment.beats[2].notes[2].tieStart).toBe(true);
    expect(segment.beats[2].notes[2].tieToVoid).toBe(true);
  });

  test('Simple case: C[88 _88]', () => {
    const input = `4/4 | C[88 _88 4 4]`; // Added 4 4 to complete the 4/4 measure
    const result = parser.parse(input);

    expect(result.errors).toEqual([]);
    
    const segment = result.measures[0].chordSegments[0];
    console.log('Simple case structure:', JSON.stringify(segment.beats, null, 2));
    
    // Four beats: [88], [88], [4], [4]
    expect(segment.beats).toHaveLength(4);
    
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
    
    // First beat: 4 notes (88_88 means 4 eighth notes with tie between 2nd and 3rd)
    // The tie (_) marks that note 1 ties to note 2
    expect(segment.beats[0].notes).toHaveLength(4);
    expect(segment.beats[0].notes[1].tieStart).toBe(true); // 2nd note starts tie
    expect(segment.beats[0].notes[2].tieEnd).toBe(true);  // 3rd note ends tie
  });
});
