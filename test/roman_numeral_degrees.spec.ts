import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

describe('Roman numeral chord degrees', () => {
  it('parses the 12/8 blues progression with literal degree labels', () => {
    const input = `12/8| I7 | IV7 | I7 | % |
| IV7 | % | I7 | % |
| V7 | IV7 | I7 | V7 |`;
    const result = new ChordGridParser().parse(input);

    expect(result.errors).toHaveLength(0);
    expect(result.measures).toHaveLength(12);
    expect(result.grid.measures.map(measure => measure.chord)).toEqual([
      'I7', 'IV7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'
    ]);
    expect(result.measures.every(measure => (measure as any).__isChordOnlyMode)).toBe(true);
    expect(result.grid.measures[3].isRepeat).toBe(true);
    expect(result.grid.measures[5].isRepeat).toBe(true);
    expect(result.grid.measures[7].isRepeat).toBe(true);
  });

  it('renders degree labels literally in chord-only measures', () => {
    const result = new ChordGridParser().parse('12/8| I7 | IV7 | V7 |');
    const svg = new SVGRenderer().render(result.grid);

    expect(svg.textContent).toContain('I7');
    expect(svg.textContent).toContain('IV7');
    expect(svg.textContent).toContain('V7');
  });

  it('beams notes across rests within each grouped compound-meter pulse', () => {
    const input = '12/8| I7[8-88 8-88 8-88 8-88] |';
    const result = new ChordGridParser().parse(input);
    const svg = new SVGRenderer().render(result.grid);
    const beamLines = Array.from(svg.querySelectorAll('line')).filter(line =>
      line.getAttribute('stroke-width') === '3' &&
      line.getAttribute('y1') === line.getAttribute('y2') &&
      line.getAttribute('x1') !== line.getAttribute('x2')
    );

    expect(result.errors).toHaveLength(0);
    expect(beamLines).toHaveLength(4);
  });

  it('accepts lowercase degrees, extensions, and secondary degree notation', () => {
    const result = new ChordGridParser().parse('4/4 | ii | iv7 | V7/V | VIImaj7 |');

    expect(result.errors).toHaveLength(0);
    expect(result.measures.map(measure => measure.chord)).toEqual([
      'ii', 'iv7', 'V7/V', 'VIImaj7'
    ]);
    expect(result.measures.every(measure => (measure as any).__isChordOnlyMode)).toBe(true);
  });

  it('recognizes every major and minor degree from one through seven', () => {
    const input = '4/4 | I | II | III | IV | V | VI | VII | i | ii | iii | iv | v | vi | vii |';
    const result = new ChordGridParser().parse(input);

    expect(result.errors).toHaveLength(0);
    expect(result.measures.map(measure => measure.chord)).toEqual([
      'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'
    ]);
  });

  it('leaves Roman degree labels unchanged by pitch transposition', () => {
    const result = new ChordGridParser().parse('transpose:+2\n4/4 | I7 | C |');

    expect(result.measures.map(measure => measure.chordSegments[0].chord)).toEqual(['I7', 'D']);
  });
});
