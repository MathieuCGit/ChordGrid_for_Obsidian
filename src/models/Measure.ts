import { Measure as IMeasure, Beat as IBeat, BarlineType, ChordSegment } from '../parser/type';
import { Beat } from './Beat';

/**
 * @file Measure.ts
 * @description Representation of a musical measure.
 * 
 * A measure is a structural unit of music that contains a certain number
 * of beats according to the time signature. It is delimited by barlines
 * which can be single, double, or indicate repeats.
 * 
 * Properties:
 * - beats: Array of beats contained in the measure
 * - chord: Main chord of the measure (for compatibility)
 * - chordSegments: Multiple chord segments within the measure
 * - barline: Type of barline (single, double, repeat start/end)
 * - isLineBreak: Indicates if a line break should follow this measure
 * - source: Source text that generated this measure (for debugging)
 * 
 * @example
 * ```typescript
 * // 4/4 measure with four quarter notes on Am
 * const measure = new Measure({
 *   beats: [beat1, beat2, beat3, beat4],
 *   chord: "Am",
 *   barline: BarlineType.Single
 * });
 * ```
 */
export class Measure implements IMeasure {
  beats: IBeat[];
  chord: string;
  barline: BarlineType;
  isLineBreak: boolean;
  chordSegments: ChordSegment[];
  source?: string;

  /**
   * Constructor for a measure.
   * 
   * @param data - Partial data to initialize the measure
   */
  constructor(data: Partial<IMeasure> = {}) {
    this.beats = (data.beats || []).map(b => new Beat(b.notes, (b as any).chord)) as unknown as IBeat[];
    this.chord = data.chord || '';
    this.barline = data.barline || (BarlineType.Single as BarlineType);
    this.isLineBreak = Boolean((data as any).isLineBreak || (data as any).lineBreakAfter);
    this.chordSegments = data.chordSegments || [];
    this.source = data.source;
  }

  /**
   * Calculate the total duration of the measure in quarter-note units.
   * 
   * Sums the durations of all beats in the measure.
   * Useful to validate that the measure respects the time signature.
   * 
   * @returns Total duration in quarter-notes
   * 
   * @example
   * // 4/4 measure with 4 quarter notes = 4 quarter-notes
   * // 3/4 measure with 3 quarter notes = 3 quarter-notes
   * // 6/8 measure with 6 eighth notes = 3 quarter-notes
   */
  totalQuarterNotes(): number {
    return this.beats.reduce((s, b) => {
      const beat = b as Beat;
      if (typeof (beat as any).totalQuarterNotes === 'function') return s + (beat as any).totalQuarterNotes();
      // fallback
      return s;
    }, 0);
  }
}
