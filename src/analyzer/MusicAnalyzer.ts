/**
 * @file MusicAnalyzer.ts
 * @description Musical analysis layer for chord grids (v2.0.0 architecture)
 * 
 * This class sits between the parser and renderer, analyzing the parsed
 * musical structure to determine beam groups, handle cross-segment beaming,
 * and apply musical notation rules.
 * 
 * Key responsibilities:
 * - Analyze beam groups across entire measures (not just per-segment)
 * - Respect segment boundaries when leadingSpace=true
 * - Handle beamlets for isolated notes
 * - Apply musical notation rules (e.g., beamlet direction with dotted notes)
 * 
 * @example
 * ```typescript
 * const analyzer = new MusicAnalyzer();
 * const analyzed = analyzer.analyze(parsedMeasure);
 * // analyzed.beamGroups contains all beam groups for the measure
 * ```
 */

import { NoteValue } from '../parser/type';
import {
  ParsedMeasure,
  ParsedSegment,
  ParsedNote,
  AnalyzedMeasure,
  BeamGroup,
  NoteWithPosition,
  NoteReference
} from './analyzer-types';

// Optional DebugLogger - will be undefined in Node.js tests
let DebugLogger: any;
try {
  DebugLogger = require('../utils/DebugLogger').DebugLogger;
} catch (e) {
  // Running in Node.js test environment without DOM types
  DebugLogger = {
    log: () => {},
    warn: () => {},
    error: () => {}
  };
}

export class MusicAnalyzer {
  
  /**
   * Analyze a parsed measure and determine beam groups
   * 
   * This is the main entry point for musical analysis. It takes a measure
   * that has been syntactically parsed and adds musical semantic information.
   * 
   * @param measure - Parsed measure from ChordGridParser
   * @returns Analyzed measure with beam groups calculated
   */
  public analyze(measure: ParsedMeasure): AnalyzedMeasure {
    DebugLogger.log('🎼 MusicAnalyzer: Starting analysis', {
      segments: measure.segments.length
    });
    
    // 1. Flatten all notes with their positions
    const allNotes = this.flattenNotes(measure);
    
    DebugLogger.log('📋 Flattened notes', {
      totalNotes: allNotes.length,
      beamableCount: allNotes.filter(n => this.isBeamable(n)).length
    });
    
    // 2. Analyze beam groups
    const beamGroups = this.analyzeBeams(allNotes, measure);
    
    DebugLogger.log('✅ Analysis complete', {
      beamGroupsCreated: beamGroups.length
    });
    
    return {
      ...measure,
      beamGroups,
      allNotes
    };
  }
  
  /**
   * Flatten all notes from all segments into a single array with positions
   */
  private flattenNotes(measure: ParsedMeasure): NoteWithPosition[] {
    const allNotes: NoteWithPosition[] = [];
    let absoluteIndex = 0;
    
    measure.segments.forEach((segment, segmentIndex) => {
      segment.notes.forEach((note, noteIndexInSegment) => {
        allNotes.push({
          ...note,
          segmentIndex,
          noteIndexInSegment,
          absoluteIndex: absoluteIndex++
        });
      });
    });
    
    return allNotes;
  }
  
