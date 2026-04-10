/**
 * Test to analyze the counting bug:
 * Input: count + 4/4 | D[4.]A[8_] [_4] D[4_] | [_8]A[8_] [_4] E[4 4] |
 * 
 * User reports: "J'ai un chiffre 7 sous la deuxième note au lieux d'un "&""
 * Expected: Should display "&" for eighth notes
 * Actual: Shows "7" instead
 */

import { ChordGridParser } from '../src/parser/ChordGridParser';
import { CountingAnalyzer } from '../src/analyzer/CountingAnalyzer';

declare const describe: any;
declare const it: any;
declare const expect: any;
declare const test: any;

describe('Counting Bug Analysis - Issue with 8th note subdivision display', () => {
  const parser = new ChordGridParser();

  it('should parse user reported case with counting enabled', () => {
    const input = `count  
4/4 | D[4.]A[8_] [_4] D[4_] | [_8]A[8_] [_4] E[4 4] |`;

    const result = parser.parse(input);

    console.log('=== PARSING RESULT ===');
    console.log(`Errors: ${result.errors.length}`);
    result.errors.forEach(e => console.log(`  - ${e.message}`));
    
    console.log(`Global time signature: ${result.grid.timeSignature.numerator}/${result.grid.timeSignature.denominator}`);
    console.log(`Counting mode enabled: ${result.countingMode}`);
    
    expect(result.countingMode).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should analyze counting annotations for each note in first measure', () => {
    const input = `count  
4/4 | D[4.]A[8_] [_4] D[4_] | [_8]A[8_] [_4] E[4 4] |`;

    let result = parser.parse(input);
    
    // Apply counting analysis
    CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
    
    const firstMeasure = result.measures[0];
    
    console.log('=== FIRST MEASURE SEGMENTS ===');
    console.log(`Number of chord segments: ${firstMeasure.chordSegments?.length || 0}`);
    
    firstMeasure.chordSegments?.forEach((seg, segIdx) => {
      console.log(`\n  Segment ${segIdx}: chord="${seg.chord}"`);
      console.log(`  Beats: ${seg.beats.length}`);
      
      seg.beats.forEach((beat, beatIdx) => {
        console.log(`    Beat ${beatIdx}: ${beat.notes.length} notes`);
        
        beat.notes.forEach((note, noteIdx) => {
          const countingInfo = (note as any).counting;
          console.log(`      Note ${noteIdx}:`);
          console.log(`        Value: ${note.value}${note.dotted ? '.' : ''}`);
          console.log(`        Tie: start=${note.tieStart}, end=${note.tieEnd}`);
          console.log(`        Counting: ${JSON.stringify(countingInfo)}`);
          
          // Check if counting label has unexpected value (the bug)
          if (countingInfo?.label === '7') {
            console.error(`        ❌ BUG DETECTED: countingLabel = "7" (expected "&" for eighth)`);
          } else if (countingInfo?.label === '&') {
            console.log(`        ✓ Correct: countingLabel = "&" for subdivision`);
          }
        });
      });
    });
  });

  it('should check what metric unit is used for 4/4 time signature', () => {
    const input = `count  
4/4 | D[4.]A[8_] [_4] D[4_] | [_8]A[8_] [_4] E[4 4] |`;

    const result = parser.parse(input);
    const ts = result.grid.timeSignature;
    
    console.log('=== TIME SIGNATURE ANALYSIS ===');
    console.log(`Numerator: ${ts.numerator}, Denominator: ${ts.denominator}`);
    console.log(`Beat unit: ${ts.beatUnit}, Beats per measure: ${ts.beatsPerMeasure}`);
    console.log(`Is regular meter: should be true`);
    console.log(`Expected metric unit: quarter note (value 4) for 4/4`);
    console.log(`Position in measure should count by quarters: 1, 2, 3, 4`);
    console.log(`Subdivisions within quarter: & for eighths, numbers for sixteenths`);
  });

  it('should trace through calculation for second note position', () => {
    const input = `count  
4/4 | D[4.]A[8_] [_4] D[4_] | [_8]A[8_] [_4] E[4 4] |`;

    const result = parser.parse(input);
    CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
    
    const firstMeasure = result.measures[0];
    const allNotes: any = [];
    
    // Flatten all notes to see their order
    firstMeasure.chordSegments?.forEach((seg, segIdx) => {
      seg.beats.forEach((beat, beatIdx) => {
        beat.notes.forEach((note, noteIdx) => {
          allNotes.push({
            segIdx, beatIdx, noteIdx,
            chord: seg.chord,
            value: note.value,
            dotted: note.dotted,
            tieStart: note.tieStart,
            tieEnd: note.tieEnd,
            counting: (note as any).counting
          });
        });
      });
    });
    
    console.log('=== ALL NOTES IN MEASURE 1 (flat) ===');
    allNotes.forEach((n: any, idx: any) => {
      console.log(`Note ${idx + 1}: Chord=${n.chord}, Value=${n.value}${n.dotted ? '.' : ''}`);
      console.log(`  Ties: start=${n.tieStart}, end=${n.tieEnd}`);
      console.log(`  Counting: ${JSON.stringify(n.counting)}`);
      
      // ISSUE: The 2nd note (8_) should be counted differently
      if (idx === 1) {
        console.log(`  >>> THIS IS THE "2ND NOTE" THE USER REPORTS AS SHOWING "7" <<<`);
        if (n.counting?.label === '7') {
          console.log(`  ❌ BUG CONFIRMED: Shows "7" instead of expected subdivision marker`);
        }
      }
    });
  });

});
