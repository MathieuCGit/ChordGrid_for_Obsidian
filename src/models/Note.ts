import { NoteElement, NoteValue } from '../parser/type';

/**
 * @file Note.ts
 * @description Representation of a note or musical rest.
 * 
 * This class implements the `NoteElement` interface and represents an
 * individual note with all its rhythmic and tie properties.
 * 
 * Main properties:
 * - value: Rhythmic value (1=whole, 2=half, 4=quarter, 8=eighth, etc.)
 * - dotted: Indicates if the note is dotted (duration × 1.5)
 * - isRest: Indicates if this is a rest rather than a note
 * - tieStart/tieEnd: Marks the start/end of a tie
 * - tieToVoid/tieFromVoid: Ties to/from a virtual note (end/start of line)
 * - position/length: Position in source text (for debugging)
 * 
 * @example
 * ```typescript
 * // Dotted eighth note
 * const note = new Note({ value: 8, dotted: true, isRest: false });
 * 
 * // Rest (quarter rest)
 * const rest = new Note({ value: 4, isRest: true });
 * 
 * // Note with tie
 * const tiedNote = new Note({ value: 4, tieStart: true });
 * ```
 */
export class Note implements NoteElement {
  value: NoteValue;
  dotted: boolean;
  isRest: boolean;
  tieStart: boolean;
  tieEnd: boolean;
  tieToVoid: boolean;
  tieFromVoid: boolean;
  position?: number;
  length?: number;

  /**
   * Constructor for a note.
   * 
   * @param data - Partial data to initialize the note
   *               Default: value=4 (quarter), dotted=false, isRest=false
   */
  constructor(data: Partial<NoteElement> = {}) {
    this.value = (data.value ?? 4) as NoteValue;
    this.dotted = Boolean(data.dotted);
    this.isRest = Boolean(data.isRest);
    this.tieStart = Boolean(data.tieStart);
    this.tieEnd = Boolean(data.tieEnd);
    this.tieToVoid = Boolean(data.tieToVoid);
    this.tieFromVoid = Boolean(data.tieFromVoid);
    this.position = data.position;
    this.length = data.length;
  }

  /**
   * Calculate the note duration in quarter-note units.
   * 
   * Formula:
   * - Base duration = 4 / value (e.g., quarter=1, eighth=0.5, half=2)
   * - If dotted: duration × 1.5
   * 
   * @returns Duration in quarter-notes
   * 
   * @example
   * // Quarter note = 1 quarter-note
   * new Note({ value: 4 }).durationInQuarterNotes() // 1
   * 
   * // Eighth note = 0.5 quarter-note
   * new Note({ value: 8 }).durationInQuarterNotes() // 0.5
   * 
   * // Dotted quarter = 1.5 quarter-notes
   * new Note({ value: 4, dotted: true }).durationInQuarterNotes() // 1.5
   * 
   * // Half note = 2 quarter-notes
   * new Note({ value: 2 }).durationInQuarterNotes() // 2
   */
  durationInQuarterNotes(): number {
    const baseWhole = 1 / (this.value || 4);
    const dottedMultiplier = this.dotted ? 1.5 : 1;
    return baseWhole * dottedMultiplier * 4;
  }
}
