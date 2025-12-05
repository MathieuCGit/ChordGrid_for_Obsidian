import { ChordGridParser } from '../src/parser/ChordGridParser';
import { CountingAnalyzer } from '../src/analyzer/CountingAnalyzer';

describe('Counting Analyzer - Beat Structure Investigation', () => {
  let parser: ChordGridParser;

  beforeEach(() => {
    parser = new ChordGridParser();
  });

  it('should show how beats are structured for eighth notes', () => {
    const input = '4/4 | C[8 8 8 8 8 8 8 8] |';
    const result = parser.parse(input);
    
    console.log('\n=== Beat structure for: C[8 8 8 8 8 8 8 8] ===');
    console.log('Number of beats:', result.measures[0].beats.length);
    result.measures[0].beats.forEach((beat, idx) => {
      console.log(`Beat ${idx}: ${beat.notes.length} notes, values: ${beat.notes.map(n => n.value).join(',')}`);
    });
    
    CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
    
    console.log('\n=== After CountingAnalyzer ===');
    result.measures[0].beats.forEach((beat, idx) => {
      console.log(`Beat ${idx}:`, beat.notes.map(n => ({
        val: n.value,
        num: n.countingNumber,
        size: n.countingSize
      })));
    });
  });

  it('should show beat structure for beamed eighths', () => {
    const input = '4/4 | C[88 88 88 88] |';
    const result = parser.parse(input);
    
    console.log('\n=== Beat structure for: C[88 88 88 88] (beamed) ===');
    console.log('Number of beats:', result.measures[0].beats.length);
    result.measures[0].beats.forEach((beat, idx) => {
      console.log(`Beat ${idx}: ${beat.notes.length} notes, hasBeam: ${beat.hasBeam}`);
    });
    
    CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
    
    console.log('\n=== After CountingAnalyzer ===');
    result.measures[0].beats.forEach((beat, idx) => {
      console.log(`Beat ${idx}:`, beat.notes.map(n => ({
        val: n.value,
        num: n.countingNumber,
        size: n.countingSize
      })));
    });
  });

  it('should show beat structure for mixed notes', () => {
    const input = '4/4 | C[4 88 4] |';
    const result = parser.parse(input);
    
    console.log('\n=== Beat structure for: C[4 88 4] ===');
    console.log('Number of beats:', result.measures[0].beats.length);
    result.measures[0].beats.forEach((beat, idx) => {
      console.log(`Beat ${idx}: ${beat.notes.length} notes, values: ${beat.notes.map(n => n.value).join(',')}, hasBeam: ${beat.hasBeam}`);
    });
    
    CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
    
    console.log('\n=== After CountingAnalyzer ===');
    console.log('TimeSignature:', result.grid.timeSignature);
    result.measures[0].beats.forEach((beat, idx) => {
      console.log(`Beat ${idx}:`, beat.notes.map(n => ({
        val: n.value,
        num: n.countingNumber,
        size: n.countingSize
      })));
    });
  });

  it('should show beat structure for sixteenth notes', () => {
    const input = '4/4 | C[16 16 16 16] |';
    const result = parser.parse(input);
    
    console.log('\n=== Beat structure for: C[16 16 16 16] ===');
    console.log('Number of beats:', result.measures[0].beats.length);
    console.log('TimeSignature:', result.grid.timeSignature);
    
    CountingAnalyzer.analyzeCounting(result.measures, result.grid.timeSignature);
    
    console.log('\n=== After CountingAnalyzer ===');
    result.measures[0].beats.forEach((beat, idx) => {
      console.log(`Beat ${idx}:`, beat.notes.map(n => ({
        val: n.value,
        num: n.countingNumber,
        size: n.countingSize
      })));
    });
  });
});
