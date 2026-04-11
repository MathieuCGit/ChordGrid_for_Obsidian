import { ChordGridParser } from '../src/parser/ChordGridParser';

declare const describe: any;
declare const it: any;
declare const expect: any;

describe('Directive aliases - mpl (measure-per-line)', () => {
  let parser: ChordGridParser;

  beforeEach(() => {
    parser = new ChordGridParser();
  });

  it('should accept "mpl:4" as alias for "measure-per-line:4"', () => {
    // Parse with mpl alias
    const resultMpl = parser.parse('mpl:4\n4/4 | C[4 4 4 4] | D[4 4 4 4] | E[4 4 4 4] | F[4 4 4 4] | G[4 4 4 4] | A[4 4 4 4] |');

    // Parse with full form
    const resultFull = parser.parse('measure-per-line:4\n4/4 | C[4 4 4 4] | D[4 4 4 4] | E[4 4 4 4] | F[4 4 4 4] | G[4 4 4 4] | A[4 4 4 4] |');

    // Both should produce the same number of measures
    expect(resultMpl.grid.measures.length).toBe(resultFull.grid.measures.length);
    expect(resultMpl.grid.measures.length).toBe(6);

    // Both should set the same measuresPerLine value
    expect(resultMpl.measuresPerLine).toBe(resultFull.measuresPerLine);
    expect(resultMpl.measuresPerLine).toBe(4);
  });

  it('should accept "measure-per-line:3" as full form', () => {
    const result = parser.parse('measure-per-line:3\n4/4 | C[4 4 4 4] | D[4 4 4 4] | E[4 4 4 4] | F[4 4 4 4] | G[4 4 4 4] |');

    expect(result.errors).toHaveLength(0);
    expect(result.grid.measures.length).toBe(5);
    expect(result.measuresPerLine).toBe(3);
  });

  it('should accept "measures-per-line:2" (plural form)', () => {
    const result = parser.parse('measures-per-line:2\n4/4 | C[4 4 4 4] | D[4 4 4 4] | E[4 4 4 4] | F[4 4 4 4] |');

    expect(result.errors).toHaveLength(0);
    expect(result.grid.measures.length).toBe(4);
    expect(result.measuresPerLine).toBe(2);
  });

  it('mpl alias should work with other directives', () => {
    // Combine mpl alias with other directives
    const result = parser.parse('zoom:50%\nmpl:4\n4/4 | C[4 4 4 4] | D[4 4 4 4] | E[4 4 4 4] | F[4 4 4 4] | G[4 4 4 4] |');

    // Should have both zoom and mpl applied
    expect(result.errors).toHaveLength(0);
    expect(result.zoomPercent).toBe(50);
    expect(result.measuresPerLine).toBe(4);
    expect(result.grid.measures.length).toBe(5);
  });

  it('mpl:4 and measure-per-line:4 should set identical measuresPerLine value', () => {
    // Generate identical input except for directive
    const baseMeasures = '4/4 | C[4 4 4 4] | D[4 4 4 4] | E[4 4 4 4] | F[4 4 4 4] | G[4 4 4 4] | A[4 4 4 4] | B[4 4 4 4] |';

    const resultMpl = parser.parse(`mpl:2\n${baseMeasures}`);
    const resultFull = parser.parse(`measure-per-line:2\n${baseMeasures}`);

    // Both should have same measures
    expect(resultMpl.grid.measures.length).toBe(resultFull.grid.measures.length);
    expect(resultMpl.grid.measures.length).toBe(7);

    // Both should set same measuresPerLine
    expect(resultMpl.measuresPerLine).toBe(resultFull.measuresPerLine);
    expect(resultMpl.measuresPerLine).toBe(2);
  });

  it('should handle case-insensitive mpl alias', () => {
    // Test both lowercase and mixed case
    const resultLower = parser.parse('mpl:3\n4/4 | C[4 4 4 4] | D[4 4 4 4] | E[4 4 4 4] | F[4 4 4 4] |');
    const resultMixed = parser.parse('MPL:3\n4/4 | C[4 4 4 4] | D[4 4 4 4] | E[4 4 4 4] | F[4 4 4 4] |');
    const resultUpper = parser.parse('MpL:3\n4/4 | C[4 4 4 4] | D[4 4 4 4] | E[4 4 4 4] | F[4 4 4 4] |');

    // All should work identically
    expect(resultLower.measuresPerLine).toBe(resultMixed.measuresPerLine);
    expect(resultLower.measuresPerLine).toBe(resultUpper.measuresPerLine);

    expect(resultLower.measuresPerLine).toBe(3);
    expect(resultMixed.measuresPerLine).toBe(3);
    expect(resultUpper.measuresPerLine).toBe(3);

    expect(resultLower.errors).toHaveLength(0);
    expect(resultMixed.errors).toHaveLength(0);
    expect(resultUpper.errors).toHaveLength(0);
  });
});
