import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

describe('Repeat measures with repeat barlines', () => {
  let parser: ChordGridParser;
  let renderer: SVGRenderer;

  beforeEach(() => {
    parser = new ChordGridParser();
    renderer = new SVGRenderer();
  });

  test('Repeat start barline ||: is preserved on repeat measures', () => {
    const input = `4/4 ||: C[4 4 4 4] | % | G[%] | % :||`;
    const result = parser.parse(input);
    
    expect(result.measures).toHaveLength(4);
    
    // First measure should have isRepeatStart
    expect((result.measures[0] as any).isRepeatStart).toBe(true);
    // Note: barline stores the END barline of the measure
    expect(result.measures[0].barline).toBe('|');
    
    // Second measure (%) should have normal barline
    expect(result.measures[1].isRepeat).toBe(true);
    expect(result.measures[1].barline).toBe('|');
    expect((result.measures[1] as any).isRepeatStart).toBeUndefined();
    
    // Third measure (G[%]) should have normal barline
    expect(result.measures[2].isRepeat).toBe(true);
    expect(result.measures[2].barline).toBe('|');
    
    // Fourth measure (%) should have isRepeatEnd
    expect(result.measures[3].isRepeat).toBe(true);
    expect(result.measures[3].barline).toBe(':||');
    expect((result.measures[3] as any).isRepeatEnd).toBe(true);
  });

  test('Repeat barlines render correctly with % notation', () => {
    const input = `4/4 ||: Am[88 4 4 88] | % :||`;
    const result = parser.parse(input);
    
    const svg = renderer.render(result.grid);
    
    // Should have rendered SVG
    expect(svg).toBeDefined();
    expect(svg.tagName).toBe('svg');
    
    // First measure has repeat start
    expect((result.measures[0] as any).isRepeatStart).toBe(true);
    
    // Second measure (%) has repeat end
    expect(result.measures[1].isRepeat).toBe(true);
    expect((result.measures[1] as any).isRepeatEnd).toBe(true);
  });

  test('Multiple repeat sections with % maintain correct barlines', () => {
    const input = `4/4 ||: C[4 4 4 4] | % :|| ||: G[4 4 4 4] | % :||`;
    const result = parser.parse(input);
    
    expect(result.measures).toHaveLength(4);
    
    // First section
    expect((result.measures[0] as any).isRepeatStart).toBe(true);
    // Note: barline stores the END barline of the measure
    expect(result.measures[0].barline).toBe('|');
    
    expect(result.measures[1].isRepeat).toBe(true);
    expect((result.measures[1] as any).isRepeatEnd).toBe(true);
    expect(result.measures[1].barline).toBe(':||');
    
    // Second section
    expect((result.measures[2] as any).isRepeatStart).toBe(true);
    // Note: barline stores the END barline of the measure
    expect(result.measures[2].barline).toBe('|');
    
    expect(result.measures[3].isRepeat).toBe(true);
    expect((result.measures[3] as any).isRepeatEnd).toBe(true);
    expect(result.measures[3].barline).toBe(':||');
  });

  test('Chord[%] notation preserves repeat barlines', () => {
    const input = `4/4 ||: C[4 4 4 4] | D[%] | Em[%] | F[%] :||`;
    const result = parser.parse(input);
    
    expect(result.measures).toHaveLength(4);
    
    // First measure
    expect((result.measures[0] as any).isRepeatStart).toBe(true);
    expect(result.measures[0].chord).toBe('C');
    
    // Middle measures with new chords
    expect(result.measures[1].isRepeat).toBe(true);
    expect(result.measures[1].chord).toBe('D');
    expect(result.measures[1].barline).toBe('|');
    
    expect(result.measures[2].isRepeat).toBe(true);
    expect(result.measures[2].chord).toBe('Em');
    expect(result.measures[2].barline).toBe('|');
    
    // Last measure
    expect(result.measures[3].isRepeat).toBe(true);
    expect(result.measures[3].chord).toBe('F');
    expect((result.measures[3] as any).isRepeatEnd).toBe(true);
    expect(result.measures[3].barline).toBe(':||');
  });
});
