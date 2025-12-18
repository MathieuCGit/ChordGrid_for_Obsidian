import { Beat as IBeat, NoteElement, BeamGroup } from '../parser/type';
import { Note } from './Note';

/**
 * @file Beat.ts
 * @description Representation of a beat (musical time unit) in a measure.
 * 
 * A beat is a musical time unit that contains one or more notes or rests.
 * Notes within the same beat can be connected by beams to indicate their
 * rhythmic grouping.
 * 
 * Properties:
 * - notes: Array of notes/rests in this beat
 * - hasBeam: Indicates if notes are connected by a beam
 * - beamGroups: Beam groups for the notes in this beat
 * - chord: Associated chord for this beat (optional)
 * 
 * @example
 * ```typescript
 * // Beat with two eighth notes connected by a beam
 * const beat = new Beat([
 *   { value: 8, dotted: false, isRest: false },
 *   { value: 8, dotted: false, isRest: false }
 * ], "Am");
 * ```
 */
export class Beat implements IBeat {
  notes: NoteElement[];
  hasBeam: boolean;
  beamGroups: BeamGroup[];
  chord?: string;

  /**
   * Constructor for a beat.
   * 
   * @param notes - Array of notes/rests for this beat
   * @param chord - Associated chord (optional)
   */
  constructor(notes: NoteElement[] = [], chord?: string) {
    this.notes = notes.map(n => new Note(n));
    this.hasBeam = false;
    this.beamGroups = [];
    this.chord = chord;
  }

  /**
   * Calculate the total duration of the beat in quarter-note units.
   * 
   * Iterates through all notes in the beat and sums their durations.
   * Takes dotted notes into account (multiplied by 1.5).
   * 
   * @returns Total duration in quarter-notes
   * 
   * @example
   * // Beat with one eighth note (1/2 quarter) and one dotted eighth (3/4 quarter)
   * // returns 1.25 quarter-notes
   */
  totalQuarterNotes(): number {
    return this.notes.reduce((sum, n) => {
      const note = n as Note;
      if (!note) return sum;
      // If a Note instance, use its helper, otherwise compute
      if (typeof (note as any).durationInQuarterNotes === 'function') {
        return sum + (note as any).durationInQuarterNotes();
      }
      const baseWhole = 1 / (note.value || 4);
      const dottedMultiplier = note.dotted ? 1.5 : 1;
      return sum + baseWhole * dottedMultiplier * 4;
    }, 0);
  }
}
