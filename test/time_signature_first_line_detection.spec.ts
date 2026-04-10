/**
 * Test for time signature detection on first line when preceded by barline
 * 
 * Bug: When input starts with |N/M (no global time signature at line start),
 * the parser should detect this as the GLOBAL time signature, not as a local change.
 * 
 * Otherwise it defaults to 4/4, creating a false "change" that gets rendered.
 * 
 * Issue: |3/8 C | G |5/8 D/F#[4.] D[4] | 2/4 A |
 * Should detect global 3/8 from first position, not default to 4/4
 */

import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

declare const describe: any;
declare const it: any;
declare const expect: any;
declare const test: any;

describe('Time Signature First Line Detection', () => {
  const parser = new ChordGridParser();
  const renderer = new SVGRenderer();

  it('should detect time signature immediately after first barline as GLOBAL signature', () => {
    // Regression: previously defaulted to 4/4 when grid started with |N/M pattern
    const input = '|3/8 C | G |5/8 D/F#[4.] D[4] | 2/4 A |';
    const result = parser.parse(input);

    // The global (grid) time signature should be detected from |3/8
    // NOT default to 4/4
    expect(result.grid.timeSignature.numerator).toBe(3);
    expect(result.grid.timeSignature.denominator).toBe(8);
    
    console.log(`✓ Grid global time signature: ${result.grid.timeSignature.numerator}/${result.grid.timeSignature.denominator}`);
  });

  it('should not mark first measure as having a TIME SIGNATURE CHANGE', () => {
    const input = '|3/8 C | G |';
    const result = parser.parse(input);

    const firstMeasure = result.grid.measures[0];
    
    // First measure should NOT have a local timeSignature set
    // (because it already matches the global one)
    // This prevents the renderer from thinking it's a "change"
    expect(firstMeasure.timeSignature).toBeUndefined();
    
    console.log(`✓ First measure has no redundant timeSignature property`);
  });

  it('should detect multiple time signatures on first line with proper precedence', () => {
    const input = '|3/8 C | G |5/8 D/F# | 2/4 A |';
    const result = parser.parse(input);

    expect(result.errors).toHaveLength(0);

    // First time sig (after first |) = global
    expect(result.grid.timeSignature.numerator).toBe(3);
    expect(result.grid.timeSignature.denominator).toBe(8);

    // Measure 0: C with global 3/8 (should NOT have timeSignature property)
    expect(result.grid.measures[0].timeSignature).toBeUndefined();

    // Measure 1: G with global 3/8 (should NOT have timeSignature property)
    expect(result.grid.measures[1].timeSignature).toBeUndefined();

    // Measure 2: D/F# with local 5/8 timeSignature
    // (this IS a change from 3/8 to 5/8)
    expect(result.grid.measures[2].timeSignature?.numerator).toBe(5);
    expect(result.grid.measures[2].timeSignature?.denominator).toBe(8);

    // Measure 3: A with local 2/4 timeSignature
    expect(result.grid.measures[3].timeSignature?.numerator).toBe(2);
    expect(result.grid.measures[3].timeSignature?.denominator).toBe(4);

    console.log(`✓ Multiple time signatures detected correctly`);
    console.log(`  Global: ${result.grid.timeSignature.numerator}/${result.grid.timeSignature.denominator}`);
    result.grid.measures.forEach((m, i) => {
      if (m.timeSignature) {
        console.log(`  Measure ${i}: ${m.timeSignature.numerator}/${m.timeSignature.denominator}`);
      }
    });
  });

  it('should handle case with explicit barline before chord', () => {
    // Pattern: first barline has signature, then immediate chord
    const input = '|2/4 C[4 4] | D[2] |';
    const result = parser.parse(input);

    expect(result.grid.timeSignature.numerator).toBe(2);
    expect(result.grid.timeSignature.denominator).toBe(4);
    expect(result.grid.measures[0].timeSignature).toBeUndefined();

    console.log(`✓ First barline + time signature pattern recognized`);
  });

  it('should NOT display 4/4 implicitly in rendered SVG for first-line-detected signature', () => {
    const input = '|3/8 C | G |';
    const result = parser.parse(input);
    const svg = renderer.render(result.grid);

    expect(svg).toBeTruthy();

    const svgString = new XMLSerializer().serializeToString(svg);

    // Should NOT contain 4/4 time signature display
    // (which would happen if parser incorrectly defaulted to 4/4 then marked 3/8 as a change)
    expect(svgString).not.toContain('data-time-signature="4/4"');

    // Should contain the correct 3/8 signature
    // (only if it's actually marked for display, or we're checking it was parsed correctly)
    
    console.log(`✓ SVG does not contain unwanted 4/4 time signature display`);
  });

  it('should handle rhythm validation with first-line detected time signature', () => {
    // 3/8 time = 3 eighth notes per measure
    // Provide properly-timed measures
    const input = '|3/8 C[8 8 8] | G[8 8 8] |';
    const result = parser.parse(input);

    // Should have NO validation errors (rhythm matches 3/8)
    expect(result.errors).toHaveLength(0);

    expect(result.grid.timeSignature.numerator).toBe(3);
    expect(result.grid.timeSignature.denominator).toBe(8);

    console.log(`✓ Rhythm validation uses first-line detected time signature (3/8)`);
  });
  
  it('should fail rhythm validation if rhythm does not match first-line detected signature', () => {
    // 3/8 time = 3 eighth notes per measure
    // Provide 4 eighth notes (invalid for 3/8)
    const input = '|3/8 C[8 8 8 8] |';
    const result = parser.parse(input);

    // Should have validation error: found 4 eighths instead of 3
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('expected');
    expect(result.errors[0].message).toContain('3/8');

    console.log(`✓ Rhythm validation correctly rejects invalid rhythm for detected 3/8`);
    console.log(`  Error: ${result.errors[0].message}`);
  });

  it('should differentiate between first-line signature and normal signature at line start', () => {
    // Multi-line case: first line starts with |3/8, second line changes to 2/4
    const input = `|3/8 C[8 8 8] | G[8 8 8] |
|2/4 D[4 4] | Em[2] |`;
    const result = parser.parse(input);

    expect(result.grid.timeSignature.numerator).toBe(3);
    expect(result.grid.timeSignature.denominator).toBe(8);

    // First line measures: no local timeSignature (use global 3/8)
    expect(result.grid.measures[0].timeSignature).toBeUndefined();
    expect(result.grid.measures[1].timeSignature).toBeUndefined();

    // Second line, first measure: should have 2/4 (this IS a change)
    expect(result.grid.measures[2].timeSignature?.numerator).toBe(2);
    expect(result.grid.measures[2].timeSignature?.denominator).toBe(4);

    console.log(`✓ First-line signature and mid-section signature change properly distinguished`);
  });

});
