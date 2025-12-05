/**
 * @file CountingAnalyzer.ts
 * @description Analyzer for pedagogical beat counting.
 * 
 * This analyzer assigns counting numbers and sizes to each note for pedagogical display:
 * - Counting restarts at 1 for each measure
 * - Beat numbers are shown in tall (t) size
 * - Subdivisions use '&' for eighth notes or '2 3 4' for sixteenth notes and smaller
 * - Size 't' (Tall) for beat starts (notes only)
 * - Size 'm' (Medium) for subdivisions within beats (notes only)
 * - Size 's' (Small) for all rests (regardless of position)
 */

import { Measure, NoteElement, TimeSignature } from '../parser/type';

interface BeatInfo {
  notes: NoteElement[];
  startSubdivision: number;
  hasSmallestValue: number; // Smallest note value in this beat
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

    // Step 1: Group notes by beats
    const beats = this.groupNotesByBeats(measure, timeSignature);
    
    // Step 2: Assign counting labels to each beat
    beats.forEach((beat, beatIndex) => {
      const beatNumber = beatIndex + 1; // Beat numbers: 1, 2, 3, 4...
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
