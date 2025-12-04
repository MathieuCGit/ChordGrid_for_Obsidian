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
    // Timeline with 16th note subdivision: 
    // - Eighth note occupies 2 slots (positions 0,1 with alternating down/up pattern)
    // - First 16th note is at position 2 (down stroke)
    // - Second 16th note is at position 3 (up stroke)
    const grid = makeGridWithNotes([
      { value: 8, isRest: false },   // occupies positions 0,1 (down, up) - displays down
      { value: 16, isRest: false },  // position 2 (down) - displays down
      { value: 16, isRest: false }   // position 3 (up) - displays up
    ]);
    
    const svg = new SVGRenderer().render(grid, { pickStrokes: '16' });
    
    // Extract pick stroke paths and their transform attribute to determine stroke direction
    const groups = svg.querySelectorAll('g');
    const pickPaths: string[] = [];
    groups.forEach(g => {
      const transform = g.getAttribute('transform') || '';
      const path = g.querySelector('path[fill="#000"]');
      if (transform.includes('scale') && path) {
        const d = path.getAttribute('d') || '';
        // Downstroke path contains "m 99,44"
        // Upstroke path contains "M 125.6,4.1"
        if (d.includes('m 99,44') || d.includes('99,44')) {
          pickPaths.push('down');
        } else if (d.includes('M 125.6,4.1') || d.includes('125.6,4.1')) {
          pickPaths.push('up');
        }
      }
    });
    
    // Expect 3 symbols: down (8th), down (16th), up (16th)
    expect(pickPaths.length).toBe(3);
    expect(pickPaths[0]).toBe('down'); // first 8th note
    expect(pickPaths[1]).toBe('down'); // first 16th note (position 2 on timeline)
    expect(pickPaths[2]).toBe('up');   // second 16th note (position 3)
  });

  it('skips displaying symbol on rest but counts it in timeline: [8-rest 16 16]', () => {
    // Timeline with 16th note subdivision:
    // - 8th rest occupies 2 slots (positions 0,1) but displays NO symbol
    // - First 16th note is at position 2 (down stroke)
    // - Second 16th note is at position 3 (up stroke)
    const grid = makeGridWithNotes([
      { value: 8, isRest: true },    // occupies positions 0,1 - NOT displayed
      { value: 16, isRest: false },  // position 2 (down) - displays down
      { value: 16, isRest: false }   // position 3 (up) - displays up
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
    
    // Expect 2 symbols (no symbol displayed on rest)
    expect(pickPaths.length).toBe(2);
    expect(pickPaths[0]).toBe('down'); // first 16th note (timeline position 2)
    expect(pickPaths[1]).toBe('up');   // second 16th note (position 3)
  });

  it('handles quarter note occupying 4 subdivisions in 16 mode: [4 16 16 16 16]', () => {
    // Timeline with 16th note subdivision:
    // - Quarter note occupies 4 slots (positions 0-3 with alternating down/up/down/up)
    // - The 4 sixteenth notes follow: position 4 (down), 5 (up), 6 (down), 7 (up)
    const grid = makeGridWithNotes([
      { value: 4, isRest: false },   // positions 0-3 (down, up, down, up) - displays down
      { value: 16, isRest: false },  // position 4 (down) - displays down
      { value: 16, isRest: false },  // position 5 (up) - displays up
      { value: 16, isRest: false },  // position 6 (down) - displays down
      { value: 16, isRest: false }   // position 7 (up) - displays up
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
    
    // Expect 5 symbols: down (quarter), down (16th), up (16th), down (16th), up (16th)
    expect(pickPaths.length).toBe(5);
    expect(pickPaths[0]).toBe('down'); // quarter note (position 0)
    expect(pickPaths[1]).toBe('down'); // first 16th (position 4)
    expect(pickPaths[2]).toBe('up');   // second 16th (position 5)
    expect(pickPaths[3]).toBe('down'); // third 16th (position 6)
    expect(pickPaths[4]).toBe('up');   // fourth 16th (position 7)
  });

  it('eighth subdivision with mixed values: [8 4 8]', () => {
    // Timeline with 8th note subdivision:
    // - 8th note occupies 1 slot, quarter note occupies 2 slots
    // - Sequence: down (8th pos 0), up (quarter pos 1), down (continuation pos 2), up (8th pos 3)
    const grid = makeGridWithNotes([
      { value: 8, isRest: false },   // position 0 (down)
      { value: 4, isRest: false },   // positions 1-2 (up, down) - displays up
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
