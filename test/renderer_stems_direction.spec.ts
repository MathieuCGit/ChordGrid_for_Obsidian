import { SVGRenderer } from '../src/renderer/SVGRenderer';
import { ChordGrid, BarlineType } from '../src/parser/type';

describe('SVGRenderer stems direction', () => {
  function makeGrid(stemsDirection?: 'up' | 'down'): ChordGrid {
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

  it('renders stems up by default', () => {
    const renderer = new SVGRenderer();
    const grid = makeGrid();
    const svg = renderer.render(grid);
    // Look for an SVG line element representing a stem pointing upward
    // In SVG coordinates, y decreases upward, so y2 < y1 means stem points up
    const stems = svg.querySelectorAll('line');
    let foundUp = false;
    stems.forEach(line => {
      const y1 = parseFloat(line.getAttribute('y1') || '0');
      const y2 = parseFloat(line.getAttribute('y2') || '0');
      if (y2 < y1) foundUp = true;
    });
    expect(foundUp).toBe(true);
  });

  it('renders stems down when stemsDirection is "down"', () => {
    const renderer = new SVGRenderer();
    const grid = makeGrid();
    const svg = renderer.render(grid, 'down');
    // Look for an SVG line element representing a stem pointing downward
    // In SVG coordinates, y increases downward, so y2 > y1 means stem points down
    const stems = svg.querySelectorAll('line');
    let foundDown = false;
    stems.forEach(line => {
      const y1 = parseFloat(line.getAttribute('y1') || '0');
      const y2 = parseFloat(line.getAttribute('y2') || '0');
      if (y2 > y1) foundDown = true;
    });
    expect(foundDown).toBe(true);
  });
});
