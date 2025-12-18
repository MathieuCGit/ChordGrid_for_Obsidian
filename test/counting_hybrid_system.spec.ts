/**
 * @file counting_hybrid_system.spec.ts
 * @description Tests for hybrid counting system (user-defined beats vs mathematical grouping)
 * 
 * Hybrid logic:
 * - Regular meters with equal beats → mathematical grouping (preserve existing behavior)
 * - Irregular meters (5/8, 7/8) → always use user-defined beats
 * - Regular meters with unequal beat durations → use user-defined beats
 * 
 * Counting rules:
 * - Numbering based on metric unit position (noires in 4/4, croches in 5/8)
 * - First note of beat = (t) tall, except tieEnd = (s) small
 * - Subdivisions = (m) medium, using & for eighths or position numbers for smaller
 */

import { ChordGridParser } from '../src/parser/ChordGridParser';
import { CountingAnalyzer } from '../src/analyzer/CountingAnalyzer';

describe('Hybrid Counting System', () => {
  let parser: ChordGridParser;

  beforeEach(() => {
    parser = new ChordGridParser();
  });

  describe('5/8 irregular meter - user-defined beats', () => {
    it('should count complex 5/8 with unequal beats: A[8.16 _8] C[8]D[8]', () => {
      const input = 'count\n5/8 | A[8.16 _8] C[8]D[8] |';
      const result = parser.parse(input);
      
      if (result.countingMode) {
        CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
      }
      
      const measure = result.measures[0];
      const allNotes: any[] = [];
      
      measure.chordSegments?.forEach(segment => {
        segment.beats.forEach(beat => {
          beat.notes.forEach(note => allNotes.push(note));
        });
      });
      
      expect(allNotes.length).toBe(5);
      
      // Beat 1: 8. (dotted eighth = 3 sixteenths)
      expect(allNotes[0].countingLabel).toBe('1');
      expect(allNotes[0].countingSize).toBe('t');
      
      // Beat 1: 16 (sixteenth at position 4 in beat)
      expect(allNotes[1].countingLabel).toBe('4');
      expect(allNotes[1].countingSize).toBe('m');
      
      // Beat 2: _8 (tied eighth = eighth #3, but tied)
      expect(allNotes[2].countingLabel).toBe('3');
      expect(allNotes[2].countingSize).toBe('s'); // tied = small like rest
      expect(allNotes[2].tieEnd).toBe(true);
      
      // Beat 3: C[8] (eighth #4)
      expect(allNotes[3].countingLabel).toBe('4');
      expect(allNotes[3].countingSize).toBe('t');
      
      // Beat 3: D[8] (eighth #5)
      expect(allNotes[4].countingLabel).toBe('5');
      expect(allNotes[4].countingSize).toBe('t');
    });
  });

  describe('4/4 regular meter with equal beats - mathematical grouping', () => {
    it('should preserve existing behavior for C[88 88 88 88]', () => {
      const input = 'count\n4/4 | C[88 88 88 88] |';
      const result = parser.parse(input);
      
      if (result.countingMode) {
        CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
      }
      
      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      
      expect(notes.length).toBe(8);
      
      // Should count as: 1 & 2 & 3 & 4 &
      expect(notes[0].countingLabel).toBe('1');
      expect(notes[0].countingSize).toBe('t');
      expect(notes[1].countingLabel).toBe('&');
      expect(notes[1].countingSize).toBe('m');
      
      expect(notes[2].countingLabel).toBe('2');
      expect(notes[2].countingSize).toBe('t');
      expect(notes[3].countingLabel).toBe('&');
      expect(notes[3].countingSize).toBe('m');
      
      expect(notes[4].countingLabel).toBe('3');
      expect(notes[4].countingSize).toBe('t');
      expect(notes[5].countingLabel).toBe('&');
      expect(notes[5].countingSize).toBe('m');
      
      expect(notes[6].countingLabel).toBe('4');
      expect(notes[6].countingSize).toBe('t');
      expect(notes[7].countingLabel).toBe('&');
      expect(notes[7].countingSize).toBe('m');
    });
  });

  describe('4/4 regular meter with unequal beats - user-defined beats', () => {
    it('should count irregular grouping: C[8. 168 8 4 4]', () => {
      const input = 'count\n4/4 | C[8. 168 8 4 4] |';
      const result = parser.parse(input);
      
      if (result.countingMode) {
        CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
      }
      
      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      
      expect(notes.length).toBe(6);
      
      // Beat 1: 8. (dotted eighth = quarter #1)
      expect(notes[0].countingLabel).toBe('1');
      expect(notes[0].countingSize).toBe('t');
      
      // Beat 2: 16 (sixteenth at position 4 in beat)
      expect(notes[1].countingLabel).toBe('4');
      expect(notes[1].countingSize).toBe('m');
      
      // Beat 3: 8 (eighth = quarter #2)
      expect(notes[2].countingLabel).toBe('2');
      expect(notes[2].countingSize).toBe('t');
      
      // Beat 4: 8 (eighth = subdivision of quarter #2)
      expect(notes[3].countingLabel).toBe('&');
      expect(notes[3].countingSize).toBe('m');
      
      // Beat 5: 4 (quarter #3)
      expect(notes[4].countingLabel).toBe('3');
      expect(notes[4].countingSize).toBe('t');
      
      // Beat 6: 4 (quarter #4)
      expect(notes[5].countingLabel).toBe('4');
      expect(notes[5].countingSize).toBe('t');
    });
  });
});
