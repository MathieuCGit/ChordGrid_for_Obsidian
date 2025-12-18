import { ChordGridParser } from '../src/parser/ChordGridParser';

/**
 * Regression parse test for tie incorrectly converted to tieToVoid inside a measure.
 */

describe('Parse ties inside measure without chord symbol on target bracket', () => {
  const input = '4/4 | D[4.]A[8_] [_4] D[4_] | [_8]A[8_] [_4] E[4 4] |';

  it('keeps tie from A[8_] to [_4] as normal (tieStart on A, tieEnd on [_4], no tieToVoid)', () => {
    const parser = new ChordGridParser();
    const grid = parser.parse(input);
    expect(grid.errors).toEqual([]);
    expect(grid.measures.length).toBeGreaterThanOrEqual(2);

  const m0 = grid.measures[0];
  // Flatten ALL segments of measure 0 (the A[8_] is in the second segment)
  const notesM0 = m0.chordSegments.flatMap(s => s.beats.flatMap(b => b.notes));
  // Find A[8_] tieStart (value 8, tieStart true, dotted false) anywhere in measure 0
  const tieStartNote = notesM0.find(n => n.tieStart && n.value === 8 && !n.isRest);
    expect(tieStartNote).toBeDefined();
    if (!tieStartNote) return;
    expect(tieStartNote.tieToVoid).toBe(false);

  // Quarter note receiving tieEnd is in SAME measure (pattern: A[8_] [_4])
  const tieEndQuarter = notesM0.find(n => n.tieEnd && n.value === 4);
  expect(tieEndQuarter).toBeDefined();
  if (!tieEndQuarter) return;
  expect(tieEndQuarter.tieFromVoid).toBe(false);
  });
});
