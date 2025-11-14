/**
 * @file analyzer-types.ts
 * @description Type definitions for musical analysis phase (v2.0.0 architecture)
 * 
 * This file contains types used between the parser and renderer, representing
 * the analyzed musical structure after syntactic parsing but before rendering.
 */

import { NoteValue, NoteElement, BarlineType, TimeSignature } from '../parser/type';

/**
 * Reference to a specific note within a measure
 */
export interface NoteReference {
  segmentIndex: number;  // Which chord segment
  noteIndex: number;     // Index within that segment's flat note array
}

/**
 * A beam group representing notes that should be connected by beams
 * Can span multiple segments if leadingSpace=false
 */
export interface BeamGroup {
  level: number;              // 1=8th, 2=16th, 3=32nd, 4=64th
  notes: NoteReference[];     // Notes in this beam group
  isPartial: boolean;         // True for beamlets (single note)
  direction?: 'left' | 'right'; // For beamlets only
}

/**
 * Parsed note - raw from syntax, no musical analysis
 */
export interface ParsedNote {
  value: NoteValue;
  dotted: boolean;
  isRest: boolean;
  tieStart?: boolean;
  tieEnd?: boolean;
  tieToVoid?: boolean;
  tieFromVoid?: boolean;
  beatIndex?: number;  // Beat index within the segment (to break beams at beat boundaries)
  tuplet?: {
    count: number;
    groupId: string;
    position: 'start' | 'middle' | 'end';
  };
  hasLeadingSpace?: boolean;  // True if there was explicit whitespace before this note in tuplet syntax
  // No beam information here - that's for the analyzer
}

/**
 * Chord segment from parser
 */
export interface ParsedSegment {
  chord: string;
  notes: ParsedNote[];    // Flat array of all notes in this segment
  leadingSpace: boolean;  // Space before chord in source text
}

/**
 * Complete measure from parser (syntactic only)
 */
export interface ParsedMeasure {
  segments: ParsedSegment[];
    timeSignature?: TimeSignature;  // Optional time signature for this measure
  barline: BarlineType;
  isLineBreak: boolean;
  source: string;
}

/**
 * Note with its position in the measure's flat note array
 */
export interface NoteWithPosition extends ParsedNote {
  segmentIndex: number;
  noteIndexInSegment: number;
  absoluteIndex: number;  // Index in flattened array of all measure notes
}

/**
 * Analyzed measure with beam groups calculated
 */
export interface AnalyzedMeasure extends ParsedMeasure {
  beamGroups: BeamGroup[];        // All beam groups for this measure
  allNotes: NoteWithPosition[];   // Flat array of all notes with positions
}

/**
 * Result of parsing with validation errors
 */
export interface ParseResult {
  timeSignature: TimeSignature;
  measures: ParsedMeasure[];
  errors: Array<{
    measureIndex: number;
    message: string;
    expectedQuarterNotes?: number;
    foundQuarterNotes?: number;
  }>;
}

/**
 * Analyzed grid ready for rendering
 */
export interface AnalyzedGrid {
  timeSignature: TimeSignature;
  measures: AnalyzedMeasure[];
  errors: Array<{
    measureIndex: number;
    message: string;
    expectedQuarterNotes?: number;
    foundQuarterNotes?: number;
  }>;
}
