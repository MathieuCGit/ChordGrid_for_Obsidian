/**
 * @file CountingAnalyzer.ts
 * @description Analyzer for pedagogical beat counting with hybrid approach.
 * 
 * This analyzer assigns counting numbers and sizes to each note for pedagogical display:
 * - Counting restarts at 1 for each measure
 * - Numbering based on metric unit (noires in 4/4, croches in 5/8)
 * - First note of beat = (t) tall, except tieEnd = (s) small
 * - Subdivisions = (m) medium, using & for eighths or position numbers for smaller
 * 
 * Hybrid approach:
 * - Regular meters with equal beats → mathematical grouping (backward compatible)
 * - Irregular meters (5/8, 7/8) → user-defined beats (respects spaces)
 * - Regular meters with unequal beat durations → user-defined beats
 */

import { Measure, NoteElement, TimeSignature, Beat } from '../parser/type';

interface BeatInfo {
  notes: NoteElement[];
  startSubdivision: number;
  hasSmallestValue: number;
}

export class CountingAnalyzer {
  /**
   * Analyze and annotate all notes with counting information.
   * 
   * @param measures - All measures in the grid
   * @param timeSignature - Time signature (e.g., { beats: 4, beatValue: 4 })
   */
  public static analyzeCounting(measures: Measure[], timeSignature: TimeSignature): void {
    measures.forEach(measure => {
      this.analyzeMeasure(measure, timeSignature);
    });
  }

  /**
   * Analyze a single measure and assign counting to its notes.
   * Counting restarts at 1 for each measure.
   * 
   * @param measure - Measure to analyze
   * @param timeSignature - Time signature
   */
  private static analyzeMeasure(
    measure: Measure,
    timeSignature: TimeSignature
  ): void {
    const segments = measure.chordSegments || [];
    if (segments.length === 0) return;

    // Decide which approach to use: user-defined beats or mathematical grouping
    if (this.shouldUseUserDefinedBeats(measure, timeSignature)) {
      this.analyzeWithUserDefinedBeats(measure, timeSignature);
    } else {
      this.analyzeWithMathematicalBeats(measure, timeSignature);
    }
  }

  /**
   * Determine if we should use user-defined beats (spaces) or mathematical grouping.
   * 
   * @param measure - Measure to analyze
   * @param timeSignature - Time signature
   * @returns true if user-defined beats should be used
   */
  private static shouldUseUserDefinedBeats(
    measure: Measure,
    timeSignature: TimeSignature
  ): boolean {
    // Always use user-defined beats for irregular meters
    if (this.isIrregularMeter(timeSignature)) {
      return true;
    }

    // Check if beats have unequal durations
    return this.hasUnequalBeatDurations(measure, timeSignature);
  }

  /**
   * Check if time signature is irregular (not standard binary/ternary).
   * 
   * @param timeSignature - Time signature
   * @returns true if irregular (5/8, 7/8, 11/8, etc.)
   */
  private static isIrregularMeter(timeSignature: TimeSignature): boolean {
    const { numerator, denominator } = timeSignature;
    
    // Binary meters: denominators <= 4
    if (denominator <= 4) {
      return false; // Regular binary
    }
    
    // Ternary meters: denominators >= 8 with numerators 3, 6, 9, 12
    if (denominator >= 8 && [3, 6, 9, 12].includes(numerator)) {
      return false; // Regular ternary
    }
    
    // Everything else is irregular
    return true;
  }

  /**
   * Check if the measure has beats with unequal durations.
   * 
   * @param measure - Measure to analyze
   * @param timeSignature - Time signature
   * @returns true if beats have different durations
   */
  private static hasUnequalBeatDurations(
    measure: Measure,
    timeSignature: TimeSignature
  ): boolean {
    const segments = measure.chordSegments || [];
    const beatDurations: number[] = [];
    
    segments.forEach(segment => {
      segment.beats.forEach(beat => {
        const duration = this.calculateBeatDurationInSubdivisions(beat, timeSignature);
        beatDurations.push(duration);
      });
    });
    
    if (beatDurations.length <= 1) {
      return false;
    }
    
    // Check if all durations are equal (within tolerance)
    const firstDuration = beatDurations[0];
    const hasUnequal = beatDurations.some(d => Math.abs(d - firstDuration) > 0.01);
    
    return hasUnequal;
  }

