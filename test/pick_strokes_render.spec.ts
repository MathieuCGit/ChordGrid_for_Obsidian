import { SVGRenderer } from '../src/renderer/SVGRenderer';
import { ChordGrid, BarlineType } from '../src/parser/type';

describe('Pick strokes rendering', () => {
  function makeGrid(noteValues: number[], stemsDir: 'up' | 'down' = 'up'): ChordGrid {
    const notes = noteValues.map(v => ({
      value: v as any,
      dotted: false,
      isRest: false,
      tieStart: false,
      tieEnd: false,
      tieToVoid: false,
      tieFromVoid: false
    }));
    
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
          beats: [{ notes, hasBeam: false, beamGroups: [] }],
          chord: 'C',
          barline: BarlineType.Single,
          isLineBreak: false,
          chordSegments: [{
            chord: 'C',
            beats: [{ notes, hasBeam: false, beamGroups: [] }]
          }],
        }
      ],
      lines: []
    };
  }

  it('renders no pick strokes by default (no option)', () => {
    const renderer = new SVGRenderer();
    const grid = makeGrid([8, 8, 8, 8]);
    const svg = renderer.render(grid);
    
    // Look for <g> elements with data-pick-stroke attribute (identifies pick stroke symbols)
    const pickStrokes = svg.querySelectorAll('g[data-pick-stroke="true"]');
    expect(pickStrokes.length).toBe(0);
  });

  it('renders pick strokes with picks-8 option (stems up)', () => {
    const renderer = new SVGRenderer();
    const grid = makeGrid([8, 8, 8, 8]);
    const svg = renderer.render(grid, { stemsDirection: 'up', pickStrokes: '8' });
    
    // Look for <g> elements with data-pick-stroke="true"
    // Each attack point should have a pick stroke symbol
    const pickStrokes = svg.querySelectorAll('g[data-pick-stroke="true"]');
    
    // Expect 4 symbols (one per attack)
    expect(pickStrokes.length).toBe(4);
  });

  it('renders pick strokes with picks-16 option (stems down)', () => {
    const renderer = new SVGRenderer();
    const grid = makeGrid([16, 16, 16, 16, 16, 16, 16, 16]);
    const svg = renderer.render(grid, { stemsDirection: 'down', pickStrokes: '16' });
    
    // Look for <g> elements with data-pick-stroke="true"
    const pickStrokes = svg.querySelectorAll('g[data-pick-stroke="true"]');
    
    // 8 attacks => 8 symbols
    expect(pickStrokes.length).toBe(8);
  });

  it('auto mode detects 16th notes and uses 16 subdivision', () => {
    const renderer = new SVGRenderer();
    // Mix of 8th and 16th notes
    const grid = makeGrid([8, 8, 16, 16, 8, 8]);
    const svg = renderer.render(grid, { pickStrokes: 'auto' });
    
    // Look for <g> elements with data-pick-stroke="true"
    const pickStrokes = svg.querySelectorAll('g[data-pick-stroke="true"]');
    
    // 6 attacks => 6 symbols (global alternating pattern)
    expect(pickStrokes.length).toBe(6);
  });

  it('does not render on tied note endings (tieEnd)', () => {
    const renderer = new SVGRenderer();
    const notes = [
      { value: 8 as any, dotted: false, isRest: false, tieStart: true, tieEnd: false, tieToVoid: false, tieFromVoid: false },
      { value: 8 as any, dotted: false, isRest: false, tieStart: false, tieEnd: true, tieToVoid: false, tieFromVoid: false },
      { value: 8 as any, dotted: false, isRest: false, tieStart: false, tieEnd: false, tieToVoid: false, tieFromVoid: false },
    ];
    
    const grid: ChordGrid = {
      timeSignature: {
        numerator: 4,
        denominator: 4,
        beatsPerMeasure: 4,
        beatUnit: 4,
        groupingMode: 'auto',
      },
      measures: [
        {
          beats: [{ notes, hasBeam: false, beamGroups: [] }],
          chord: 'C',
          barline: BarlineType.Single,
          isLineBreak: false,
          chordSegments: [{
            chord: 'C',
            beats: [{ notes, hasBeam: false, beamGroups: [] }]
          }],
        }
      ],
      lines: []
    };
    
    const svg = renderer.render(grid, { pickStrokes: '8' });
    
    // Look for <g> elements with data-pick-stroke="true"
    const pickStrokes = svg.querySelectorAll('g[data-pick-stroke="true"]');
    
    // Only 2 attacks (first + third note); the second note has tieEnd so it's not an attack point
    expect(pickStrokes.length).toBe(2);
  });
});
