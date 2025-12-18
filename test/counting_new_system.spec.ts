/**
 * @file counting_new_system.spec.ts
 * @description Tests for the new hierarchical counting system
 * 
 * New counting system logic:
 * - Counting restarts at 1 for each measure
 * - Beat numbers: 1, 2, 3, 4 (based on time signature)
 * - Eighth note subdivisions: use '&' symbol (1 & 2 & 3 & 4 &)
 * - Sixteenth note subdivisions: use numeric (1234 2234 3234 4234)
 * - Rests always use size 's' regardless of position
 * - Notes use size 't' for beat starts, 'm' for subdivisions
 */

import { ChordGridParser } from '../src/parser/ChordGridParser';
import { CountingAnalyzer } from '../src/analyzer/CountingAnalyzer';

describe('New Counting System - Hierarchical Beat Counting', () => {
  let parser: ChordGridParser;

  beforeEach(() => {
    parser = new ChordGridParser();
  });

  describe('Quarter notes (4/4 with quarter notes)', () => {
    it('should count 1 2 3 4 with all size t', () => {
      const input = 'count\n4/4 | C[4 4 4 4] |';
      const result = parser.parse(input);
      
      if (result.countingMode) {
        CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
      }
      
      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      
      // Check labels and sizes
      expect(notes[0].countingLabel).toBe('1');
      expect(notes[0].countingSize).toBe('t');
      
      expect(notes[1].countingLabel).toBe('2');
      expect(notes[1].countingSize).toBe('t');
      
      expect(notes[2].countingLabel).toBe('3');
      expect(notes[2].countingSize).toBe('t');
      
      expect(notes[3].countingLabel).toBe('4');
      expect(notes[3].countingSize).toBe('t');
    });
  });

  describe('Eighth notes (4/4 with eighth notes)', () => {
    it('should count 1 & 2 & 3 & 4 & with alternating t/m sizes', () => {
      const input = 'count\n4/4 | C[88 88 88 88] |';
      const result = parser.parse(input);
      
      if (result.countingMode) {
        CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
      }
      
      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      
      expect(notes.length).toBe(8);
      
      // Beat 1: 1 &
      expect(notes[0].countingLabel).toBe('1');
      expect(notes[0].countingSize).toBe('t');
      expect(notes[1].countingLabel).toBe('&');
      expect(notes[1].countingSize).toBe('m');
      
      // Beat 2: 2 &
      expect(notes[2].countingLabel).toBe('2');
      expect(notes[2].countingSize).toBe('t');
      expect(notes[3].countingLabel).toBe('&');
      expect(notes[3].countingSize).toBe('m');
      
      // Beat 3: 3 &
      expect(notes[4].countingLabel).toBe('3');
      expect(notes[4].countingSize).toBe('t');
      expect(notes[5].countingLabel).toBe('&');
      expect(notes[5].countingSize).toBe('m');
      
      // Beat 4: 4 &
      expect(notes[6].countingLabel).toBe('4');
      expect(notes[6].countingSize).toBe('t');
      expect(notes[7].countingLabel).toBe('&');
      expect(notes[7].countingSize).toBe('m');
    });
  });

  describe('Sixteenth notes (4/4 with sixteenth notes)', () => {
    it('should count 1234 2234 3234 4234 with first of each beat as t', () => {
      const input = 'count\n4/4 | C[16161616 16161616 16161616 16161616] |';
      const result = parser.parse(input);
      
      if (result.countingMode) {
        CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
      }
      
      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      
      expect(notes.length).toBe(16);
      
      // Beat 1: 1234
      expect(notes[0].countingLabel).toBe('1');
      expect(notes[0].countingSize).toBe('t');
      expect(notes[1].countingLabel).toBe('2');
      expect(notes[1].countingSize).toBe('m');
      expect(notes[2].countingLabel).toBe('3');
      expect(notes[2].countingSize).toBe('m');
      expect(notes[3].countingLabel).toBe('4');
      expect(notes[3].countingSize).toBe('m');
      
      // Beat 2: 2234
      expect(notes[4].countingLabel).toBe('2');
      expect(notes[4].countingSize).toBe('t');
      expect(notes[5].countingLabel).toBe('2');
      expect(notes[5].countingSize).toBe('m');
      expect(notes[6].countingLabel).toBe('3');
      expect(notes[6].countingSize).toBe('m');
      expect(notes[7].countingLabel).toBe('4');
      expect(notes[7].countingSize).toBe('m');
      
      // Beat 3: 3234
      expect(notes[8].countingLabel).toBe('3');
      expect(notes[8].countingSize).toBe('t');
      expect(notes[9].countingLabel).toBe('2');
      expect(notes[9].countingSize).toBe('m');
      expect(notes[10].countingLabel).toBe('3');
      expect(notes[10].countingSize).toBe('m');
      expect(notes[11].countingLabel).toBe('4');
      expect(notes[11].countingSize).toBe('m');
      
      // Beat 4: 4234
      expect(notes[12].countingLabel).toBe('4');
      expect(notes[12].countingSize).toBe('t');
      expect(notes[13].countingLabel).toBe('2');
      expect(notes[13].countingSize).toBe('m');
      expect(notes[14].countingLabel).toBe('3');
      expect(notes[14].countingSize).toBe('m');
      expect(notes[15].countingLabel).toBe('4');
      expect(notes[15].countingSize).toBe('m');
    });
  });

  describe('Mixed rhythms', () => {
    it('should handle quarter note then eighth notes (4 88 pattern)', () => {
      const input = 'count\n4/4 | C[4 88 88] |';
      const result = parser.parse(input);
      
      if (result.countingMode) {
        CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
      }
      
      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      
      // Beat 1: 1 (quarter)
      expect(notes[0].countingLabel).toBe('1');
      expect(notes[0].countingSize).toBe('t');
      
      // Beat 2: 2 & (eighth notes)
      expect(notes[1].countingLabel).toBe('2');
      expect(notes[1].countingSize).toBe('t');
      expect(notes[2].countingLabel).toBe('&');
      expect(notes[2].countingSize).toBe('m');
      
      // Beat 3: 3 & (eighth notes)
      expect(notes[3].countingLabel).toBe('3');
      expect(notes[3].countingSize).toBe('t');
      expect(notes[4].countingLabel).toBe('&');
      expect(notes[4].countingSize).toBe('m');
    });

    it('should handle eighth note then rest (8-8 pattern)', () => {
      const input = 'count\n4/4 | C[8-8 8-8] |';
      const result = parser.parse(input);
      
      if (result.countingMode) {
        CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
      }
      
      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      
      // Beat 1: 1 (eighth note) then rest
      expect(notes[0].countingLabel).toBe('1');
      expect(notes[0].countingSize).toBe('t');
      expect(notes[0].isRest).toBe(false);
      
      expect(notes[1].countingLabel).toBe('&');
      expect(notes[1].countingSize).toBe('s'); // Rest always 's'
      expect(notes[1].isRest).toBe(true);
      
      // Beat 2: 2 (eighth note) then rest
      expect(notes[2].countingLabel).toBe('2');
      expect(notes[2].countingSize).toBe('t');
      expect(notes[2].isRest).toBe(false);
      
      expect(notes[3].countingLabel).toBe('&');
      expect(notes[3].countingSize).toBe('s'); // Rest always 's'
      expect(notes[3].isRest).toBe(true);
    });
  });

  describe('Multiple measures', () => {
    it('should restart counting at 1 for each measure', () => {
      const input = 'count\n4/4 | C[4 4 4 4] | G[4 4 4 4] |';
      const result = parser.parse(input);
      
      if (result.countingMode) {
        CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
      }
      
      // Measure 1
      const notes1 = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      expect(notes1[0].countingLabel).toBe('1');
      expect(notes1[1].countingLabel).toBe('2');
      expect(notes1[2].countingLabel).toBe('3');
      expect(notes1[3].countingLabel).toBe('4');
      
      // Measure 2 - should restart at 1
      const notes2 = result.measures[1].chordSegments![0].beats.flatMap(b => b.notes);
      expect(notes2[0].countingLabel).toBe('1');
      expect(notes2[1].countingLabel).toBe('2');
      expect(notes2[2].countingLabel).toBe('3');
      expect(notes2[3].countingLabel).toBe('4');
    });
  });

  describe('Rests always size s', () => {
    it('should use size s for rest at beat start', () => {
      const input = 'count\n4/4 | C[-4 4 4 4] |';
      const result = parser.parse(input);
      
      if (result.countingMode) {
        CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
      }
      
      const notes = result.measures[0].chordSegments![0].beats.flatMap(b => b.notes);
      
      // First note is a rest at beat 1 - should be 's' not 't'
      expect(notes[0].isRest).toBe(true);
      expect(notes[0].countingLabel).toBe('1');
      expect(notes[0].countingSize).toBe('s');
      
      // Second note is a note at beat 2 - should be 't'
      expect(notes[1].isRest).toBe(false);
      expect(notes[1].countingLabel).toBe('2');
      expect(notes[1].countingSize).toBe('t');
    });
  });
});
