import { ChordGridParser } from '../src/parser/ChordGridParser';

describe('Mixed-Duration Tuplet with baseLen', () => {
  let parser: ChordGridParser;

  beforeEach(() => {
    parser = new ChordGridParser();
  });

  describe('baseLen calculation for mixed tuplets', () => {
    it('should handle {816-16 1616 8 8}5:4 correctly', () => {
      const input = '4/4 | [{816-16 1616 8 8}5:4 4] |';
      const result = parser.parse(input);

      console.log('Test: {816-16 1616 8 8}5:4');
      console.log('Errors:', result.errors);
      
      // Expected calculation:
      // baseLen = 16 (smallest note value = highest number)
      // Notes: 8, 16, 16, 16, 16, 8, 8
      // In units of 16: 2, 1, 1, 1, 1, 2, 2 = 10 units
      // In eighths: 10/2 = 5 eighths
      // Ratio 5:4 means: 5 eighths play in time of 4 eighths
      // Actual duration: (5/8) × (4/5) = 4/8 = 1/2 whole = 2 quarter notes
      // Plus final quarter note: 2 + 1 = 3 quarter notes
      // Expected for 4/4: 4 quarter notes
      
      // This SHOULD fail validation because 3 ≠ 4
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('expected 4');
    });

    it('should handle {816-16 1616 8 8}5:4 with correct measure fill', () => {
      const input = '4/4 | [{816-16 1616 8 8}5:4 2] |';
      const result = parser.parse(input);

      console.log('Test: {816-16 1616 8 8}5:4 + half note');
      console.log('Errors:', result.errors);
      
      // Tuplet = 2 quarter notes
      // Half note = 2 quarter notes
      // Total = 4 quarter notes ✓
      
      expect(result.errors.length).toBe(0);
    });

    it('should handle simple uniform triplet {8 8 8}3:2', () => {
      const input = '4/4 | [{8 8 8}3:2 4 4 4] |';
      const result = parser.parse(input);

      console.log('Test: {8 8 8}3:2');
      console.log('Errors:', result.errors);
      
      // baseLen = 8
      // Units: 1 + 1 + 1 = 3 units of eighths
      // Ratio 3:2 means: 3 eighths in time of 2 eighths
      // Actual: (3/8) × (2/3) = 2/8 = 1/4 whole = 1 quarter note
      // Plus 3 quarter notes: 1 + 3 = 4 ✓
      
      expect(result.errors.length).toBe(0);
    });

    it('should calculate baseLen as smallest (highest numeric) value', () => {
      const input = '4/4 | [{4 8 16}3:2 2] |';
      const result = parser.parse(input);

      console.log('Test: {4 8 16}3:2 - mixed quarter, eighth, sixteenth');
      console.log('Errors:', result.errors);
      
      // baseLen = 16 (smallest duration)
      // In units of 16: quarter=4, eighth=2, sixteenth=1
      // Total: 4 + 2 + 1 = 7 units of 16ths = 7/16 whole
      // Ratio 3:2: (7/16) × (2/3) = 14/48 = 7/24 whole
      // 7/24 whole = 7/6 quarter notes ≈ 1.167 quarters
      // Plus half note (2 quarters): 1.167 + 2 = 3.167 quarters
      // Should fail 4/4 validation
      
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