  /**
   * Analyze beam groups for the entire measure
   * 
   * This method groups beamable notes together, respecting:
   * - Segment boundaries with leadingSpace=true (break beams)
   * - Rests (always break beams)
   * - Musical notation rules
   */
  private analyzeBeams(
    allNotes: NoteWithPosition[],
    measure: ParsedMeasure
  ): BeamGroup[] {
    const beamGroups: BeamGroup[] = [];

    // 1) Collect indices of beamable notes (exclude rests)
    const beamableIdxs: number[] = [];
    for (let i = 0; i < allNotes.length; i++) {
      if (this.isBeamable(allNotes[i])) beamableIdxs.push(i);
    }
    if (beamableIdxs.length === 0) return beamGroups;

    // 2) Split into segments separated by hard breaks (beat boundary or segment leadingSpace)
    const segments: number[][] = [];
    let seg: number[] = [beamableIdxs[0]];
    for (let k = 1; k < beamableIdxs.length; k++) {
      const a = beamableIdxs[k - 1];
      const b = beamableIdxs[k];
      if (this.isHardBreakBetween(allNotes[a], allNotes[b], measure)) {
        segments.push(seg);
        seg = [b];
      } else {
        seg.push(b);
      }
    }
    if (seg.length) segments.push(seg);

    // 3) For each segment, compute block levels between adjacent notes (rests-in-between)
    for (const noteIndices of segments) {
      if (noteIndices.length === 0) continue;
      const blocks: number[] = []; // blockFromLevel between adjacency j and j+1 (1..4), Infinity if none
      for (let j = 0; j < noteIndices.length - 1; j++) {
        const aIdx = noteIndices[j];
        const bIdx = noteIndices[j + 1];
        const aAbs = allNotes[aIdx].absoluteIndex;
        const bAbs = allNotes[bIdx].absoluteIndex;
        let blockFromLevel = Infinity;
        // Scan between aAbs and bAbs for rests
        for (let t = aAbs + 1; t < bAbs; t++) {
          const mid = allNotes.find(n => n.absoluteIndex === t);
          if (mid && (mid as any).isRest) {
            const lv = this.getBeamLevel((mid as any).value);
            blockFromLevel = Math.min(blockFromLevel, lv);
          }
        }
        blocks.push(blockFromLevel);
      }
      this.createBeamGroupsForNotes(noteIndices, allNotes, beamGroups, blocks);
    }

    return beamGroups;
  }
  
  /**
   * Determine if beam should break at this position
   */
  private shouldBreakBeam(
    allNotes: NoteWithPosition[],
    index: number,
    measure: ParsedMeasure
  ): boolean {
    if (index >= allNotes.length - 1) return false;
    
    const current = allNotes[index];
    const next = allNotes[index + 1];
    
    // Break beam if we change beat within the same segment
    if (current.segmentIndex === next.segmentIndex) {
      const currentBeat = current.beatIndex ?? 0;
      const nextBeat = next.beatIndex ?? 0;
      
      if (nextBeat !== currentBeat) {
        DebugLogger.log('🔍 Beat boundary detected', {
          segment: current.segmentIndex,
          fromBeat: currentBeat,
          toBeat: nextBeat
        });
        return true;
      }
    }
    
    // Check if next note crosses to a new segment with leadingSpace
    if (next.segmentIndex > current.segmentIndex) {
      const nextSegment = measure.segments[next.segmentIndex];
      
      DebugLogger.log('🔍 Checking segment boundary', {
        fromSegment: current.segmentIndex,
        toSegment: next.segmentIndex,
        nextSegmentHasLeadingSpace: nextSegment.leadingSpace
      });
      
      return nextSegment.leadingSpace;
    }
    
    return false;
  }
  
