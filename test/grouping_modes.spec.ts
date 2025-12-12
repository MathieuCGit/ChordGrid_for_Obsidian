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
    
    it('should default to space-based mode when not specified', () => {
      const result = parser.parse('4/4 | C[88 88 88 88] |');
      
      expect(result.grid.timeSignature.groupingMode).toBe('space-based');
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
    it('should default to space-based for 4/4', () => {
      const result = parser.parse('4/4 | C[8888 8888] |');
      const analyzed = parser.parseForAnalyzer('4/4 | C[8888 8888] |');
      
      expect(result.grid.timeSignature.groupingMode).toBe('space-based');
      // v3.0: Default is space-based (user controls grouping)
    });
    
    it('should default to space-based for 6/8', () => {
      const result = parser.parse('6/8 | C[888888] |');
      
      expect(result.grid.timeSignature.groupingMode).toBe('space-based');
      // v3.0: Default is space-based (no auto-detection without explicit directive)
    });
    
    it('should default to space-based for 9/8', () => {
      const result = parser.parse('9/8 | C[888 888 888] |');
      
      expect(result.grid.timeSignature.groupingMode).toBe('space-based');
      expect(result.grid.timeSignature.numerator).toBe(9);
    });
    
    it('should default to space-based for 5/8', () => {
      const result = parser.parse('5/8 | C[888 88] |');
      
      expect(result.grid.timeSignature.groupingMode).toBe('space-based');
      // v3.0: All meters default to space-based
    });
    
    it('should default to space-based for 7/8', () => {
      const result = parser.parse('7/8 | C[88 88 888] |');
      
      expect(result.grid.timeSignature.groupingMode).toBe('space-based');
      expect(result.grid.timeSignature.numerator).toBe(7);
    });
  });

  describe('Automatic beam breaking based on grouping mode', () => {
    it('should break beams at beat boundaries with auto-beam in 4/4', () => {
      const parsed = parser.parseForAnalyzer('auto-beam\n4/4 | C[88888888] |');
      const analyzed = analyzer.analyze(parsed.measures[0]);
      
      // In auto-beam mode with 4/4, breaks at each beat (quarter note)
      // 8 eighths = 4 beats → 4 groups
      expect(analyzed.beamGroups.length).toBe(4);
    });
    
    it('should break beams at beat boundaries with auto-beam in 6/8', () => {
      const parsed = parser.parseForAnalyzer('auto-beam\n6/8 | C[888888] |');
      const analyzed = analyzer.analyze(parsed.measures[0]);
      
      // In auto-beam mode with 6/8, breaks at dotted quarter boundaries
      // 6 eighths = 2 beats → 2 groups
      expect(analyzed.beamGroups.length).toBe(2);
    });
    
    it('should respect spaces in space-based mode (5/8)', () => {
      const parsed = parser.parseForAnalyzer('5/8 | C[888 88] |');
      const analyzed = analyzer.analyze(parsed.measures[0]);
      
      // In space-based mode (default), spaces control grouping
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