  /**
   * Calculate beat duration in smallest subdivision units.
   * 
   * @param beat - Beat to measure
   * @param timeSignature - Time signature
   * @returns Duration in subdivision units
   */
  private static calculateBeatDurationInSubdivisions(
    beat: Beat,
    timeSignature: TimeSignature
  ): number {
    const subdivisionUnit = 16; // Use sixteenth notes as subdivision unit
    let totalDuration = 0;
    
    beat.notes.forEach(note => {
      let duration = subdivisionUnit / note.value;
      if (note.dotted) {
        duration *= 1.5;
      }
      totalDuration += duration;
    });
    
    return totalDuration;
  }

  /**
   * Analyze measure using user-defined beats (respects spaces).
   * Counts based on metric unit position (noires in 4/4, croches in 5/8).
   * 
   * @param measure - Measure to analyze
   * @param timeSignature - Time signature
   */
  private static analyzeWithUserDefinedBeats(
    measure: Measure,
    timeSignature: TimeSignature
  ): void {
    const segments = measure.chordSegments || [];
    const metricUnit = timeSignature.denominator; // 4 for 4/4, 8 for 5/8
    const subdivisionUnit = 16; // Use sixteenth notes for position calculation
    const subdivisionsPerMetricUnit = subdivisionUnit / metricUnit; // 4 for 4/4, 2 for 5/8
    
    let measureSubdivisionPosition = 0; // Absolute position in measure (in sixteenths)
    let currentMetricUnitSubdivisionStart = 0; // Start position of current metric unit
    
    segments.forEach(segment => {
      segment.beats.forEach(beat => {
        // Calculate smallest note value in this beat
        const smallestValue = Math.max(...beat.notes.map(n => n.value));
        const useAndNotation = smallestValue === 8 && beat.notes.every(n => n.value <= 8 && !n.isRest);
        
        beat.notes.forEach((note, noteIndex) => {
          const isFirstNoteOfBeat = noteIndex === 0;
          
          // Calculate which metric unit this note falls into
          const metricNumber = Math.floor(measureSubdivisionPosition / subdivisionsPerMetricUnit) + 1;
          
          // Check if this note starts on a metric unit boundary
          const isOnMetricBoundary = measureSubdivisionPosition % subdivisionsPerMetricUnit === 0;
          
          // Position within current metric unit
          const positionInMetricUnit = measureSubdivisionPosition - currentMetricUnitSubdivisionStart + 1;
          
          if (isOnMetricBoundary) {
            // On metric boundary: show metric number
            note.countingLabel = metricNumber.toString();
            note.countingSize = note.tieEnd ? 's' : 't'; // Always tall on metric boundary (unless tied)
            
            // Update the start of the current metric unit
            currentMetricUnitSubdivisionStart = measureSubdivisionPosition;
          } else {
            // Subdivision within metric unit
            if (useAndNotation && positionInMetricUnit === (subdivisionsPerMetricUnit / 2) + 1) {
              // Use & notation for eighth subdivisions (middle of metric unit)
              note.countingLabel = '&';
              note.countingSize = note.isRest ? 's' : 'm';
            } else {
              // Use position number within metric unit (1-indexed)
              note.countingLabel = positionInMetricUnit.toString();
              note.countingSize = note.isRest ? 's' : 'm'; // Subdivisions always medium
            }
          }
          
          // Calculate note duration in sixteenths
          let noteDuration = subdivisionUnit / note.value;
          if (note.dotted) {
            noteDuration *= 1.5;
          }
          
          measureSubdivisionPosition += noteDuration;
        });
      });
    });
  }

  /**
   * Analyze measure using mathematical beat grouping (backward compatible).
   * Groups notes into beats based on time signature.
   * 
   * @param measure - Measure to analyze
   * @param timeSignature - Time signature
   */
  private static analyzeWithMathematicalBeats(
    measure: Measure,
    timeSignature: TimeSignature
  ): void {
    const beats = this.groupNotesByBeats(measure, timeSignature);
    
    beats.forEach((beat, beatIndex) => {
      const beatNumber = beatIndex + 1;
      this.assignCountingToBeat(beat, beatNumber, timeSignature);
    });
  }

