import { ChordGridParser } from '../src/parser/ChordGridParser';

describe('show% keyword parsing', () => {
  let parser: ChordGridParser;

  beforeEach(() => {
    parser = new ChordGridParser();
  });

  test('show% keyword is parsed and returned in result', () => {
    const input = `show%
4/4 | C[4 4 4 4] | % |`;
    const result = parser.parse(input);

    expect(result.displayRepeatSymbol).toBe(true);
    expect(result.measures).toHaveLength(2);
  });

  test('show% can be combined with stems-down', () => {
    const input = `stems-down show%
4/4 | C[8 8 8 8] | % |`;
    const result = parser.parse(input);

    expect(result.stemsDirection).toBe('down');
    expect(result.displayRepeatSymbol).toBe(true);
  });

  test('show% can come before stems-down', () => {
    const input = `show% stems-down
4/4 | C[8 8 8 8] | % |`;
    const result = parser.parse(input);

    expect(result.stemsDirection).toBe('down');
    expect(result.displayRepeatSymbol).toBe(true);
  });

  test('without show% keyword, displayRepeatSymbol is false', () => {
    const input = `4/4 | C[4 4 4 4] | % |`;
    const result = parser.parse(input);

    expect(result.displayRepeatSymbol).toBe(false);
  });

  test('show% is case insensitive', () => {
    const input = `SHOW%
4/4 | C[4 4 4 4] | % |`;
    const result = parser.parse(input);

    expect(result.displayRepeatSymbol).toBe(true);
  });

  test('show% on separate line with time signature on next line', () => {
    const input = `show%
4/4 | C[4 4 4 4] | % |`;
    const result = parser.parse(input);

    expect(result.displayRepeatSymbol).toBe(true);
    expect(result.grid.timeSignature.numerator).toBe(4);
    expect(result.grid.timeSignature.denominator).toBe(4);
  });
});
