import { ChordGridParser } from '../src/parser/ChordGridParser';

declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;

describe('ChordGridParser - parsing examples', () => {
  let parser: ChordGridParser;

  beforeEach(() => {
    parser = new ChordGridParser();
  });

  it('should parse chord segments correctly', () => {
    const result = parser.parse('4/4 | Dm[4 4] G[88 88] |');
    expect(result.errors).toHaveLength(0);
    
    const m = result.grid.measures[0];
    expect(m.chordSegments).toHaveLength(2);
    expect(m.chordSegments[0].chord).toBe('Dm');
    expect(m.chordSegments[1].chord).toBe('G');
  });

  it('should parse simple 4/4 measure', () => {
    const result = parser.parse('4/4 | G[4 4 4 4] |');
    expect(result.errors).toHaveLength(0);
  });

  it('should parse repeat example from README', () => {
    const result = parser.parse('4/4 ||: Am[88 4 4 88] | Dm[2 4 4] | G[4 4 2] | C[1] :||');
    expect(result.errors).toHaveLength(0);
  });

  it('should parse cross-measure tie', () => {
    const result = parser.parse('4/4 | C[2 4_88_] | [_8] G[8 4 4 4] |');
    expect(result.errors).toHaveLength(0);
  });

  it('should detect invalid measure length', () => {
    const result = parser.parse('4/4 | C[4 4 4] |');
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('expected 4 quarter-notes');
  });
});

