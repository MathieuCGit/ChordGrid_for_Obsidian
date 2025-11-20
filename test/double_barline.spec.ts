import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

describe('Double barline (||)', () => {
  let parser: ChordGridParser;
  let renderer: SVGRenderer;

  beforeEach(() => {
    parser = new ChordGridParser();
    renderer = new SVGRenderer();
  });

  test('Double barline || is parsed correctly', () => {
    const input = `4/4 | C[8888 _8888] | G[%] | F[1616 1616 88 88 4] | % ||`;
    const result = parser.parse(input);
    
    expect(result.measures).toHaveLength(4);
    
    // Last measure should have double barline
    expect(result.measures[3].barline).toBe('||');
    expect(result.measures[3].isRepeat).toBe(true);
  });

  test('Double barline renders as double bar in SVG', () => {
    const input = `4/4 | C[4 4 4 4] | D[4 4 4 4] ||`;
    const result = parser.parse(input);
    
    const svg = renderer.render(result.grid);
    
    // Check that SVG contains double bar elements (two lines close together)
    const lines = svg.querySelectorAll('line');
    
    // Find pairs of lines that are close together (double bar pattern)
    let foundDoubleBar = false;
    for (let i = 0; i < lines.length - 1; i++) {
      const line1 = lines[i];
      const line2 = lines[i + 1];
      
      const x1 = parseFloat(line1.getAttribute('x1') || '0');
      const x2 = parseFloat(line2.getAttribute('x1') || '0');
      
      // Final double bar: thin line (1.5px) + thick line (5px) spaced 6px apart
      if (Math.abs(x2 - x1) === 6) {
        // Check if they're at the same y positions (vertical lines)
        const y1Start = parseFloat(line1.getAttribute('y1') || '0');
        const y2Start = parseFloat(line2.getAttribute('y1') || '0');
        
        // Also check stroke widths: first should be thin (1.5), second thick (5)
        const w1 = parseFloat(line1.getAttribute('stroke-width') || '0');
        const w2 = parseFloat(line2.getAttribute('stroke-width') || '0');
        
        if (y1Start === y2Start && w1 === 1.5 && w2 === 5) {
          foundDoubleBar = true;
          break;
        }
      }
    }
    
    expect(foundDoubleBar).toBe(true);
  });

  test('Double barline combined with repeat measures', () => {
    const input = `4/4 | C[4 4 4 4] | % | G[%] | % ||`;
    const result = parser.parse(input);
    
    expect(result.measures).toHaveLength(4);
    expect(result.measures[0].chord).toBe('C');
    expect(result.measures[1].isRepeat).toBe(true);
    expect(result.measures[2].isRepeat).toBe(true);
    expect(result.measures[2].chord).toBe('G');
    expect(result.measures[3].isRepeat).toBe(true);
    expect(result.measures[3].barline).toBe('||');
  });
});
