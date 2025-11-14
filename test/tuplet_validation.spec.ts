/**
 * Tests for tuplet rhythm validation
 */

import { ChordGridParser } from '../src/parser/ChordGridParser';

declare const describe: any;
declare const it: any;
declare const expect: any;

describe('Tuplet rhythm validation', () => {
  const parser = new ChordGridParser();

  it('validates 4 triplets in 4/4 measure correctly', () => {
    // 4 triplets of 3 eighth notes = 4 quarter notes total
    const source = '4/4 | C[{888}3 {888}3 {888}3 {888}3] |';
    const result = parser.parse(source);
    
    expect(result.errors).toHaveLength(0);
  });

  it('validates single triplet in 4/4 measure', () => {
    // 1 triplet of 3 eighth notes = 1 quarter note
    const source = '4/4 | C[{888}3 4 4 4] |';
    const result = parser.parse(source);
    
    expect(result.errors).toHaveLength(0);
  });

  it('validates quintolet correctly', () => {
    // 5 sixteenth notes in time of 4 = 1 quarter note
    const source = '4/4 | C[{1616161616}5 4 4 4] |';
    const result = parser.parse(source);
    
    expect(result.errors).toHaveLength(0);
  });

  it('detects incorrect measure with tuplet', () => {
    // 3 triplets = 3 quarter notes, but 4/4 expects 4
    const source = '4/4 | C[{888}3 {888}3 {888}3] |';
    const result = parser.parse(source);
    
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('expected 4 quarter-notes');
    expect(result.errors[0].message).toContain('found 3.000');
  });

  it('validates triplet of quarter notes', () => {
    // 3 quarter notes in time of 2 = half note (2 quarter notes)
    const source = '4/4 | C[{444}3 2] |';
    const result = parser.parse(source);
    
    expect(result.errors).toHaveLength(0);
  });

  it('validates sextuplet correctly', () => {
    // 6 eighth notes in time of 4 = half note
    const source = '4/4 | C[{888888}6 2] |';
    const result = parser.parse(source);
    
    expect(result.errors).toHaveLength(0);
  });

  it('validates triplet with rests', () => {
    // Triplet with rest still occupies 1 quarter note
    const source = '4/4 | C[{8-88}3 4 4 4] |';
    const result = parser.parse(source);
    
    expect(result.errors).toHaveLength(0);
  });

  it('validates 3/4 measure with 3 triplets', () => {
    const source = '3/4 | C[{888}3 {888}3 {888}3] |';
    const result = parser.parse(source);
    
    expect(result.errors).toHaveLength(0);
  });
});
