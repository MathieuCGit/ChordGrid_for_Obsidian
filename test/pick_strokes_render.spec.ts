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
    
    // Cherche des éléments <g> contenant des paths de coups de médiator
    const groups = svg.querySelectorAll('g');
    let foundPickStroke = false;
    groups.forEach(g => {
      const transform = g.getAttribute('transform') || '';
      if (transform.includes('scale') && g.querySelector('path[fill="#000"]')) {
        foundPickStroke = true;
      }
    });
    expect(foundPickStroke).toBe(false);
  });

  it('renders pick strokes with picks-8 option (stems up)', () => {
    const renderer = new SVGRenderer();
    const grid = makeGrid([8, 8, 8, 8]);
    const svg = renderer.render(grid, { stemsDirection: 'up', pickStrokes: '8' });
    
    // Cherche des éléments <g> contenant des paths (coups de médiator)
    const groups = svg.querySelectorAll('g');
    let pickStrokeCount = 0;
    groups.forEach(g => {
      const transform = g.getAttribute('transform') || '';
      const path = g.querySelector('path[fill="#000"]');
      // Un groupe avec transform scale + path noir = symbole de coup
      if (transform.includes('scale') && path) {
        pickStrokeCount++;
      }
    });
    
    // On attend 4 symboles (un par attaque)
    expect(pickStrokeCount).toBe(4);
  });

  it('renders pick strokes with picks-16 option (stems down)', () => {
    const renderer = new SVGRenderer();
    const grid = makeGrid([16, 16, 16, 16, 16, 16, 16, 16]);
    const svg = renderer.render(grid, { stemsDirection: 'down', pickStrokes: '16' });
    
    const groups = svg.querySelectorAll('g');
    let pickStrokeCount = 0;
    groups.forEach(g => {
      const transform = g.getAttribute('transform') || '';
      const path = g.querySelector('path[fill="#000"]');
      if (transform.includes('scale') && path) {
        pickStrokeCount++;
      }
    });
    
    // 8 attaques => 8 symboles
    expect(pickStrokeCount).toBe(8);
  });

  it('auto mode detects 16th notes and uses 16 subdivision', () => {
    const renderer = new SVGRenderer();
    // Mélange: quelques 8e et au moins une 16e
    const grid = makeGrid([8, 8, 16, 16, 8, 8]);
    const svg = renderer.render(grid, { pickStrokes: 'auto' });
    
    const groups = svg.querySelectorAll('g');
    let pickStrokeCount = 0;
    groups.forEach(g => {
      const transform = g.getAttribute('transform') || '';
      const path = g.querySelector('path[fill="#000"]');
      if (transform.includes('scale') && path) {
        pickStrokeCount++;
      }
    });
    
    // 6 attaques => 6 symboles (alternance globale)
    expect(pickStrokeCount).toBe(6);
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
    
    const groups = svg.querySelectorAll('g');
    let pickStrokeCount = 0;
    groups.forEach(g => {
      const transform = g.getAttribute('transform') || '';
      const path = g.querySelector('path[fill="#000"]');
      if (transform.includes('scale') && path) {
        pickStrokeCount++;
      }
    });
    
    // Seulement 2 attaques (première + troisième note); la deuxième a tieEnd
    expect(pickStrokeCount).toBe(2);
  });
});
