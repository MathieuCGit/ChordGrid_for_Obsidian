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
 * - Auto-detect binary vs ternary grouping and break beams at beat boundaries
 * 
 * @example
 * ```typescript
 * const analyzer = new MusicAnalyzer();
 * const analyzed = analyzer.analyze(parsedMeasure);
 * // analyzed.beamGroups contains all beam groups for the measure
 * ```
 */

import { NoteValue, GroupingMode, TimeSignature } from '../parser/type';
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
   * Determine the actual grouping mode (resolve 'auto' to 'binary' or 'ternary')
   * 
   * Rules:
   * - noauto: user controls grouping via spaces (no auto-breaking)
   * - binary: group by 2 eighths (1.0 quarter)
   * - ternary: group by 3 eighths (1.5 quarters)
   * - auto: detect from time signature
   *   - denominator <= 4: binary (quarter-note based, group by 2)
   *   - denominator >= 8 with numerator in {3,6,9,12}: ternary (dotted-quarter based, group by 3)
   *   - else: irregular (space-based grouping, no auto-breaking)
   */
  private resolveGroupingMode(timeSignature: TimeSignature): 'binary' | 'ternary' | 'irregular' {
    // Handle explicit modes
    if (timeSignature.groupingMode === 'noauto') {
      return 'irregular';
    }
    if (timeSignature.groupingMode === 'binary') {
      return 'binary';
    }
    if (timeSignature.groupingMode === 'ternary') {
      return 'ternary';
    }
    
    // Auto-detection for 'auto' mode
    const { numerator, denominator } = timeSignature;
    
    if (denominator <= 4) {
      return 'binary';
    }
    
    if (denominator >= 8 && [3, 6, 9, 12].includes(numerator)) {
      return 'ternary';
    }
    
    // Irregular meters default to no auto-grouping
    return 'irregular';
  }
  
  /**
   * Calculate note duration in quarter-note units
   */
  private getNoteDuration(note: ParsedNote): number {
    let duration = 4 / note.value; // Convert to quarter-note units
    if (note.dotted) {
      duration *= 1.5;
    }
    
    // Handle tuplet ratio if present
    if (note.tuplet?.ratio) {
      const { numerator, denominator } = note.tuplet.ratio;
      duration *= (denominator / numerator);
    }
    
    return duration;
  }
  
  /**
   * Flatten all notes from all segments into a single array with positions and timing
   */
  private flattenNotes(measure: ParsedMeasure): NoteWithPosition[] {
    const allNotes: NoteWithPosition[] = [];
    let absoluteIndex = 0;
    let quarterPosition = 0; // Running quarter-note position
    
    measure.segments.forEach((segment, segmentIndex) => {
      segment.notes.forEach((note, noteIndexInSegment) => {
        const duration = this.getNoteDuration(note);
        
        allNotes.push({
          ...note,
          segmentIndex,
          noteIndexInSegment,
          absoluteIndex: absoluteIndex++,
          quarterStart: quarterPosition,
          quarterDuration: duration
        });
        
        quarterPosition += duration;
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

    DebugLogger.log('🎵 Analyzing beams', {
      totalBeamable: beamableIdxs.length,
      notes: beamableIdxs.map(idx => ({
        index: idx,
        segmentIndex: allNotes[idx].segmentIndex,
        value: allNotes[idx].value,
        absoluteIndex: allNotes[idx].absoluteIndex
      }))
    });

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

    DebugLogger.log('🎵 Beam segments after hard breaks', {
      segmentCount: segments.length,
      segments: segments.map(s => s.map(idx => allNotes[idx].absoluteIndex))
    });

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
        
        // Get the levels of the adjacent notes
        const aLevel = this.getBeamLevel(allNotes[aIdx].value);
        const bLevel = this.getBeamLevel(allNotes[bIdx].value);
        const notesLevel = Math.min(aLevel, bLevel);
        
        // Check if we're in a tuplet (special beam rules for rests in tuplets)
        const inTuplet = (allNotes[aIdx] as any).tuplet || (allNotes[bIdx] as any).tuplet;
        
  // Check if note b has hasLeadingSpace (space-induced break)
  const bNote = allNotes[bIdx];
  // Exception: If previous note forced beam through tie, ignore space break
  const aNote = allNotes[aIdx];
  if ((bNote as any).hasLeadingSpace && !(aNote as any).forcedBeamThroughTie) {
          // Find minimum beam level in the previous subgroup (notes before this one in the tuplet)
          // Look backward from current note to find the minimum level of the group
          let minGroupLevel = Infinity;
          for (let lookback = j; lookback >= 0; lookback--) {
            const prevNote = allNotes[noteIndices[lookback]];
            const prevLevel = this.getBeamLevel(prevNote.value);
            minGroupLevel = Math.min(minGroupLevel, prevLevel);
            
            // Stop at previous hasLeadingSpace boundary
            if (lookback < j && (prevNote as any).hasLeadingSpace) break;
          }
          
          // Block from max(minGroupLevel, 2) onwards
          // Rule: space separates beams at the minimum level and above, BUT never level 1
          // Example: if group has 8th notes (level 1), block from level 2+ (preserve level 1)
          // Example: if group has 16th notes (level 2), block from level 2+ (preserve level 1 only)
          // Example: if group has 32nd notes (level 3), block from level 3+ (preserve levels 1 and 2)
          if (minGroupLevel < Infinity) {
            blockFromLevel = Math.min(blockFromLevel, Math.max(minGroupLevel, 2));
          }
        }
        
        // Scan between aAbs and bAbs for rests
        for (let t = aAbs + 1; t < bAbs; t++) {
          const mid = allNotes.find(n => n.absoluteIndex === t);
          if (mid && (mid as any).isRest) {
            const restLevel = this.getBeamLevel((mid as any).value);
            
            if (inTuplet) {
              // In tuplets: beam behavior depends on whether there are explicit spaces
              // Check if both notes are in same tuplet group without space separation
              const aTuplet = (allNotes[aIdx] as any).tuplet;
              const bTuplet = (allNotes[bIdx] as any).tuplet;
              const sameTupletNoSpace = aTuplet && bTuplet && 
                                       aTuplet.groupId === bTuplet.groupId &&
                                       !(bNote as any).hasLeadingSpace;
              
              if (sameTupletNoSpace) {
                // Continuous tuplet notation (e.g., {8-88}3 without internal spaces)
                // Primary beam (level 1) should remain continuous despite rests
                // Only break higher levels based on rest value
                // Example: {8-88}3 → level 1 beam continuous, rest doesn't break it
                // Example: {16-1616}3 → level 1 continuous, level 2 may break at -16
                if (restLevel < notesLevel) {
                  // Rest is shorter: block from (notes level + 1)
                  blockFromLevel = Math.min(blockFromLevel, notesLevel + 1);
                } else {
                  // Rest at same level or longer: block from level 2 minimum (preserve level 1)
                  blockFromLevel = Math.min(blockFromLevel, Math.max(2, restLevel));
                }
              } else {
                // Spaced tuplet notation (e.g., {8 -8 8}3 with explicit spaces)
                // Original rule: rests at same level DO break that level
                if (restLevel < notesLevel) {
                  blockFromLevel = Math.min(blockFromLevel, notesLevel + 1);
                } else {
                  blockFromLevel = Math.min(blockFromLevel, restLevel);
                }
              }
            } else {
              // Outside tuplets: use original rule
              // Example: 16-816 → rest -8 blocks from level 2 (can decompose to two -16)
              if (restLevel === notesLevel - 1) {
                blockFromLevel = Math.min(blockFromLevel, notesLevel);
              } else {
                blockFromLevel = Math.min(blockFromLevel, restLevel);
              }
            }
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
     // Check if previous note has forced beam through tie ([_] syntax)
     // This takes absolute priority over all other rules
     if ((a as any).forcedBeamThroughTie) {
       DebugLogger.log('🔗 Forced beam through tie [_]', {
         fromNote: a.absoluteIndex,
         toNote: b.absoluteIndex
       });
       return false; // Don't break beam
     }
     
    // PRIORITY 1: Beat boundary within same segment (explicit space in syntax)
    // If notes are in different beats, they are separated by space = hard break
    // EXCEPTION: when both notes belong to the SAME tuplet group, we do NOT create a hard break here.
    //            Instead, we preserve the primary beam (level 1) and let higher-level beams
    //            be blocked via blocksBetween using hasLeadingSpace logic. This matches common
    //            engraving where tuplets keep a continuous primary beam even if spaced.
    if (a.segmentIndex === b.segmentIndex && (a.beatIndex ?? -1) !== (b.beatIndex ?? -1)) {
      const aTuplet = (a as any).tuplet;
      const bTuplet = (b as any).tuplet;
      if (aTuplet && bTuplet && aTuplet.groupId && aTuplet.groupId === bTuplet.groupId) {
        // Inside same tuplet group: do not hard-break; higher-level beam breaks handled later
        return false;
      }
      DebugLogger.log('🔍 Beat boundary within segment (space)', {
        fromBeat: a.beatIndex,
        toBeat: b.beatIndex,
        segment: a.segmentIndex
      });
      return true;
    }
    
    // PRIORITY 2: Auto-break at beat boundaries based on grouping mode
    // Only applies WITHIN the same beat (no explicit space)
    if (a.segmentIndex === b.segmentIndex && (a.beatIndex ?? -1) === (b.beatIndex ?? -1)) {
      // Do NOT auto-break within the same tuplet group; tuplets should keep primary beam continuity
      const aTuplet2 = (a as any).tuplet;
      const bTuplet2 = (b as any).tuplet;
      if (aTuplet2 && bTuplet2 && aTuplet2.groupId && aTuplet2.groupId === bTuplet2.groupId) {
        // Skip auto-breaks for tuplets; spacing-level breaks handled by blocksBetween
        return false;
      }
      if (measure.timeSignature) {
        const resolvedMode = this.resolveGroupingMode(measure.timeSignature);
        
        // Skip auto-breaking for irregular meters and noauto mode
        if (resolvedMode !== 'irregular' && a.quarterStart !== undefined && b.quarterStart !== undefined) {
          // Group size in quarter-note units:
          // - binary: 2 eighths = 1.0 quarters
          // - ternary: 3 eighths = 1.5 quarters
          const groupSize = resolvedMode === 'binary' ? 1.0 : 1.5;
          
          // Determine which beat group each note belongs to
          const aGroup = Math.floor(a.quarterStart / groupSize);
          const bGroup = Math.floor(b.quarterStart / groupSize);
          
          if (aGroup !== bGroup) {
            DebugLogger.log(`🎵 Auto-break at ${resolvedMode} boundary`, {
              aStart: a.quarterStart,
              bStart: b.quarterStart,
              groupSize,
              aGroup,
              bGroup
            });
            return true;
          }
        }
      }
    }
    
    // Segment boundary with leadingSpace
    if (b.segmentIndex > a.segmentIndex) {
      const nextSegment = measure.segments[b.segmentIndex];
      DebugLogger.log('🔍 Checking segment boundary', {
        fromSegment: a.segmentIndex,
        toSegment: b.segmentIndex,
        nextSegmentHasLeadingSpace: nextSegment.leadingSpace
      });
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
    const currentNote = allNotes[noteIndex];
    
    // Check if note is preceded by space (hasLeadingSpace) → point right
    if ((currentNote as any).hasLeadingSpace) {
      return 'right';
    }
    
    // Check if note is followed by space → point left
    if (posInGroup < groupIndices.length - 1) {
      const nextIdx = groupIndices[posInGroup + 1];
      const nextNote = allNotes[nextIdx];
      if ((nextNote as any).hasLeadingSpace) {
        return 'left';
      }
    }
    
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
