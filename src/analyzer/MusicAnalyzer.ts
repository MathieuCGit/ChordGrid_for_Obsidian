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
    let currentGroup: number[] = []; // Indices into allNotes
    
    for (let i = 0; i < allNotes.length; i++) {
      const note = allNotes[i];
      const isBeamable = this.isBeamable(note);
      
      // Check if we should break beam BEFORE this note
      const shouldBreakBefore = i > 0 && this.shouldBreakBeam(allNotes, i - 1, measure);
      
      // End current group if we're breaking or hit non-beamable
      if (shouldBreakBefore || !isBeamable) {
        if (currentGroup.length > 0) {
          this.createBeamGroupsForNotes(currentGroup, allNotes, beamGroups);
          currentGroup = [];
        }
      }
      
      // Add beamable notes to current group
      if (isBeamable) {
        currentGroup.push(i);
      }
    }
    
    // Handle any remaining group
    if (currentGroup.length > 0) {
      this.createBeamGroupsForNotes(currentGroup, allNotes, beamGroups);
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
    beamGroups: BeamGroup[]
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
    
    // Create beam groups for each level
    for (let level = 1; level <= maxLevel; level++) {
      // Find notes that need this level of beam
      const notesAtLevel = noteIndices.filter(i => 
        this.getBeamLevel(allNotes[i].value) >= level
      );
      
      if (notesAtLevel.length === 0) continue;
      
      // For single notes, create beamlets
      if (notesAtLevel.length === 1) {
        const noteIdx = notesAtLevel[0];
        const direction = this.determineBeamletDirection(
          noteIdx,
          noteIndices,
          allNotes
        );
        
        beamGroups.push({
          level,
          notes: [{
            segmentIndex: allNotes[noteIdx].segmentIndex,
            noteIndex: allNotes[noteIdx].noteIndexInSegment
          }],
          isPartial: true,
          direction
        });
        
        DebugLogger.log('  ✏️ Created beamlet', { level, direction });
      } else {
        // Full beam connecting multiple notes
        beamGroups.push({
          level,
          notes: notesAtLevel.map(i => ({
            segmentIndex: allNotes[i].segmentIndex,
            noteIndex: allNotes[i].noteIndexInSegment
          })),
          isPartial: false
        });
        
        DebugLogger.log(`  ═ Created beam level ${level}`, {
          notesConnected: notesAtLevel.length
        });
      }
    }
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
