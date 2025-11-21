/**
 * @file volta_parsing.spec.ts
 * @description Tests for volta/endings parsing functionality
 * 
 * Tests cover:
 * - Single volta notation: |.1
 * - Range volta notation: |.1-3
 * - List volta notation: |.1,2,3
 * - Closed volta brackets (before :||)
 * - Open volta brackets (after :||)
 * - Volta spanning across multiple measures
 */

import { ChordGridParser } from '../src/parser/ChordGridParser';

describe('Volta Parsing', () => {
  let parser: ChordGridParser;

  beforeEach(() => {
    parser = new ChordGridParser();
  });

  describe('Single volta notation', () => {
    it('should parse |.1 as volta with number [1]', () => {
      const input = '4/4 ||: C[4 4 4 4] |.1 G[4 4 4 4] :||';
      const result = parser.parse(input);
      
      expect(result.grid.measures).toHaveLength(2);
      
      const measure2 = result.grid.measures[1] as any;
      expect(measure2.voltaStart).toBeDefined();
      expect(measure2.voltaStart.numbers).toEqual([1]);
      expect(measure2.voltaStart.text).toBe('1');
      expect(measure2.voltaStart.isClosed).toBe(true); // Before :||, loops back
    });

    it('should parse |.4 as volta with number [4]', () => {
      const input = '4/4 ||: C[4 4 4 4] | % | % :||.4 G[4 4 4 4] ||';
      const result = parser.parse(input);
      
      expect(result.grid.measures).toHaveLength(4);
      
      const measure4 = result.grid.measures[3] as any;
      expect(measure4.voltaStart).toBeDefined();
      expect(measure4.voltaStart.numbers).toEqual([4]);
      expect(measure4.voltaStart.text).toBe('4');
      expect(measure4.voltaStart.isClosed).toBe(false); // After :||, no loop back
    });
  });

  describe('Range volta notation', () => {
    it('should parse |.1-3 as volta with numbers [1, 2, 3]', () => {
      const input = '4/4 ||: C[4 4 4 4] |.1-3 G[4 4 4 4] :||';
      const result = parser.parse(input);
      
      expect(result.grid.measures).toHaveLength(2);
      
      const measure2 = result.grid.measures[1] as any;
      expect(measure2.voltaStart).toBeDefined();
      expect(measure2.voltaStart.numbers).toEqual([1, 2, 3]);
      expect(measure2.voltaStart.text).toBe('1-3');
      expect(measure2.voltaStart.isClosed).toBe(true); // Before :||, loops back
    });

    it('should parse |.2-5 as volta with numbers [2, 3, 4, 5]', () => {
      const input = '4/4 ||: C[4 4 4 4] |.2-5 G[4 4 4 4] :||';
      const result = parser.parse(input);
      
      const measure2 = result.grid.measures[1] as any;
      expect(measure2.voltaStart).toBeDefined();
      expect(measure2.voltaStart.numbers).toEqual([2, 3, 4, 5]);
      expect(measure2.voltaStart.text).toBe('2-5');
    });
  });

  describe('List volta notation', () => {
    it('should parse |.1,2,3 as volta with numbers [1, 2, 3]', () => {
      const input = '4/4 ||: C[4 4 4 4] |.1,2,3 G[4 4 4 4] :||';
      const result = parser.parse(input);
      
      expect(result.grid.measures).toHaveLength(2);
      
      const measure2 = result.grid.measures[1] as any;
      expect(measure2.voltaStart).toBeDefined();
      expect(measure2.voltaStart.numbers).toEqual([1, 2, 3]);
      expect(measure2.voltaStart.text).toBe('1,2,3');
      expect(measure2.voltaStart.isClosed).toBe(true); // Before :||, loops back
    });

    it('should parse |.1,3,5 as volta with numbers [1, 3, 5]', () => {
      const input = '4/4 ||: C[4 4 4 4] |.1,3,5 G[4 4 4 4] :||';
      const result = parser.parse(input);
      
      const measure2 = result.grid.measures[1] as any;
      expect(measure2.voltaStart).toBeDefined();
      expect(measure2.voltaStart.numbers).toEqual([1, 3, 5]);
      expect(measure2.voltaStart.text).toBe('1,3,5');
    });
  });

  describe('Closed vs Open volta brackets', () => {
    it('should mark volta as CLOSED (isClosed=true) when NOT ending with :||', () => {
      const input = '4/4 ||: C[4 4 4 4] |.1-3 G[4 4 4 4] | % :||';
      const result = parser.parse(input);
      
      const measure2 = result.grid.measures[1] as any;
      expect(measure2.voltaStart).toBeDefined();
      expect(measure2.voltaStart.isClosed).toBe(true); // Before :||, will loop back
    });

    it('should mark volta as CLOSED (isClosed=true) when ending with :|| (loops back)', () => {
      const input = '4/4 ||: C[4 4 4 4] |.1-3 G[4 4 4 4] :||';
      const result = parser.parse(input);
      
      const measure2 = result.grid.measures[1] as any;
      expect(measure2.voltaStart).toBeDefined();
      expect(measure2.voltaStart.isClosed).toBe(true); // Before/at :||, loops back
    });

    it('should mark volta AFTER :|| as OPEN (isClosed=false, continues without looping)', () => {
      const input = '4/4 ||: C[4 4 4 4] | % :||.4 G[4 4 4 4] ||';
      const result = parser.parse(input);
      
      const measure3 = result.grid.measures[2] as any;
      expect(measure3.voltaStart).toBeDefined();
      expect(measure3.voltaStart.isClosed).toBe(false); // After :||, no loop back
    });
  });

  describe('Volta spanning multiple measures', () => {
    it('should set voltaStart on first measure and voltaEnd on last measure', () => {
      const input = '4/4 ||: C[4 4 4 4] |.1-3 G[4 4 4 4] | Am[4 4 4 4] :||';
      const result = parser.parse(input);
      
      expect(result.grid.measures).toHaveLength(3);
      
      const measure2 = result.grid.measures[1] as any;
      const measure3 = result.grid.measures[2] as any;
      
      expect(measure2.voltaStart).toBeDefined();
      expect(measure2.voltaStart.numbers).toEqual([1, 2, 3]);
      
      // voltaEnd should be on the last measure of the volta span
      expect(measure3.voltaEnd).toBeDefined();
      expect(measure3.voltaEnd).toBe(measure2.voltaStart); // Same volta object
    });

    it('should handle single-measure volta (voltaStart and voltaEnd on same measure)', () => {
      const input = '4/4 ||: C[4 4 4 4] |.1 G[4 4 4 4] :||';
      const result = parser.parse(input);
      
      const measure2 = result.grid.measures[1] as any;
      
      expect(measure2.voltaStart).toBeDefined();
      expect(measure2.voltaEnd).toBeDefined();
      expect(measure2.voltaEnd).toBe(measure2.voltaStart);
    });
  });

  describe('Complex volta example', () => {
    it('should parse full example with multiple voltas', () => {
      const input = '4/4 ||: C[4 88_4 4] | % |.1-3 G[%] | % :||.4 G[4 4 4 4] ||';
      const result = parser.parse(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.grid.measures).toHaveLength(5);
      
      // First volta: measures 2-3 (|.1-3) - applied after % measure
      const measure2 = result.grid.measures[1] as any; // Second measure (first %)
      const measure3 = result.grid.measures[2] as any; // Third measure (G[%])
      
      // The volta "1-3" is on the barline after the first %, so it applies to G[%]
      expect(measure3.voltaStart).toBeDefined();
      expect(measure3.voltaStart.numbers).toEqual([1, 2, 3]);
      expect(measure3.voltaStart.isClosed).toBe(true); // Not ending with :||
      
      // voltaEnd should be on measure 4 (second %)
      const measure4 = result.grid.measures[3] as any;
      expect(measure4.voltaEnd).toBeDefined();
      
      // Second volta: measure 5 (G[4444]) receives volta "4" from :||.4
      const measure5 = result.grid.measures[4] as any;
      expect(measure5.voltaStart).toBeDefined();
      expect(measure5.voltaStart.numbers).toEqual([4]);
      expect(measure5.voltaStart.isClosed).toBe(false); // After :||, no loop back
      expect(measure5.voltaEnd).toBeDefined(); // Single measure volta
    });
  });
});
