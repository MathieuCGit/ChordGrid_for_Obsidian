import { ChordGridParser } from '../src/parser/ChordGridParser';

describe('User Example - Mixed Duration Tuplet {816-16 1616 8 8}5:4', () => {
  let parser: ChordGridParser;

  beforeEach(() => {
    parser = new ChordGridParser();
  });

  it('should validate the original user case with explanation', () => {
    // User's original example that prompted the baseLen implementation
    const input = '4/4 | [{816-16 1616 8 8}5:4 2] |';
    const result = parser.parse(input);

    console.log('\n=== User Case Analysis ===');
    console.log('Input:', input);
    console.log('\nTuplet content: {816-16 1616 8 8}');
    console.log('  Notes: 8, 16, 16, 16, 16, 8, 8');
    console.log('  baseLen = 16 (smallest/shortest note value)');
    console.log('\nUnits of baseLen (16th notes):');
    console.log('  8  = 2 units (eighth note = 2 sixteenths)');
    console.log('  16 = 1 unit  (sixteenth note = 1 sixteenth)');
    console.log('  16 = 1 unit');
    console.log('  16 = 1 unit');
    console.log('  16 = 1 unit');
    console.log('  8  = 2 units');
    console.log('  8  = 2 units');
    console.log('  Total: 2+1+1+1+1+2+2 = 10 units of 16th');
    console.log('\nNormalized to eighths: 10/2 = 5 eighths');
    console.log('\nRatio }5:4 means:');
    console.log('  N = 5 (cumulative duration in eighths)');
    console.log('  M = 4 (target duration in eighths)');
    console.log('  Play 5 eighths in the time of 4 eighths');
    console.log('\nCalculation:');
    console.log('  cumulativeDuration = 10/16 = 5/8 whole note');
    console.log('  tupletRatio = M/N = 4/5');
    console.log('  actualDuration = (5/8) × (4/5) = 4/8 = 1/2 whole note = 2 quarter notes');
    console.log('\nMeasure validation:');
    console.log('  Tuplet: 2 quarter notes');
    console.log('  Half note (2): 2 quarter notes');
    console.log('  Total: 2 + 2 = 4 quarter notes');
    console.log('  Expected for 4/4: 4 quarter notes ✓');
    console.log('\nErrors:', result.errors);
    console.log('========================\n');

    // Should pass validation (no errors)
    expect(result.errors.length).toBe(0);
    
    // Verify the grid was parsed correctly
    expect(result.grid.measures.length).toBe(1);
    expect(result.grid.measures[0].beats.length).toBe(2);
  });

  it('should fail validation if measure is incomplete', () => {
    // Same tuplet but with quarter note instead of half note
    const input = '4/4 | [{816-16 1616 8 8}5:4 4] |';
    const result = parser.parse(input);

    console.log('\n=== Incomplete Measure Test ===');
    console.log('Input:', input);
    console.log('Tuplet: 2 quarter notes');
    console.log('Quarter note: 1 quarter note');
    console.log('Total: 2 + 1 = 3 quarter notes');
    console.log('Expected: 4 quarter notes');
    console.log('Errors:', result.errors);
    console.log('============================\n');

    // Should fail validation (1 quarter note short)
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('expected 4');
    expect(result.errors[0].message).toContain('found 3');
  });

  it('should explain why the original notation {816-16 1616 8 8}7:8 would be wrong', () => {
    // If we used note count (7) instead of baseLen approach
    const input = '4/4 | [{816-16 1616 8 8}7:8 2] |';
    const result = parser.parse(input);

    console.log('\n=== Wrong Notation Explanation ===');
    console.log('Input:', input);
    console.log('\nWhy }7:8 is WRONG:');
    console.log('  7 = number of notes/rests (simple count)');
    console.log('  8 = target duration');
    console.log('  Problem: 7 does NOT represent the cumulative duration!');
    console.log('\nWith }7:8 ratio:');
    console.log('  cumulativeDuration = 5/8 whole note (same as before)');
    console.log('  tupletRatio = M/N = 8/7');
    console.log('  actualDuration = (5/8) × (8/7) = 40/56 = 5/7 whole note');
    console.log('  = 5/7 × 4 = 20/7 ≈ 2.857 quarter notes');
    console.log('\nMeasure validation:');
    console.log('  Tuplet: 2.857 quarter notes');
    console.log('  Half note: 2 quarter notes');
    console.log('  Total: 2.857 + 2 = 4.857 quarter notes');
    console.log('  Expected: 4 quarter notes ❌ FAILS');
    console.log('\nErrors:', result.errors);
    console.log('====================================\n');

    // Should fail validation
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should work with different baseLen values', () => {
    // Tuplet with sixteenth notes as baseLen
    const input1 = '4/4 | [{16 16 16}3:2 4 4 4] |';
    const result1 = parser.parse(input1);
    
    console.log('\n=== Different baseLen Examples ===');
    console.log('Example 1: {16 16 16}3:2');
    console.log('  baseLen = 16');
    console.log('  Units: 1+1+1 = 3 sixteenths');
    console.log('  Ratio 3:2: 3 sixteenths in time of 2 sixteenths');
    console.log('  Duration: (3/16) × (2/3) = 2/16 = 1/8 = 0.5 quarter notes');
    console.log('  Total: 0.5 + 1 + 1 + 1 = 3.5 quarter notes');
    console.log('  Errors:', result1.errors);

    expect(result1.errors.length).toBeGreaterThan(0); // Should fail (3.5 ≠ 4)

    // Tuplet with half notes as baseLen
    const input2 = '4/4 | [{2 2 2}3:2] |';
    const result2 = parser.parse(input2);
    
    console.log('\nExample 2: {2 2 2}3:2');
    console.log('  baseLen = 2 (half note)');
    console.log('  Units: 1+1+1 = 3 half notes');
    console.log('  Ratio 3:2: 3 halves in time of 2 halves');
    console.log('  Duration: (3/2) × (2/3) = 1 whole note = 4 quarter notes');
    console.log('  Total: 4 quarter notes ✓');
    console.log('  Errors:', result2.errors);
    console.log('==============================\n');

    expect(result2.errors.length).toBe(0); // Should pass
  });
});
