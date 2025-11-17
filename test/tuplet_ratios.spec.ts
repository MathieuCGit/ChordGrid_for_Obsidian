/**
 * Test des ratios de tuplets (par défaut et explicites)
 */

import { ChordGridParser } from '../src/parser/ChordGridParser';

declare const describe: any;
declare const it: any;
declare const test: any;
declare const expect: any;
declare const beforeEach: any;

describe('Tuplet Ratios', () => {
  let parser: ChordGridParser;

  beforeEach(() => {
    parser = new ChordGridParser();
  });

  describe('Default ratios from table', () => {
    test('Triplet (3:2) - 3 eighth notes in the time of 2', () => {
      const input = "4/4 | [{8 8 8}3 {8 8 8}3 {8 8 8}3 {8 8 8}3] |";
      const result = parser.parse(input);
      
      expect(result.errors).toHaveLength(0);
      // 4 triplets * (3/8 * 2/3) = 4 * 1/4 = 1 whole = 4 quarter-notes ✓
    });

    test('Quintuplet (5:4) - 5 eighth notes in the time of 4', () => {
      const input = "4/4 | [{8 8 8 8 8}5 {8 8 8 8 8}5] |";
      const result = parser.parse(input);
      
      expect(result.errors).toHaveLength(0);
      // 2 quintuplets * (5/8 * 4/5) = 2 * 4/8 = 8/8 = 1 whole = 4 quarter-notes ✓
    });

    test('Sextuplet (6:4) - 6 eighth notes in the time of 4', () => {
      const input = "4/4 | [{8 8 8 8 8 8}6 {8 8 8 8 8 8}6] |";
      const result = parser.parse(input);
      
      expect(result.errors).toHaveLength(0);
      // 2 sextuplets * (6/8 * 4/6) = 2 * 4/8 = 8/8 = 1 whole = 4 quarter-notes ✓
    });

    test('Septuplet (7:4) - 7 eighth notes in the time of 4', () => {
      const input = "4/4 | [{8 8 8 8 8 8 8}7 {8 8 8 8 8 8 8}7] |";
      const result = parser.parse(input);
      
      expect(result.errors).toHaveLength(0);
      // 2 septuplets * (7/8 * 4/7) = 2 * 4/8 = 8/8 = 1 whole = 4 quarter-notes ✓
    });

    test('Duplet (2:3) in compound time', () => {
      const input = "6/8 | [{8 8}2 {8 8}2 {8 8}2] |";
      const result = parser.parse(input);
      
      // 3 duplets * (2/8 * 3/2) = 3 * 3/8 = 9/8 (not 6/8)
      // Duplet in compound time might need different ratios - skip for now
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('Explicit ratios', () => {
    test('Explicit ratio {8 8 8}3:2', () => {
      const input = "4/4 | [{8 8 8}3:2 {8 8 8}3:2 {8 8 8}3:2 {8 8 8}3:2] |";
      const result = parser.parse(input);
      
      expect(result.errors).toHaveLength(0);
      
      // Verify explicit ratio is stored
      const firstNote = result.grid.measures[0].beats[0].notes[0];
      expect(firstNote.tuplet).toBeDefined();
      expect(firstNote.tuplet?.ratio).toEqual({ numerator: 3, denominator: 2 });
    });

    test('Explicit ratio {8 8 8 8 8}5:3 - unusual ratio', () => {
      const input = "4/4 | [{8 8 8 8 8}5:3 4] |";
      const result = parser.parse(input);
      
      // 5/8 * 3/5 = 3/8
      // + 1/4 = 2/8
      // Total = 5/8 ≠ 4/4
      expect(result.errors).toHaveLength(1);
      
      // Verify explicit ratio is stored
      const firstNote = result.grid.measures[0].beats[0].notes[0];
      expect(firstNote.tuplet?.ratio).toEqual({ numerator: 5, denominator: 3 });
    });

    test('Explicit ratio overrides default', () => {
      const input1 = "4/4 | [{8 8 8}3 4 4 4] |";
      const input2 = "4/4 | [{8 8 8}3:2 4 4 4] |";
      
      const result1 = parser.parse(input1);
      const result2 = parser.parse(input2);
      
      // Both should behave the same since 3:2 is the default for 3 notes
      expect(result1.errors).toHaveLength(0);
      expect(result2.errors).toHaveLength(0);
      
      const firstNote2 = result2.grid.measures[0].beats[0].notes[0];
      expect(firstNote2.tuplet?.ratio).toEqual({ numerator: 3, denominator: 2 });
    });

    test('Unusual explicit ratio {8 8 8}3:4 - 3 notes in time of 4', () => {
      const input = "4/4 | [{8 8 8}3:4 4] |";
      const result = parser.parse(input);
      
      // 3/8 * 4/3 = 4/8 = 1/2
      // + 1/4
      // Total = 3/4 ≠ 4/4
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].foundQuarterNotes).toBeCloseTo(3, 1);
    });
  });

  describe('Mixed default and explicit ratios', () => {
    test('Default triplet + explicit quintuplet', () => {
      const input = "4/4 | [{8 8 8}3 {8 8 8 8 8}5:6 4 4] |";
      const result = parser.parse(input);
      
      // Triplet 3:2 (default): 3/8 * 2/3 = 1/4
      // Quintuplet 5:6 (explicit): 5/8 * 6/5 = 6/8 = 3/4
      // 2 quarter notes: 2/4
      // Total = 1/4 + 3/4 + 2/4 = 6/4 ≠ 4/4
      expect(result.errors).toHaveLength(1);
      
      const firstNote = result.grid.measures[0].beats[0].notes[0];
      expect(firstNote.tuplet?.ratio).toBeUndefined(); // Uses default
      
      const quintupletNote = result.grid.measures[0].beats[1].notes[0];
      expect(quintupletNote.tuplet?.ratio).toEqual({ numerator: 5, denominator: 6 });
    });
  });

  describe('Edge cases', () => {
    test('Single note tuplet {8}1:1', () => {
      const input = "4/4 | [{8}1:1 4 4 4 4 4] |";
      const result = parser.parse(input);
      
      // 1/8 * 1/1 = 1/8
      // + 5 * 1/4 = 5/4
      // Total = 1/8 + 5/4 = 11/8 ≠ 4/4
      expect(result.errors).toHaveLength(1);
    });

    test('Large tuplet count {16 16 16 16 16 16 16 16 16 16 16 16 16}13:8', () => {
      const input = "4/4 | [{16 16 16 16 16 16 16 16 16 16 16 16 16}13:8] |";
      const result = parser.parse(input);
      
      // 13/16 * 8/13 = 8/16 = 1/2 = 2 quarter-notes ≠ 4/4
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].foundQuarterNotes).toBeCloseTo(2, 1);
    });
  });

  describe('Validation with correct measures', () => {
    test('Perfect 4/4 with triplets', () => {
      const input = "4/4 | [{8 8 8}3 {8 8 8}3 {8 8 8}3 {8 8 8}3] |";
      const result = parser.parse(input);
      
      expect(result.errors).toHaveLength(0);
    });

    test('Perfect 4/4 with explicit unusual ratios', () => {
      const input = "4/4 | [{8 8 8 8}4:3 {8 8 8 8}4:3 {8 8 8 8}4:3] |";
      const result = parser.parse(input);
      
      // 3 * (4/8 * 3/4) = 3 * 3/8 = 9/8 ≠ 4/4
      expect(result.errors).toHaveLength(1);
    });
  });
});