  /**
   * Create beam groups for a collection of notes
   * 
   * This handles multiple beam levels (8th, 16th, 32nd, 64th)
   * and creates beamlets for isolated notes.
   */
  private createBeamGroupsForNotes(
    noteIndices: number[],
    allNotes: NoteWithPosition[],
    beamGroups: BeamGroup[],
    blocksBetween?: number[] // length = noteIndices.length - 1, values are blockFromLevel (1..4) or Infinity
  ): void {
    if (noteIndices.length === 0) return;
    
    // Determine max beam level needed
    const maxLevel = Math.max(
      ...noteIndices.map(i => this.getBeamLevel(allNotes[i].value))
    );
    
    DebugLogger.log('🎯 Creating beam groups', {
      noteCount: noteIndices.length,
      maxLevel
    });
    
    // For each beam level build contiguous sequences. Intermediate notes with lower level break higher-level beams.
    for (let level = 1; level <= maxLevel; level++) {
      let sequence: number[] = [];
      for (let gi = 0; gi < noteIndices.length; gi++) {
        const idx = noteIndices[gi];
        const noteLevel = this.getBeamLevel(allNotes[idx].value);
        const qualifies = noteLevel >= level;
        if (qualifies) {
          sequence.push(idx);
        }
        // Check barrier between this and next at this level
        const barrierBlocks = (blocksBetween && gi < noteIndices.length - 1)
          ? blocksBetween[gi]
          : Infinity;
        const cutByBarrier = gi < noteIndices.length - 1 && (level >= barrierBlocks);

        if (!qualifies || cutByBarrier || gi === noteIndices.length - 1) {
          // Flush sequence when we hit a non-qualifying note OR end of group
          if (sequence.length > 0) {
            if (level === 1) {
              // Level 1: connect entire contiguous sequence with one primary beam
              beamGroups.push({
                level,
                notes: sequence.map(i => ({
                  segmentIndex: allNotes[i].segmentIndex,
                  noteIndex: allNotes[i].noteIndexInSegment
                })),
                isPartial: false
              });
              DebugLogger.log(`  ═ Created primary beam level 1`, { notesConnected: sequence.length });
            } else {
              // Higher level: sequences of length >1 become full secondary beam; length==1 => beamlet
              if (sequence.length === 1) {
                const soloIdx = sequence[0];
                const direction = this.determineBeamletDirection(soloIdx, noteIndices, allNotes);
                beamGroups.push({
                  level,
                  notes: [{
                    segmentIndex: allNotes[soloIdx].segmentIndex,
                    noteIndex: allNotes[soloIdx].noteIndexInSegment
                  }],
                  isPartial: true,
                  direction
                });
                DebugLogger.log('  ✏️ Created secondary beamlet', { level, direction });
              } else {
                beamGroups.push({
                  level,
                  notes: sequence.map(i => ({
                    segmentIndex: allNotes[i].segmentIndex,
                    noteIndex: allNotes[i].noteIndexInSegment
                  })),
                  isPartial: false
                });
                DebugLogger.log(`  ═ Created secondary beam level ${level}`, { notesConnected: sequence.length });
              }
            }
            sequence = [];
          }
        }
      }
    }
  }

  private isHardBreakBetween(a: NoteWithPosition, b: NoteWithPosition, measure: ParsedMeasure): boolean {
    // Beat boundary
    if ((a.beatIndex ?? -1) !== (b.beatIndex ?? -1)) return true;
    // Segment boundary with leadingSpace
    if (b.segmentIndex > a.segmentIndex) {
      const nextSegment = measure.segments[b.segmentIndex];
      return !!nextSegment.leadingSpace;
    }
    return false;
  }
  
  /**
   * Determine beamlet direction based on musical notation rules
   * 
   * Rules:
   * - After dotted note: point LEFT (completes rhythmic group)
   * - Before dotted note: point RIGHT (starts rhythmic group)
   * - Default: point toward center of group
   */
  private determineBeamletDirection(
    noteIndex: number,
    groupIndices: number[],
    allNotes: NoteWithPosition[]
  ): 'left' | 'right' {
    const posInGroup = groupIndices.indexOf(noteIndex);
    
    // Check previous note in group
    if (posInGroup > 0) {
      const prevIdx = groupIndices[posInGroup - 1];
      const prevNote = allNotes[prevIdx];
      if (prevNote.dotted) {
        return 'left'; // After dotted note
      }
    }
    
    // Check next note in group
    if (posInGroup < groupIndices.length - 1) {
      const nextIdx = groupIndices[posInGroup + 1];
      const nextNote = allNotes[nextIdx];
      if (nextNote.dotted) {
        return 'right'; // Before dotted note
      }
    }
    
    // Default: point toward center of group
    const groupCenter = (groupIndices.length - 1) / 2;
    return posInGroup < groupCenter ? 'right' : 'left';
  }
  
  /**
   * Determine if a note can be beamed (8th note or shorter, not a rest)
   */
  private isBeamable(note: ParsedNote): boolean {
    return note.value >= 8 && !note.isRest;
  }
  
  /**
   * Get beam level for a note value
   * 
   * @returns 0=no beam, 1=8th, 2=16th, 3=32nd, 4=64th
   */
  private getBeamLevel(value: NoteValue): number {
    if (value >= 64) return 4;
    if (value >= 32) return 3;
    if (value >= 16) return 2;
    if (value >= 8) return 1;
    return 0;
  }
}
