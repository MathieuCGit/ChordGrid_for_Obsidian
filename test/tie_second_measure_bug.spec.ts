import { ChordGridParser } from '../src/parser/ChordGridParser';

// Simplified regression test: ensure A[8_] to [_4] remains a normal intra-measure tie
// (tieStart on the eighth, tieEnd on the quarter) without tieToVoid / tieFromVoid flags.

describe('Regression: intra-measure tie continuity across chord-less bracket', () => {
  // Use at least two measures so the first measure isn't flagged as line-end (avoids tieToVoid on A[8_])
  const input = '4/4 | D[4.]A[8_] [_4] D[4_] | [_8]A[8_] [_4] E[4 4] |';

  it('keeps tieStart on A[8_] and tieEnd on quarter [_4] without void flags', () => {
    const parser = new ChordGridParser();
    const grid = parser.parse(input);
    const m0 = grid.measures[0];
    const notesM0 = m0.chordSegments.flatMap(s => s.beats.flatMap(b => b.notes));

    const startNote = notesM0.find(n => n.value === 8 && n.tieStart);
    expect(startNote).toBeDefined();
    if (!startNote) return;
    expect(startNote.tieToVoid).toBe(false);

    const endNote = notesM0.find(n => n.value === 4 && n.tieEnd);
    expect(endNote).toBeDefined();
    if (!endNote) return;
    expect(endNote.tieFromVoid).toBe(false);
  });
});