  /**
   * Group all notes in a measure by their beats.
   * 
   * @param measure - Measure to analyze
   * @param timeSignature - Time signature
   * @returns Array of beats, each containing notes and metadata
   */
  private static groupNotesByBeats(
    measure: Measure,
    timeSignature: TimeSignature
  ): BeatInfo[] {
    const segments = measure.chordSegments || [];
    const beats: BeatInfo[] = [];
    
    // Calculate subdivision unit (smallest note value globally)
    const subdivisionUnit = this.findSmallestNoteValue(measure);
    const subdivisionsPerBeat = subdivisionUnit / timeSignature.beatUnit;
    
    let currentSubdivision = 0;
    
    segments.forEach(segment => {
      segment.beats.forEach(beat => {
        beat.notes.forEach((note) => {
          // Check which beat this note belongs to
          const beatIndex = Math.floor(currentSubdivision / subdivisionsPerBeat);
          
          // Ensure we have a beat object for this index
          if (!beats[beatIndex]) {
            beats[beatIndex] = {
              notes: [],
              startSubdivision: beatIndex * subdivisionsPerBeat,
              hasSmallestValue: 4
            };
          }
          
          // Add note to the corresponding beat
          beats[beatIndex].notes.push(note);
          
          // Track smallest value in this beat
          if (note.value > beats[beatIndex].hasSmallestValue) {
            beats[beatIndex].hasSmallestValue = note.value;
          }
          
          // Advance subdivision position
          const noteSubdivisions = this.calculateNoteSubdivisions(note, timeSignature.beatUnit, subdivisionUnit);
          currentSubdivision += noteSubdivisions;
        });
      });
    });
    
    return beats;
  }

  /**
   * Assign counting labels to all notes in a beat.
   * 
   * @param beat - Beat information
   * @param beatNumber - Beat number (1, 2, 3, 4...)
   * @param timeSignature - Time signature
   */
  private static assignCountingToBeat(
    beat: BeatInfo,
    beatNumber: number,
    timeSignature: TimeSignature
  ): void {
    const smallestInBeat = beat.hasSmallestValue;
    
    // Determine counting mode for this beat
    let useAndNotation = false;
    let useNumericSubdivision = false;
    
    if (smallestInBeat <= 8 && smallestInBeat > 4) {
      // Only eighth notes (no sixteenth or smaller) → use & notation
      useAndNotation = true;
    } else if (smallestInBeat > 8) {
      // Sixteenth notes or smaller → use numeric subdivision (2, 3, 4)
      useNumericSubdivision = true;
    }
    
    // Assign labels
    let subdivisionCounter = 1;
    
    beat.notes.forEach((note, index) => {
      if (index === 0) {
        // First note of beat: always the beat number
        note.countingNumber = beatNumber;
        note.countingLabel = beatNumber.toString();
        note.countingSize = note.isRest ? 's' : 't';
      } else {
        // Subdivision
        if (useAndNotation) {
          note.countingLabel = '&';
          note.countingNumber = undefined; // Not a number
        } else if (useNumericSubdivision) {
          subdivisionCounter++;
          note.countingLabel = subdivisionCounter.toString();
          note.countingNumber = subdivisionCounter;
        } else {
          // No subdivision (quarter notes or longer)
          note.countingLabel = '';
          note.countingNumber = undefined;
        }
        
        note.countingSize = note.isRest ? 's' : 'm';
      }
    });
  }

  /**
   * Find the smallest note value in a measure.
   * 
   * @param measure - Measure to analyze
   * @returns Smallest note value (e.g., 8 for eighth notes, 16 for sixteenth notes)
   */
  private static findSmallestNoteValue(measure: Measure): number {
    let smallest = 4; // Default to quarter notes

    measure.chordSegments?.forEach(segment => {
      segment.beats.forEach(beat => {
        beat.notes.forEach(note => {
          if (note.value > smallest) {
            smallest = note.value;
          }
        });
      });
    });

    return smallest;
  }

  /**
   * Calculate how many subdivisions a note occupies.
   * 
   * @param note - Note element
   * @param beatValue - Beat value from time signature (denominator)
   * @param subdivisionUnit - Smallest note value in measure
   * @returns Number of subdivisions this note occupies
   * 
   * @example
   * // In 4/4 with 16th notes (subdivisionUnit=16):
   * // Quarter note (4): 16/4 = 4 subdivisions
   * // Eighth note (8): 16/8 = 2 subdivisions
   * // Sixteenth note (16): 16/16 = 1 subdivision
   */
  private static calculateNoteSubdivisions(
    note: NoteElement,
    beatValue: number,
    subdivisionUnit: number
  ): number {
    let subdivisions = subdivisionUnit / note.value;
    
    // Handle dotted notes (multiply by 1.5)
    if (note.dotted) {
      subdivisions *= 1.5;
    }
    
    return Math.round(subdivisions);
  }
}
