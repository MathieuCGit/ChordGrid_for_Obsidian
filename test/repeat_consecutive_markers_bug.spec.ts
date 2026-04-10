/**
 * Analysis of repeat symbol display bug with :|||: pattern
 * 
 * Issue: When consecutive repeats are encountered (end of first + start of second),
 * the beginning barline of the second repeat is not displayed.
 * 
 * Pattern: :|||: should display both repeat end (:||) and repeat start (||:)
 * 
 * Regression: The repeat start symbol on the second volta is missing
 */

import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

declare const describe: any;
declare const it: any;
declare const expect: any;
declare const test: any;

describe('Repeat Symbol Display - Consecutive Repeats Bug Analysis', () => {
  const parser = new ChordGridParser();
  const renderer = new SVGRenderer();

  it('should parse consecutive repeat patterns correctly', () => {
    const input = '4/4 ||: E5[88 88 88 88] | % | D5[%] | G5[8]C5[8_4] E5[2] :|||: E5[1] | C5[2] D5[2] | E5[88 88 88 88] | % :||';
    
    const result = parser.parse(input);
    
    console.log('\n=== PARSING RESULT ===');
    console.log(`Total measures: ${result.measures.length}`);
    console.log(`Errors: ${result.errors.length}`);
    result.errors.forEach(e => console.log(`  - ${e.message}`));
    
    expect(result.errors).toHaveLength(0);
    
    // Analyze each measure's barline and repeat markers
    console.log('\n=== MEASURE ANALYSIS ===');
    result.measures.forEach((m, i) => {
      const marker = (m as any);
      console.log(`\nMeasure ${i + 1}:`);
      console.log(`  Barline: ${m.barline}`);
      console.log(`  isRepeatStart: ${marker.isRepeatStart || false}`);
      console.log(`  isRepeatEnd: ${marker.isRepeatEnd || false}`);
      if (marker.repeatCount) {
        console.log(`  repeatCount: ${marker.repeatCount}`);
      }
    });
  });

  it('should detect the :|||: pattern as two separate repeat markers', () => {
    const input = '4/4 ||: A[4 4 4 4] :|||: B[4 4 4 4] :||';
    const result = parser.parse(input);
    
    console.log('\n=== CONSECUTIVE REPEATS PATTERN ===');
    console.log(`Pattern: :|||: (repeat end + repeat start)`);
    console.log(`Total measures: ${result.measures.length}`);
    
    // The :|| should end the first repeat (measure 0)
    const measure0 = result.measures[0];
    console.log(`\nMeasure 0 (A[4 4 4 4]):`);
    console.log(`  isRepeatStart: ${(measure0 as any).isRepeatStart}`);
    console.log(`  isRepeatEnd: ${(measure0 as any).isRepeatEnd}`);
    
    // The :|||: should be between measures
    // The measure after should have isRepeatStart = true
    if (result.measures.length > 1) {
      const measure1 = result.measures[1];
      console.log(`\nMeasure 1 (B[4 4 4 4]):`);
      console.log(`  isRepeatStart: ${(measure1 as any).isRepeatStart}`);
      console.log(`  isRepeatEnd: ${(measure1 as any).isRepeatEnd}`);
      
      if (!(measure1 as any).isRepeatStart) {
        console.error(`❌ BUG: Measure 1 should have isRepeatStart=true but it's ${(measure1 as any).isRepeatStart}`);
      }
    }
  });

  it('should render repeat markers in SVG for consecutive repeats', () => {
    const input = '4/4 ||: A[4 4 4 4] :|||: B[4 4 4 4] :||';
    const result = parser.parse(input);
    const svg = renderer.render(result.grid);
    
    expect(svg).toBeTruthy();
    const svgString = new XMLSerializer().serializeToString(svg);
    
    console.log('\n=== SVG REPEAT MARKERS ===');
    
    // Count repeat start markers
    const repeatStartMatches = svgString.match(/data-barline-type="repeat-start"/g);
    console.log(`Repeat start (||:) count: ${repeatStartMatches?.length || 0}`);
    
    // Count repeat end markers
    const repeatEndMatches = svgString.match(/data-barline-type="repeat-end"/g);
    console.log(`Repeat end (:||) count: ${repeatEndMatches?.length || 0}`);
    
    // For :|||: pattern, we should see:
    // - 1 repeat-start at beginning of first section
    // - 1 repeat-end at end of first section
    // - 1 repeat-start at beginning of second section (THIS IS MISSING!)
    // - 1 repeat-end at end of second section
    
    console.log(`\nExpected: 2 repeat-start + 2 repeat-end`);
    console.log(`Actual: ${repeatStartMatches?.length || 0} repeat-start + ${repeatEndMatches?.length || 0} repeat-end`);
    
    if ((repeatStartMatches?.length || 0) < 2) {
      console.error(`❌ REGRESSION: Missing repeat-start marker for second repeat`);
    }
  });

  it('should handle intermediate barlines in repeat sections', () => {
    const input = '4/4 ||: A[4 4 4 4] | B[4 4 4 4] :|||: C[4 4 4 4] | D[4 4 4 4] :||';
    const result = parser.parse(input);
    
    console.log('\n=== REPEAT WITH INTERMEDIATE BARLINES ===');
    console.log(`Total measures: ${result.measures.length}`);
    
    // First repeat: ||: A | B :||
    result.measures.slice(0, 2).forEach((m, i) => {
      console.log(`Measure ${i + 1}: barline=${m.barline}, start=${(m as any).isRepeatStart}, end=${(m as any).isRepeatEnd}`);
    });
    
    console.log('--- between repeats ---');
    
    // Second repeat: ||: C | D :||
    result.measures.slice(2).forEach((m, i) => {
      console.log(`Measure ${i + 3}: barline=${m.barline}, start=${(m as any).isRepeatStart}, end=${(m as any).isRepeatEnd}`);
    });
  });

  it('should distinguish between ||| (double barline) and :|||: (repeat end + start)', () => {
    console.log('\n=== BARLINE PATTERN DISTINCTION ===');
    
    // Case 1: Double barline (just structural)
    const case1 = '4/4 | A[4 4 4 4] ||| B[4 4 4 4] |';
    console.log(`\nCase 1: ||| (should be double barline, NOT repeat markers)`);
    const result1 = parser.parse(case1);
    result1.measures.forEach((m, i) => {
      const hasRepeat = (m as any).isRepeatStart || (m as any).isRepeatEnd;
      console.log(`  Measure ${i + 1}: barline=${m.barline}, isRepeat=${hasRepeat}`);
      if (hasRepeat && (m.barline === '||' || m.barline === '|')) {
        console.error(`    ❌ ERROR: Regular barline marked as repeat marker`);
      }
    });
    
    // Case 2: Consecutive repeats
    const case2 = '4/4 ||: A[4 4 4 4] :|||: B[4 4 4 4] :||';
    console.log(`\nCase 2: :|||: (should parse as :|| followed by ||:)`);
    const result2 = parser.parse(case2);
    result2.measures.forEach((m, i) => {
      const start = (m as any).isRepeatStart;
      const end = (m as any).isRepeatEnd;
      console.log(`  Measure ${i + 1}: repeat_end=${end}, repeat_start=${start}`);
    });
  });

});
