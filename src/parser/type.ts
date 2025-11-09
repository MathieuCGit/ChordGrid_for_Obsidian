export type NoteValue = 1 | 2 | 4 | 8 | 16 | 32 | 64;

export interface TieInfo {
  fromMeasure: number;
  fromBeat: number;
  fromNote: number;
  toMeasure: number;
  toBeat: number;
  toNote: number;
}

export interface NoteElement {
  value: NoteValue;
  dotted: boolean;
  isRest: boolean;
  tieStart: boolean;
  tieEnd: boolean;
  tieToVoid: boolean;
  tieFromVoid: boolean;
  // Pour les liaisons inter-mesures
  tieInfo?: TieInfo;
  // position and length are parser/runtime hints (optional)
  position?: number;
  length?: number;
}

export interface BeamGroup {
  startIndex: number;
  endIndex: number;
  noteCount: number;
}

export interface Beat {
  notes: NoteElement[];
  hasBeam: boolean;
  beamGroups: BeamGroup[];
  chord?: string;
}

export enum BarlineType {
  Single = '|',
  Double = '||',
  RepeatStart = '||:',
  RepeatEnd = ':||'
}

export interface ChordSegment {
  chord: string;
  beats: Beat[];
}

export interface Measure {
  beats: Beat[];
  chord: string;
  barline: BarlineType;
  lineBreakAfter: boolean;
  // multiple chord segments in a measure (optional)
  chordSegments?: ChordSegment[];
  // optional original source text for error reporting
  source?: string;
}

export interface TimeSignature {
  numerator: number;
  denominator: number;
  beatsPerMeasure: number;
  beatUnit: number;
}

export interface ChordGrid {
  timeSignature: TimeSignature;
  measures: Measure[];
  lines: Measure[][];
}

export interface ValidationError {
  measureIndex: number; // 0-based
  measureSource?: string;
  expectedQuarterNotes: number;
  foundQuarterNotes: number;
  message: string;
}

export interface ParseResult {
  grid: ChordGrid;
  errors: ValidationError[];
}