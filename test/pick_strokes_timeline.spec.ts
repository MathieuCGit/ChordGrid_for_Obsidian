import { SVGRenderer, RenderOptions } from '../src/renderer/SVGRenderer';
import { ChordGrid, BarlineType } from '../src/parser/type';

describe('Pick strokes timeline logic with rests and mixed values', () => {
  function makeGridWithNotes(notes: Array<{ value: number; isRest?: boolean; tieEnd?: boolean }>): ChordGrid {
    const noteElements = notes.map(n => ({
      value: n.value as any,
      dotted: false,
      isRest: n.isRest || false,
      tieStart: false,
      tieEnd: n.tieEnd || false,
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
          beats: [{ notes: noteElements, hasBeam: false, beamGroups: [] }],
          chord: 'C',
          barline: BarlineType.Single,
          isLineBreak: false,
          chordSegments: [{
            chord: 'C',
            beats: [{ notes: noteElements, hasBeam: false, beamGroups: [] }]
          }],
        }
      ],
      lines: []
    };
  }

  it('counts rests in timeline: [8 16 16] with 16 subdivision', () => {
    // Timeline en 16: 8 occupe 2 slots (down, up), premier 16 = down, dernier 16 = up
    const grid = makeGridWithNotes([
      { value: 8, isRest: false },   // occupe positions 0,1 (down, up) - affiché down
      { value: 16, isRest: false },  // position 2 (down) - affiché down
      { value: 16, isRest: false }   // position 3 (up) - affiché up
    ]);
    
    const svg = new SVGRenderer().render(grid, { pickStrokes: '16' });
    
    // Extraire les paths de coups et leur attribut transform pour déduire le type
    const groups = svg.querySelectorAll('g');
    const pickPaths: string[] = [];
    groups.forEach(g => {
      const transform = g.getAttribute('transform') || '';
      const path = g.querySelector('path[fill="#000"]');
      if (transform.includes('scale') && path) {
        const d = path.getAttribute('d') || '';
        // Downbow path contient "m 99,44"
        // Upbow path contient "M 125.6,4.1"
        if (d.includes('m 99,44') || d.includes('99,44')) {
          pickPaths.push('down');
        } else if (d.includes('M 125.6,4.1') || d.includes('125.6,4.1')) {
          pickPaths.push('up');
        }
      }
    });
    
    // On attend 3 symboles: down (8), down (16), up (16)
    expect(pickPaths.length).toBe(3);
    expect(pickPaths[0]).toBe('down'); // premier 8
    expect(pickPaths[1]).toBe('down'); // premier 16 (position 2 sur la timeline)
    expect(pickPaths[2]).toBe('up');   // dernier 16 (position 3)
  });

  it('skips displaying symbol on rest but counts it in timeline: [8-rest 16 16]', () => {
    // Timeline en 16: 8-rest occupe 2 slots (down, up) mais pas de symbole
    // premier 16 = position 2 (down), dernier 16 = position 3 (up)
    const grid = makeGridWithNotes([
      { value: 8, isRest: true },    // occupe positions 0,1 - PAS affiché
      { value: 16, isRest: false },  // position 2 (down) - affiché down
      { value: 16, isRest: false }   // position 3 (up) - affiché up
    ]);
    
    const svg = new SVGRenderer().render(grid, { pickStrokes: '16' });
    
    const groups = svg.querySelectorAll('g');
    const pickPaths: string[] = [];
    groups.forEach(g => {
      const transform = g.getAttribute('transform') || '';
      const path = g.querySelector('path[fill="#000"]');
      if (transform.includes('scale') && path) {
        const d = path.getAttribute('d') || '';
        if (d.includes('m 99,44') || d.includes('99,44')) {
          pickPaths.push('down');
        } else if (d.includes('M 125.6,4.1') || d.includes('125.6,4.1')) {
          pickPaths.push('up');
        }
      }
    });
    
    // On attend 2 symboles (pas de symbole sur le silence)
    expect(pickPaths.length).toBe(2);
    expect(pickPaths[0]).toBe('down'); // premier 16 (position 2 timeline)
    expect(pickPaths[1]).toBe('up');   // dernier 16 (position 3)
  });

  it('handles quarter note occupying 4 subdivisions in 16 mode: [4 16 16 16 16]', () => {
    // Timeline en 16: 4 occupe 4 slots (down, up, down, up)
    // Les 4 seizièmes suivent: position 4 (down), 5 (up), 6 (down), 7 (up)
    const grid = makeGridWithNotes([
      { value: 4, isRest: false },   // positions 0-3 (down, up, down, up) - affiché down
      { value: 16, isRest: false },  // position 4 (down) - affiché down
      { value: 16, isRest: false },  // position 5 (up) - affiché up
      { value: 16, isRest: false },  // position 6 (down) - affiché down
      { value: 16, isRest: false }   // position 7 (up) - affiché up
    ]);
    
    const svg = new SVGRenderer().render(grid, { pickStrokes: '16' });
    
    const groups = svg.querySelectorAll('g');
    const pickPaths: string[] = [];
    groups.forEach(g => {
      const transform = g.getAttribute('transform') || '';
      const path = g.querySelector('path[fill="#000"]');
      if (transform.includes('scale') && path) {
        const d = path.getAttribute('d') || '';
        if (d.includes('m 99,44') || d.includes('99,44')) {
          pickPaths.push('down');
        } else if (d.includes('M 125.6,4.1') || d.includes('125.6,4.1')) {
          pickPaths.push('up');
        }
      }
    });
    
    // 5 symboles: down (4), down (16), up (16), down (16), up (16)
    expect(pickPaths.length).toBe(5);
    expect(pickPaths[0]).toBe('down'); // noire (position 0)
    expect(pickPaths[1]).toBe('down'); // premier 16 (position 4)
    expect(pickPaths[2]).toBe('up');   // deuxième 16 (position 5)
    expect(pickPaths[3]).toBe('down'); // troisième 16 (position 6)
    expect(pickPaths[4]).toBe('up');   // quatrième 16 (position 7)
  });

  it('eighth subdivision with mixed values: [8 4 8]', () => {
    // Timeline en 8: 8 occupe 1 slot, 4 occupe 2 slots
    // Séquence: down (8 pos 0), up (4 pos 1), down (suite 4 pos 2), up (8 pos 3)
    const grid = makeGridWithNotes([
      { value: 8, isRest: false },   // position 0 (down)
      { value: 4, isRest: false },   // positions 1-2 (up, down) - affiché up
      { value: 8, isRest: false }    // position 3 (up)
    ]);
    
    const svg = new SVGRenderer().render(grid, { pickStrokes: '8' });
    
    const groups = svg.querySelectorAll('g');
    const pickPaths: string[] = [];
    groups.forEach(g => {
      const transform = g.getAttribute('transform') || '';
      const path = g.querySelector('path[fill="#000"]');
      if (transform.includes('scale') && path) {
        const d = path.getAttribute('d') || '';
        if (d.includes('m 99,44') || d.includes('99,44')) {
          pickPaths.push('down');
        } else if (d.includes('M 125.6,4.1') || d.includes('125.6,4.1')) {
          pickPaths.push('up');
        }
      }
    });
    
    // 3 symboles: down (8), up (4 pos 1), up (8 pos 3)
    expect(pickPaths.length).toBe(3);
    expect(pickPaths[0]).toBe('down'); // premier 8 (pos 0)
    expect(pickPaths[1]).toBe('up');   // noire (pos 1)
    expect(pickPaths[2]).toBe('up');   // dernier 8 (pos 3)
  });
});
