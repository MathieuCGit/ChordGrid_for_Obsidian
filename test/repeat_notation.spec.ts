import { ChordGridParser } from '../src/parser/ChordGridParser';

describe('Repeat notation (%)', () => {
  let parser: ChordGridParser;

  beforeEach(() => {
    parser = new ChordGridParser();
  });

  test('Simple % repeats entire previous measure', () => {
    const input = `4/4 | C[4 88_4 4] | % |`;
    const result = parser.parse(input);

    expect(result.errors).toEqual([]);
    expect(result.measures).toHaveLength(2);

    const measure1 = result.measures[0];
    const measure2 = result.measures[1];

    // Measure 2 should be a repeat
    expect(measure2.isRepeat).toBe(true);
    
    // Measure 2 should have same chord as measure 1
    expect(measure2.chord).toBe(measure1.chord);
    expect(measure2.chord).toBe('C');

    // Measure 2 should have same rhythm structure
    expect(measure2.beats).toHaveLength(measure1.beats.length);
    expect(measure2.beats[0].notes).toHaveLength(measure1.beats[0].notes.length);

    // Check rhythm values match
    expect(measure2.beats[0].notes[0].value).toBe(4);
    expect(measure2.beats[1].notes[0].value).toBe(8);
    expect(measure2.beats[1].notes[1].value).toBe(8);
  });

  test('Chord[%] repeats rhythm with new chord', () => {
    const input = `4/4 | C[4 88_4 4] | G[%] |`;
    const result = parser.parse(input);

    expect(result.errors).toEqual([]);
    expect(result.measures).toHaveLength(2);

    const measure1 = result.measures[0];
    const measure2 = result.measures[1];

    // Measure 2 should be a repeat
    expect(measure2.isRepeat).toBe(true);
    
    // Measure 2 should have new chord
    expect(measure2.chord).toBe('G');
    expect(measure2.chord).not.toBe(measure1.chord);

    // Measure 2 should have same rhythm structure
    expect(measure2.beats).toHaveLength(measure1.beats.length);
    expect(measure2.beats[0].notes[0].value).toBe(4);
    expect(measure2.beats[1].notes[0].value).toBe(8);
  });

  test('Chained % repeats reference previous non-% measure', () => {
    const input = `4/4 | C[4 4 4 4] | % | % |`;
    const result = parser.parse(input);

    expect(result.errors).toEqual([]);
    expect(result.measures).toHaveLength(3);

    const measure1 = result.measures[0];
    const measure2 = result.measures[1];
    const measure3 = result.measures[2];

    // All should have chord C
    expect(measure1.chord).toBe('C');
    expect(measure2.chord).toBe('C');
    expect(measure3.chord).toBe('C');

    // All should be marked as repeats except first
    expect(measure1.isRepeat).toBeUndefined();
    expect(measure2.isRepeat).toBe(true);
    expect(measure3.isRepeat).toBe(true);

    // All should have same rhythm
    expect(measure2.beats).toHaveLength(4);
    expect(measure3.beats).toHaveLength(4);
  });

  test('Chord[%] followed by % repeats the Chord[%] measure', () => {
    const input = `4/4 | C[4 88_4 4] | G[%] | % |`;
    const result = parser.parse(input);

    expect(result.errors).toEqual([]);
    expect(result.measures).toHaveLength(3);

    const measure2 = result.measures[1];
    const measure3 = result.measures[2];

    // Measure 3 should repeat measure 2 (which has G chord)
    expect(measure2.chord).toBe('G');
    expect(measure3.chord).toBe('G');
    expect(measure3.isRepeat).toBe(true);
  });

  test('Ties are cleared at measure boundaries in repeated measures', () => {
    const input = `4/4 | C[4 88_4 4_] | % |`;
    const result = parser.parse(input);

    expect(result.errors).toEqual([]);
    expect(result.measures).toHaveLength(2);

    const measure1 = result.measures[0];
    const measure2 = result.measures[1];

    // Original measure should have tieStart on last note
    const lastBeat1 = measure1.beats[measure1.beats.length - 1];
    const lastNote1 = lastBeat1.notes[lastBeat1.notes.length - 1];
    expect(lastNote1.tieStart).toBe(true);

    // Cloned measure should NOT have tieStart on last note (cleared)
    const lastBeat2 = measure2.beats[measure2.beats.length - 1];
    const lastNote2 = lastBeat2.notes[lastBeat2.notes.length - 1];
    expect(lastNote2.tieStart).toBe(false);
    expect(lastNote2.tieToVoid).toBe(false);
  });

  test('% on first measure should be ignored with warning', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    const input = `4/4 | % | C[4 4 4 4] |`;
    const result = parser.parse(input);

    expect(result.measures).toHaveLength(1); // Only the C measure
    expect(result.measures[0].chord).toBe('C');
    expect(consoleWarnSpy).toHaveBeenCalledWith("Cannot use '%' repeat notation on first measure");
    
    consoleWarnSpy.mockRestore();
  });

  test('Chord[%] on first measure should be ignored with warning', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    const input = `4/4 | G[%] | C[4 4 4 4] |`;
    const result = parser.parse(input);

    expect(result.measures).toHaveLength(1); // Only the C measure
    expect(result.measures[0].chord).toBe('C');
    expect(consoleWarnSpy).toHaveBeenCalledWith("Cannot use '[%]' repeat notation on first measure");
    
    consoleWarnSpy.mockRestore();
  });

  test('Complex scenario from user example', () => {
    const input = `4/4 | C[4 88_4 4] | % | G[%] | % |`;
    const result = parser.parse(input);

    expect(result.errors).toEqual([]);
    expect(result.measures).toHaveLength(4);

    // Measure 1: C[4 88_4 4]
    expect(result.measures[0].chord).toBe('C');
    expect(result.measures[0].isRepeat).toBeUndefined();

    // Measure 2: % (repeats measure 1 completely)
    expect(result.measures[1].chord).toBe('C');
    expect(result.measures[1].isRepeat).toBe(true);

    // Measure 3: G[%] (same rhythm, new chord)
    expect(result.measures[2].chord).toBe('G');
    expect(result.measures[2].isRepeat).toBe(true);

    // Measure 4: % (repeats measure 3)
    expect(result.measures[3].chord).toBe('G');
    expect(result.measures[3].isRepeat).toBe(true);

    // All should have same rhythm structure (3 beats: [4], [88_4], [4])
    expect(result.measures[0].beats).toHaveLength(3);
    expect(result.measures[1].beats).toHaveLength(3);
    expect(result.measures[2].beats).toHaveLength(3);
    expect(result.measures[3].beats).toHaveLength(3);
  });
});
