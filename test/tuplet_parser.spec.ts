import { ChordGridParser } from '../src/parser/ChordGridParser';

describe('Tuplet parsing', () => {
  const parser = new ChordGridParser();

  it('parses a simple triplet {888}3', () => {
    const result = parser.parse('4/4 | C[{888}3] |');
    const notes = result.grid.measures[0].chordSegments[0].beats[0].notes;
    expect(notes.length).toBe(3);
    expect(notes.every(n => n.tuplet && n.tuplet.count === 3)).toBe(true);
    expect(notes[0].tuplet?.position).toBe('start');
    expect(notes[2].tuplet?.position).toBe('end');
  });

  it('parses a spaced triplet {8 8 8}3', () => {
    const result = parser.parse('4/4 | C[{8 8 8}3] |');
    const notes = result.grid.measures[0].chordSegments[0].beats[0].notes;
    expect(notes.length).toBe(3);
    expect(notes.every(n => n.tuplet && n.tuplet.count === 3)).toBe(true);
    expect(notes[1].tuplet?.position).toBe('middle');
  });

  it('parses a sextuplet with subgroups {161616 161616}6', () => {
    const result = parser.parse('4/4 | C[{161616 161616}6] |');
    const notes = result.grid.measures[0].chordSegments[0].beats[0].notes;
    expect(notes.length).toBe(6);
    expect(notes.every(n => n.tuplet && n.tuplet.count === 6)).toBe(true);
    expect(notes[0].tuplet?.position).toBe('start');
    expect(notes[5].tuplet?.position).toBe('end');
  });

  it('parses tuplets with rests {8 -8 8}3', () => {
    const result = parser.parse('4/4 | C[{8 -8 8}3] |');
    const notes = result.grid.measures[0].chordSegments[0].beats[0].notes;
    expect(notes.length).toBe(3);
    expect(notes[1].isRest).toBe(true);
    expect(notes.every(n => n.tuplet && n.tuplet.count === 3)).toBe(true);
  });

  it('parses a quintolet {88888}5', () => {
    const result = parser.parse('4/4 | C[{88888}5] |');
    const notes = result.grid.measures[0].chordSegments[0].beats[0].notes;
    expect(notes.length).toBe(5);
    expect(notes.every(n => n.tuplet && n.tuplet.count === 5)).toBe(true);
  });
});
