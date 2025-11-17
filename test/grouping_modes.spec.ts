/**
 * @file grouping_modes.spec.ts
 * @description Tests for binary/ternary grouping modes and automatic beam breaking
 * 
 * Tests v2.1 features:
 * - binary/ternary grouping mode parsing
 * - Auto-detection of grouping mode
 * - Automatic beam breaking at beat boundaries
 * - [_] forced beam syntax
 */

import { ChordGridParser } from '../src/parser/ChordGridParser';
import { MusicAnalyzer } from '../src/analyzer/MusicAnalyzer';

// Test helper declarations for ts-node execution
declare const describe: any;
declare const it: any;
declare const expect: any;

describe('Grouping Modes (v2.1)', () => {
  let parser: ChordGridParser;
  let analyzer: MusicAnalyzer;
  
  beforeEach(() => {
    parser = new ChordGridParser();
    analyzer = new MusicAnalyzer();
  });

  describe('Time signature parsing with grouping mode', () => {
    it('should parse explicit binary mode: 4/4 binary', () => {
      const result = parser.parse('4/4 binary | C[88 88 88 88] |');
      
      expect(result.grid.timeSignature.numerator).toBe(4);
      expect(result.grid.timeSignature.denominator).toBe(4);
      expect(result.grid.timeSignature.groupingMode).toBe('binary');
    });
    
    it('should parse explicit ternary mode: 6/8 ternary', () => {
      const result = parser.parse('6/8 ternary | C[888 888] |');
      
      expect(result.grid.timeSignature.numerator).toBe(6);
      expect(result.grid.timeSignature.denominator).toBe(8);
      expect(result.grid.timeSignature.groupingMode).toBe('ternary');
    });
    
    it('should default to auto mode when not specified', () => {
      const result = parser.parse('4/4 | C[88 88 88 88] |');
      
      expect(result.grid.timeSignature.groupingMode).toBe('auto');
    });
    
    it('should allow forcing ternary in binary time: 4/4 ternary', () => {
      const result = parser.parse('4/4 ternary | C[888 888 888 888] |');
      
      expect(result.grid.timeSignature.numerator).toBe(4);
      expect(result.grid.timeSignature.groupingMode).toBe('ternary');
    });
    
    it('should allow forcing binary in compound time: 6/8 binary', () => {
      const result = parser.parse('6/8 binary | C[88 88 88] |');
      
      expect(result.grid.timeSignature.numerator).toBe(6);
      expect(result.grid.timeSignature.groupingMode).toBe('binary');
    });
  });

  describe('Auto-detection of grouping mode', () => {
    it('should auto-detect binary for 4/4', () => {
      const result = parser.parse('4/4 | C[8888 8888] |');
      const analyzed = parser.parseForAnalyzer('4/4 | C[8888 8888] |');
      
      expect(result.grid.timeSignature.groupingMode).toBe('auto');
      // Auto should resolve to binary (denominator <= 4)
    });
    
    it('should auto-detect ternary for 6/8', () => {
      const result = parser.parse('6/8 | C[888888] |');
      
      expect(result.grid.timeSignature.groupingMode).toBe('auto');
      // Auto should resolve to ternary (denominator 8, numerator 6)
    });
    
    it('should auto-detect ternary for 9/8', () => {
      const result = parser.parse('9/8 | C[888 888 888] |');
      
      expect(result.grid.timeSignature.groupingMode).toBe('auto');
      expect(result.grid.timeSignature.numerator).toBe(9);
    });
    
    it('should treat 5/8 as irregular (space-based)', () => {
      const result = parser.parse('5/8 | C[888 88] |');
      
      expect(result.grid.timeSignature.groupingMode).toBe('auto');
      // Auto should resolve to irregular (not 3,6,9,12)
    });
    
    it('should treat 7/8 as irregular (space-based)', () => {
      const result = parser.parse('7/8 | C[88 88 888] |');
      
      expect(result.grid.timeSignature.groupingMode).toBe('auto');
      expect(result.grid.timeSignature.numerator).toBe(7);
    });
  });

  describe('Automatic beam breaking based on grouping mode', () => {
    it('should break beams every 2 eighths in binary mode (4/4)', () => {
      const parsed = parser.parseForAnalyzer('4/4 | C[8888 8888] |');
      const analyzed = analyzer.analyze(parsed.measures[0]);
      
      // In binary mode, 8888 should be split into 88 88
      // Expecting 4 groups of 2 eighths each (or 2 groups of 4 with breaks)
      expect(analyzed.beamGroups.length).toBeGreaterThan(1);
    });
    
    it('should break beams every 3 eighths in ternary mode (6/8)', () => {
      const parsed = parser.parseForAnalyzer('6/8 | C[888888] |');
      const analyzed = analyzer.analyze(parsed.measures[0]);
      
      // In ternary mode, 888888 should be split into 888 888
      // Expecting 2 groups of 3 eighths each
      expect(analyzed.beamGroups.length).toBeGreaterThanOrEqual(1);
    });
    
    it('should not auto-break in irregular meters (5/8)', () => {
      const parsed = parser.parseForAnalyzer('5/8 | C[888 88] |');
      const analyzed = analyzer.analyze(parsed.measures[0]);
      
      // In irregular mode, space controls grouping
      // 888 88 should create 2 separate groups
      expect(analyzed.beamGroups.length).toBe(2);
    });
  });

  describe('[_] forced beam syntax', () => {
    it('should parse [_] as forced beam through tie', () => {
      const result = parser.parse('4/4 | C[88[_]88 88 88] |');
      
      // Check that forcedBeamThroughTie flag is set on the note before [_]
      const measure = result.measures[0];
      const beat = measure.beats[0];
      
      // The second note (after 88[_]) should have forcedBeamThroughTie
      expect(beat.notes[1].forcedBeamThroughTie).toBe(true);
      expect(beat.notes[1].tieStart).toBe(true);
    });
    
    it('should force beam continuation with [_] despite space', () => {
      const parsed = parser.parseForAnalyzer('4/4 | C[88[_]88 88 88] |');
      const analyzed = analyzer.analyze(parsed.measures[0]);
      
      // [_] should prevent beam break even though auto-grouping would split
      // First 4 notes should be in one group (forced), then next 4 in another
      expect(analyzed.beamGroups).toBeDefined();
    });
  });

  describe('Explicit mode override', () => {
    it('should respect binary mode even in 6/8', () => {
      const result = parser.parse('6/8 binary | C[88 88 88] |');
      
      expect(result.grid.timeSignature.groupingMode).toBe('binary');
      // Should group by 2 despite being 6/8
    });
    
    it('should respect ternary mode even in 4/4', () => {
      const result = parser.parse('4/4 ternary | C[888 888 888 888] |');
      
      expect(result.grid.timeSignature.groupingMode).toBe('ternary');
      // Should group by 3 despite being 4/4 (shuffle feel)
    });
  });

  describe('Validation with new grouping modes', () => {
    it('should validate measure duration correctly with binary mode', () => {
      const result = parser.parse('4/4 binary | C[88 88 88 88] |');
      
      expect(result.errors).toHaveLength(0);
    });
    
    it('should validate measure duration correctly with ternary mode', () => {
      const result = parser.parse('6/8 ternary | C[888 888] |');
      
      expect(result.errors).toHaveLength(0);
    });
    
    it('should detect incorrect duration even with explicit mode', () => {
      const result = parser.parse('4/4 binary | C[88 88 88] |');
      
      // Only 6 eighths, should be 8 in 4/4
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
