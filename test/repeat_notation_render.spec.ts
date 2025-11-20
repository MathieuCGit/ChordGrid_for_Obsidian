import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

describe('Repeat notation (%) - Visual rendering', () => {
  let parser: ChordGridParser;
  let renderer: SVGRenderer;

  beforeEach(() => {
    parser = new ChordGridParser();
    renderer = new SVGRenderer();
  });

  test('% notation renders correctly', () => {
    const input = `4/4 | C[4 88_4 4] | % | G[%] | % |`;
    const result = parser.parse(input);
    const svg = renderer.render(result.grid);

    // Should generate valid SVG
    expect(svg).toBeDefined();
    expect(svg.tagName).toBe('svg');

    // Should have 4 measures in the parsed result
    expect(result.measures).toHaveLength(4);

    // Check that chord labels are rendered (should have C and G text elements)
    const chordTexts = Array.from(svg.querySelectorAll('text')).filter(t => 
      t.textContent === 'C' || t.textContent === 'G'
    );
    expect(chordTexts.length).toBeGreaterThan(0);
  });

  test('Repeated measures render identically to original', () => {
    const input1 = `4/4 | C[4 4 4 4] | C[4 4 4 4] |`;
    const input2 = `4/4 | C[4 4 4 4] | % |`;
    
    const result1 = parser.parse(input1);
    const result2 = parser.parse(input2);
    
    const svg1 = renderer.render(result1.grid);
    const svg2 = renderer.render(result2.grid);

    // Both should produce SVG
    expect(svg1).toBeDefined();
    expect(svg2).toBeDefined();

    // Measure structures should be identical
    expect(result1.measures[0].beats.length).toBe(result2.measures[0].beats.length);
    expect(result1.measures[1].beats.length).toBe(result2.measures[1].beats.length);
    
    // Note counts should match
    const notes1 = result1.measures[1].beats.flatMap(b => b.notes);
    const notes2 = result2.measures[1].beats.flatMap(b => b.notes);
    expect(notes1.length).toBe(notes2.length);
    
    // Note values should match
    notes1.forEach((note, i) => {
      expect(note.value).toBe(notes2[i].value);
    });
  });
});
