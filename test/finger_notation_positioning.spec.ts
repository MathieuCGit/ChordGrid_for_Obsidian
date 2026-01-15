import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

describe('Finger notation positioning', () => {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  it('reproduces the bug: finger symbols appear above instead of below on measure 2', () => {
    const input = `count finger:fr
4/4
||: Am[4 8x]G[8d_4 4x] | D[1] :||
Am[4 8x]G[8d_4 4x]`;

    const parser = new ChordGridParser();
    const result = parser.parse(input);
    const grid = result.grid;
    
    console.log('\n=== GRID STRUCTURE ===');
    grid.measures.forEach((m, idx) => {
      console.log(`Measure ${idx}: ${m.chordSegments?.length || 0} segments`);
      m.chordSegments?.forEach((seg, sIdx) => {
        console.log(`  Segment ${sIdx}: ${seg.beats.length} beats`);
        seg.beats.forEach((beat, bIdx) => {
          const notes = beat.notes.map(n => {
            const finger = n.fingerSymbol ? ` finger:${n.fingerSymbol}` : '';
            return `${n.value}${finger}`;
          }).join(', ');
          console.log(`    Beat ${bIdx}: ${notes}`);
        });
      });
    });

    // Render the grid
    const renderer = new SVGRenderer();
    const svgElement = renderer.render(grid, {
      fingerMode: 'fr',
      countingMode: true,
      zoomPercent: 100
    });

    // Find all finger notation text elements
    const fingerTexts = Array.from(svgElement.querySelectorAll('[data-finger-symbol]'));
    
    // Find all note circles to compare positions
    const noteCircles = Array.from(svgElement.querySelectorAll('circle[r]'));
    
    console.log('\n=== FINGER SYMBOLS ===');
    console.log(`Total finger symbols: ${fingerTexts.length}`);
    console.log(`Total notes: ${noteCircles.length}`);
    
    // Group finger symbols by approximate X position to identify which note they belong to
    const fingersByX = new Map<string, any[]>();
    fingerTexts.forEach((text: any) => {
      const x = parseFloat(text.getAttribute('x'));
      const y = parseFloat(text.getAttribute('y'));
      const xKey = x.toFixed(0);
      if (!fingersByX.has(xKey)) {
        fingersByX.set(xKey, []);
      }
      fingersByX.get(xKey)!.push({
        x,
        y,
        content: text.textContent,
        type: text.getAttribute('data-finger-symbol')
      });
    });

    // Log finger groups
    let groupIdx = 0;
    fingersByX.forEach((group, xKey) => {
      const yValues = group.map(g => g.y.toFixed(0)).join(', ');
      const content = group.map(g => g.content).join(' ');
      console.log(`Group ${groupIdx++} (x≈${xKey}): "${content}" at y=[${yValues}]`);
    });

    expect(fingerTexts.length).toBeGreaterThan(0);
    expect(noteCircles.length).toBeGreaterThan(0);
  });
});
