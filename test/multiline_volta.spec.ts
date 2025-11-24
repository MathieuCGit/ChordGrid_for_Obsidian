/**
 * @file multiline_volta.spec.ts
 * @description Tests for multi-line volta brackets
 * 
 * Musical context: Voltas (first/second endings) can span multiple lines
 * when the repeated section is long. The bracket should continue across
 * line breaks with proper hook rendering:
 * - Left hook only on first line
 * - Right hook only on last line (if closed)
 * - Text only on first line
 */

import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

describe('Multi-line Volta Brackets', () => {

  test('Volta spanning 2 lines with closed ending', () => {
    const input = `4/4 ||: C[4 4 4 4] | G[4 4 4 4] | Am[4 4 4 4] | F[4 4 4 4] |.1,2,3 C[4 4 4 4] | G[4 4 4 4] | Am[4 4 4 4] | F[4 4 4 4] :||.4 C[4 4 4 4] | G[4 4 4 4] ||`;

    const parser = new ChordGridParser();
    const result = parser.parse(input);
    
    expect(result.errors).toHaveLength(0);
    expect(result.grid.measures).toHaveLength(10);

    // Verify first volta starts on measure 4 (after first 4 measures)
    const firstVoltaStart = result.grid.measures[4];
    expect(firstVoltaStart.voltaStart).toBeDefined();
    expect(firstVoltaStart.voltaStart?.text).toBe('1,2,3');
    expect(firstVoltaStart.voltaStart?.isClosed).toBe(true);

    // Verify second volta starts on measure 8
    const secondVolta = result.grid.measures[8];
    expect(secondVolta.voltaStart).toBeDefined();
    expect(secondVolta.voltaStart?.text).toBe('4');
    expect(secondVolta.voltaStart?.isClosed).toBe(false);

    const renderer = new SVGRenderer();
    const svg = renderer.render(result.grid);
    
    expect(svg).toBeDefined();
    expect(svg.tagName).toBe('svg');
  });

  test('Volta spanning 3 lines', () => {
    const input = `4/4 ||: C[4 4 4 4] | G[4 4 4 4] | Am[4 4 4 4] | F[4 4 4 4] |.1 C[4 4 4 4] | G[4 4 4 4] | Am[4 4 4 4] | F[4 4 4 4] | C[4 4 4 4] | G[4 4 4 4] | Am[4 4 4 4] | F[4 4 4 4] :||.2 C[4 4 4 4] ||`;

    const parser = new ChordGridParser();
    const result = parser.parse(input);
    
    expect(result.errors).toHaveLength(0);
    expect(result.grid.measures).toHaveLength(13);

    // Check that first volta spans measures 4-11 (8 measures across 2 lines)
    const firstVoltaStart = result.grid.measures[4];
    const firstVoltaEnd = result.grid.measures[11];
    
    expect(firstVoltaStart.voltaStart).toBeDefined();
    expect(firstVoltaStart.voltaStart?.text).toBe('1');
    expect(firstVoltaEnd.voltaEnd).toBeDefined();
    expect(firstVoltaEnd.voltaEnd?.text).toBe('1');

    const renderer = new SVGRenderer();
    const svg = renderer.render(result.grid);
    
    expect(svg).toBeDefined();
    expect(svg.tagName).toBe('svg');
  });

  test('Single-line volta (regression test)', () => {
    const input = `4/4 ||: C[4 4 4 4] |.1,2 G[4 4 4 4] :||.3 C[4 4 4 4] ||`;

    const parser = new ChordGridParser();
    const result = parser.parse(input);
    
    expect(result.errors).toHaveLength(0);
    expect(result.grid.measures).toHaveLength(3);

    // First volta: measure 1
    const firstVolta = result.grid.measures[1];
    expect(firstVolta.voltaStart).toBeDefined();
    expect(firstVolta.voltaStart?.text).toBe('1,2');
    expect(firstVolta.voltaStart?.isClosed).toBe(true);
    expect(firstVolta.voltaEnd).toBeDefined();

    // Second volta: measure 2
    const secondVolta = result.grid.measures[2];
    expect(secondVolta.voltaStart).toBeDefined();
    expect(secondVolta.voltaStart?.text).toBe('3');
    expect(secondVolta.voltaStart?.isClosed).toBe(false);
    expect(secondVolta.voltaEnd).toBeDefined();

    const renderer = new SVGRenderer();
    const svg = renderer.render(result.grid);
    
    expect(svg).toBeDefined();
    expect(svg.tagName).toBe('svg');
  });

  test('Volta with forced line break', () => {
    const input = `4/4 ||: C[4 4 4 4] | G[4 4 4 4] | Am[4 4 4 4] | F[4 4 4 4]
|.1 C[4 4 4 4] | G[4 4 4 4] :||.2 Am[4 4 4 4] ||`;

    const parser = new ChordGridParser();
    const result = parser.parse(input);
    
    expect(result.errors).toHaveLength(0);
    
    // Verify line breaks are set correctly
    const measuresWithBreaks = result.grid.measures.filter((m: any) => m.isLineBreak);
    expect(measuresWithBreaks.length).toBeGreaterThan(0);

    const renderer = new SVGRenderer();
    const svg = renderer.render(result.grid);
    
    expect(svg).toBeDefined();
    expect(svg.tagName).toBe('svg');
  });

  test('Multiple voltas in same grid', () => {
    const input = `4/4 ||: C[4 4 4 4] |.1,2 G[4 4 4 4] :||.3 Am[4 4 4 4] || ||: C[4 4 4 4] |.1 G[4 4 4 4] :||.2 Am[4 4 4 4] ||`;

    const parser = new ChordGridParser();
    const result = parser.parse(input);
    
    expect(result.errors).toHaveLength(0);
    expect(result.grid.measures).toHaveLength(6);

    // Count volta starts
    const voltaStarts = result.grid.measures.filter(m => m.voltaStart);
    expect(voltaStarts.length).toBe(4); // 4 voltas total (1,2 | 3 | 1 | 2)

    const renderer = new SVGRenderer();
    const svg = renderer.render(result.grid);
    
    expect(svg).toBeDefined();
    expect(svg.tagName).toBe('svg');
  });

  test('Volta with measures-per-line option', () => {
    const input = `4/4 ||: C[4 4 4 4] | G[4 4 4 4] | Am[4 4 4 4] | F[4 4 4 4] |.1 C[4 4 4 4] | G[4 4 4 4] | Am[4 4 4 4] | F[4 4 4 4] :||.2 C[4 4 4 4] ||`;

    const parser = new ChordGridParser();
    const result = parser.parse(input);
    
    expect(result.errors).toHaveLength(0);

    const renderer = new SVGRenderer();
    // Force 2 measures per line to ensure multi-line volta
    const svg = renderer.render(result.grid, { measuresPerLine: 2 });
    
    expect(svg).toBeDefined();
    expect(svg.tagName).toBe('svg');
  });

  test('Volta bracket hooks - visual structure', () => {
    const input = `4/4 ||: C[4 4 4 4] | G[4 4 4 4] | Am[4 4 4 4] | F[4 4 4 4] |.1,2 C[4 4 4 4] | G[4 4 4 4] | Am[4 4 4 4] | F[4 4 4 4] :||.3 C[4 4 4 4] ||`;

    const parser = new ChordGridParser();
    const result = parser.parse(input);
    
    const renderer = new SVGRenderer();
    const svg = renderer.render(result.grid);

    expect(svg).toBeDefined();
    expect(svg.tagName).toBe('svg');
    
    // Verify volta brackets are rendered (at least horizontal lines)
    expect(svg.outerHTML).toContain('line');
  });

  test('Open volta continuation (no right hook)', () => {
    const input = `4/4 ||: C[4 4 4 4] | G[4 4 4 4] | Am[4 4 4 4] | F[4 4 4 4] |.1,2 C[4 4 4 4] | G[4 4 4 4] | Am[4 4 4 4] | F[4 4 4 4] :||.3 C[4 4 4 4] ||`;

    const parser = new ChordGridParser();
    const result = parser.parse(input);
    
    // Verify volta 3 is open (continues)
    const volta3 = result.grid.measures.find(m => m.voltaStart?.text === '3');
    expect(volta3).toBeDefined();
    expect(volta3!.voltaStart?.isClosed).toBe(false);

    const renderer = new SVGRenderer();
    const svg = renderer.render(result.grid);
    
    expect(svg).toBeDefined();
    expect(svg.tagName).toBe('svg');
  });
});
