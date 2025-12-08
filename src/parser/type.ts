/**
 * @file type.ts
 * @description Type definitions and interfaces for chord grid parsing and rendering.
 * 
 * This file centralizes all types used in the project:
 * - Note and rest types
 * - Beat and measure structures
 * - Beam and tie information
 * - Barline types
 * - Parse results and validation errors
 * 
 * These interfaces ensure consistency between parser and renderer.
 */

/**
 * Supported rhythmic values.
 * - 1 = whole note
 * - 2 = half note
 * - 4 = quarter note
 * - 8 = eighth note
 * - 16 = sixteenth note
 * - 32 = thirty-second note
 * - 64 = sixty-fourth note
 */
export type NoteValue = 1 | 2 | 4 | 8 | 16 | 32 | 64;

/**
 * Tie information between notes in different measures.
 */
export interface TieInfo {
  fromMeasure: number;
  fromBeat: number;
  fromNote: number;
  toMeasure: number;
  toBeat: number;
  toNote: number;
}

/**
 * Volta information (endings for repeats).
 * Voltas allow playing different measures depending on the repeat number.
 * 
 * Examples:
 * - |.1 : simple volta (first time)
 * - |.1-3 : volta range (times 1, 2, 3)
 * - |.1,2,3 : volta list (times 1, 2, 3)
 * 
 * The isClosed property determines the visual rendering:
 * - true : closed bracket with right hook ┌─1,2,3────┐ (before :||, loop back)
 * - false : open bracket without right hook ┌─4───── (after :||, continue)
 */
export interface VoltaInfo {
  /** Repeat numbers concerned (e.g., [1, 2, 3] or [4]) */
  numbers: number[];
  /** Displayed text (e.g., "1-3", "4", "1,2,3") */
  text: string;
  /** true if bracket closed (before :||), false if open (after :||) */
  isClosed: boolean;
}

/**
 * Note or rest element with all its rhythmic properties.
 * 
 * Base properties:
 * - value: rhythmic value (1, 2, 4, 8, 16, 32, 64)
 * - dotted: dotted note (duration × 1.5)
 * - isRest: rest rather than note
 * 
 * Tie properties:
 * - tieStart: beginning of a tie to the next note
 * - tieEnd: end of a tie from the previous note
 * - tieToVoid: tie to virtual note (end of line)
 * - tieFromVoid: tie from virtual note (beginning of line)
 * - tieInfo: detailed tie information between measures
 * 
 * Parse properties:
 * - position: position in source text
 * - length: length in source text
 */
export interface NoteElement {
  value: NoteValue;
  dotted: boolean;
  isRest: boolean;
  tieStart: boolean;
  tieEnd: boolean;
  tieToVoid: boolean;
  tieFromVoid: boolean;
  // For cross-measure ties
  tieInfo?: TieInfo;
  // parser/runtime hints (optional)
  position?: number;
  length?: number;
  /**
   * Tuplet information if the note belongs to a tuplet group.
   * - count: number of notes in the tuplet (e.g., 3 for triplet, 5 for quintuplet)
   * - groupId: unique identifier for the tuplet group
   * - position: 'start' | 'middle' | 'end' (facilitates bracket and beam rendering)
   * - ratio: explicit numerator:denominator ratio (e.g., {8 8 8}3:2 → {numerator: 3, denominator: 2})
   *          If not provided, the default or automatic ratio will be used
   * - explicitRatio: true if the ratio was explicitly written by the user (e.g., }3:2)
   *                  false if the ratio was calculated automatically (e.g., }3 → default 3:2)
   */
  tuplet?: {
    count: number;
    groupId: string;
    position: 'start' | 'middle' | 'end';
    ratio?: {
      numerator: number;
      denominator: number;
    };
    explicitRatio?: boolean;
  };
  /**
   * Flag indicating there was a lexical space before this note in the source text.
   * Used to break higher-level beams in tuplets.
   * E.g., {161616 161616}6 → space between groups breaks level 2 beam but keeps level 1
   */
  hasLeadingSpace?: boolean;
  /**
   * Flag indicating the tie should force beam continuation.
   * Activated with [_] syntax (e.g., 888[_]88 = tie + forced beam)
   * Allows overriding the normal "space breaks beam" rule for special cases.
   */
  forcedBeamThroughTie?: boolean;
  /**
   * Finger symbol for fingerstyle notation (optional, overrides pattern).
   * 
   * English notation:
   * - 't' or 'td' : thumb down
   * - 'tu' : thumb up
   * - 'h' or 'hd' : hand (fingers) down
   * - 'hu' : hand up
   * 
   * French notation:
   * - 'p' or 'pd' : pouce (thumb) down
   * - 'pu' : pouce up
   * - 'm' or 'md' : main (hand) down
   * - 'mu' : main up
   * 
   * Examples: 4t, 8pu, 16m, 32hu
   */
  fingerSymbol?: string;
  /**
   * Pick direction for pick-stroke notation (optional, overrides pattern).
   * - 'd' or 'down' : downstroke
   * - 'u' or 'up' : upstroke
   * 
   * Examples: 4d, 8u, 16d
   */
  pickDirection?: 'd' | 'u' | 'down' | 'up';
  /**
   * Counting number for pedagogical beat counting (optional).
   * Sequential number: 1, 2, 3, 4, 5, 6, 7, 8...
   */
  countingNumber?: number;
  /**
   * Counting label for pedagogical beat counting (optional).
   * Can be a number (1, 2, 3, 4), '&' for eighth note subdivisions, or empty string.
   */
  countingLabel?: string;
  /**
   * Size of the counting number for visual display (optional).
   * - 't' (Tall/bold) : beat starts
   * - 'm' (Medium) : subdivisions within beats
   * - 's' (Small) : rests
   */
  countingSize?: 't' | 'm' | 's';
}

