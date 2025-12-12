import { SVGRenderer } from '../src/renderer/SVGRenderer';
import { ChordGrid, BarlineType } from '../src/parser/type';

describe('SVGRenderer responsive SVG', () => {
  function makeGrid(): ChordGrid {
    return {
      timeSignature: {
        numerator: 4,
        denominator: 4,
        beatsPerMeasure: 4,
        beatUnit: 4,
        groupingMode: 'space-based',
      },
      measures: [
        {
          beats: [
            { notes: [
              { value: 4, dotted: false, isRest: false, tieStart: false, tieEnd: false, tieToVoid: false, tieFromVoid: false }
            ], hasBeam: false, beamGroups: [] }
          ],
          chord: 'C',
    barline: BarlineType.Single,
          isLineBreak: false,
          chordSegments: [{ chord: 'C', beats: [
            { notes: [
              { value: 4, dotted: false, isRest: false, tieStart: false, tieEnd: false, tieToVoid: false, tieFromVoid: false }
            ], hasBeam: false, beamGroups: [] }
          ] }],
        }
      ],
      lines: []
    };
  }

  it('sets SVG width to 100% and no fixed height (auto-sizing via viewBox)', () => {
    const renderer = new SVGRenderer();
    const grid = makeGrid();
    const svg = renderer.render(grid);
    expect(svg.getAttribute('width')).toBe('100%');
    // Height attribute should not be set - CSS controls it via viewBox
    expect(svg.getAttribute('height')).toBeNull();
    // viewBox is now dynamically adjusted based on content bounds
    expect(svg.getAttribute('viewBox')).toMatch(/^[\d.-]+ [\d.-]+ [\d.]+ [\d.]+$/);
  });

  it('background rect matches viewBox dimensions', () => {
    const renderer = new SVGRenderer();
    const grid = makeGrid();
    const svg = renderer.render(grid);
    const viewBox = svg.getAttribute('viewBox');
    expect(viewBox).toBeTruthy();
    const [x, y, w, h] = viewBox!.split(' ').map(Number);
    const bg = svg.querySelector('rect');
    expect(bg).toBeTruthy();
    expect(bg!.getAttribute('width')).toBe(String(w));
    expect(bg!.getAttribute('height')).toBe(String(h));
  });
});
