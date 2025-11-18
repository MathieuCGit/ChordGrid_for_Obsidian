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
        groupingMode: 'auto',
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
    // Cherche une ligne SVG de hampe orientée vers le haut (y2 < y1 car y diminue vers le haut)
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
    // Cherche une ligne SVG de hampe orientée vers le bas (y2 > y1 car y augmente vers le bas)
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