/**
 * Group of notes connected by a beam.
 * 
 * Defines the start and end indices of notes to be visually connected.
 */
export interface BeamGroup {
  startIndex: number;
  endIndex: number;
  noteCount: number;
}

/**
 * Beat (time unit) containing one or more notes/rests.
 * 
 * A beat represents a time unit within a measure.
 * Notes within the same beat can be grouped by beams.
 */
export interface Beat {
  notes: NoteElement[];
  hasBeam: boolean;
  beamGroups: BeamGroup[];
  chord?: string;
}

/**
 * Barline types.
 * - Single (|) : single barline
 * - Double (||) : double barline (end of section)
 * - RepeatStart (||:) : repeat start
 * - RepeatEnd (:||) : repeat end
 */
export enum BarlineType {
  Single = '|',
  Double = '||',
  RepeatStart = '||:',
  RepeatEnd = ':||'
}

/**
 * Chord segment within a measure.
 * 
 * A measure can contain multiple chord changes.
 * Each segment represents a chord and its associated beats.
 */
export interface ChordSegment {
  chord: string;
  beats: Beat[];
  /** If true, there was a visible space before this segment in the source text */
  leadingSpace?: boolean;
}

/**
 * Complete musical measure.
 * 
 * Contains all beats in the measure, the main chord,
 * multiple chord segments, and the barline type.
 * 
 * Volta properties:
 * - voltaStart: Indicates the start of a volta (with numbers, text, open/closed type)
 * - voltaEnd: Indicates the end of a volta (associated with voltaStart of a previous measure)
 * 
 * Time signature:
 * - timeSignature: If present, indicates a time signature change for this measure
 */
export interface Measure {
  beats: Beat[];
  chord: string;
  barline: BarlineType;
  isLineBreak: boolean;
  chordSegments: ChordSegment[];
  source?: string;
  isRepeat?: boolean;  // true if this measure was created from % notation
  voltaStart?: VoltaInfo;  // Start of a volta bracket
  voltaEnd?: VoltaInfo;    // End of a volta bracket (same volta as voltaStart)
  timeSignature?: TimeSignature;  // Time signature change for this measure (if different from global)
}

/**
 * Grouping mode for note beaming.
 * - 'binary': group by 2 (binary time) - e.g., 88 88
 * - 'ternary': group by 3 (compound time) - e.g., 888 888
 * - 'noauto': no auto-grouping, user controls via spaces
 * - 'auto': automatic detection based on time signature
 */
export type GroupingMode = 'binary' | 'ternary' | 'noauto' | 'auto';

/**
 * Time signature.
 * 
 * Defines the number of beats per measure, note value per beat,
 * and beam grouping mode.
 * 
 * Examples:
 * - 4/4 = 4 quarter beats per measure (binary by default)
 * - 6/8 = 6 eighth notes per measure in 2 groups of 3 (ternary by default)
 * - Can be explicit: "4/4 binary" or "6/8 ternary"
 */
export interface TimeSignature {
  numerator: number;
  denominator: number;
  beatsPerMeasure: number;
  beatUnit: number;
  groupingMode: GroupingMode;
}

/**
 * Complete parsed chord grid.
 * 
 * Main structure returned by the parser, containing:
 * - The time signature
 * - All measures of the grid
 * - Measures grouped into lines for rendering
 */
export interface ChordGrid {
  timeSignature: TimeSignature;
  measures: Measure[];
  lines: Measure[][];
}

/**
 * Measure validation error.
 * 
 * Generated when the total duration of a measure doesn't match
 * the declared time signature.
 */
export interface ValidationError {
  measureIndex: number; // 0-based
  measureSource?: string;
  expectedQuarterNotes: number;
  foundQuarterNotes: number;
  message: string;
}

/**
 * Complete parse result of a chord grid.
 * 
 * Contains the parsed grid, any validation errors,
 * and the raw list of measures.
 */
export interface ParseResult {
  grid: ChordGrid;
  errors: ValidationError[];
  measures: Measure[];
  stemsDirection?: 'up' | 'down';
  displayRepeatSymbol?: boolean;
  /** Pick-stroke mode: true if enabled (replaces 'auto'|'8'|'16') */
  pickMode?: boolean;
  /** Fingerstyle mode with language: 'en' (default) or 'fr' */
  fingerMode?: 'en' | 'fr';
  measuresPerLine?: number;
  /** Measure numbering configuration */
  measureNumbering?: { startNumber: number, interval: number, enabled: boolean };
  /** Counting mode for pedagogical beat counting */
  countingMode?: boolean;
}