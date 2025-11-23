import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer, RenderOptions } from '../src/renderer/SVGRenderer';

describe('Repeat symbol display option', () => {
  let parser: ChordGridParser;
  let renderer: SVGRenderer;

  beforeEach(() => {
    parser = new ChordGridParser();
    renderer = new SVGRenderer();
  });

  test('displayRepeatSymbol: false renders full rhythm (default)', () => {
    const input = `4/4 | C[4 4 4 4] | % |`;
    const result = parser.parse(input);
    
    const options: RenderOptions = { displayRepeatSymbol: false };
    const svg = renderer.render(result.grid, options);

    // Should render notes, not % symbol (check for data-repeat-symbol attribute)
    const repeatSymbol = svg.querySelector('[data-repeat-symbol]');
    expect(repeatSymbol).toBeNull();
    
    // Both measures should have full rhythm data
    expect(result.measures).toHaveLength(2);
    expect(result.measures[1].isRepeat).toBe(true);
    expect(result.measures[1].beats).toHaveLength(4); // Full rhythm cloned
  });

  test('displayRepeatSymbol: true renders % symbol for repeated measures', () => {
    const input = `4/4 | C[4 4 4 4] | % |`;
    const result = parser.parse(input);
    
    const options: RenderOptions = { displayRepeatSymbol: true };
    const svg = renderer.render(result.grid, options);

    // Should render % symbol (SVG path with data-repeat-symbol attribute)
    const repeatSymbol = svg.querySelector('[data-repeat-symbol]');
    expect(repeatSymbol).toBeTruthy();
    expect(repeatSymbol?.tagName).toBe('g');
    
    // Check that the group contains a path element
    const path = repeatSymbol?.querySelector('path');
    expect(path).toBeTruthy();
    expect(path?.getAttribute('fill')).toBe('#444');
  });

  test('displayRepeatSymbol: true still shows chord name', () => {
    const input = `4/4 | C[4 4 4 4] | G[%] |`;
    const result = parser.parse(input);
    
    const options: RenderOptions = { displayRepeatSymbol: true };
    const svg = renderer.render(result.grid, options);

    // DEBUG: Log all text elements
    const allTexts = Array.from(svg.querySelectorAll('text'));
    console.log('ALL TEXT ELEMENTS:', allTexts.map(t => ({
      content: t.textContent,
      class: t.getAttribute('class')
    })));

    // Should have both C and G chord labels
    const chordTexts = Array.from(svg.querySelectorAll('text')).filter(t => 
      t.textContent === 'C' || t.textContent === 'G'
    );
    console.log('CHORD TEXTS (C or G):', chordTexts.length, chordTexts.map(t => t.textContent));
    expect(chordTexts.length).toBe(2);
    
    // Should have % symbol (SVG path group)
    const repeatSymbol = svg.querySelector('[data-repeat-symbol]');
    console.log('REPEAT SYMBOL:', repeatSymbol?.tagName, 'hasPath:', repeatSymbol?.querySelector('path') ? 'YES' : 'NO');
    expect(repeatSymbol).toBeTruthy();
  });

  test('displayRepeatSymbol: true works with multiple repeats', () => {
    const input = `4/4 | C[4 4 4 4] | % | % | G[%] |`;
    const result = parser.parse(input);
    
    const options: RenderOptions = { displayRepeatSymbol: true };
    const svg = renderer.render(result.grid, options);

    // Should have 3 % symbols (3 groups with data-repeat-symbol)
    const repeatSymbols = svg.querySelectorAll('[data-repeat-symbol]');
    expect(repeatSymbols.length).toBe(3);
  });

  test('displayRepeatSymbol: only affects measures with isRepeat flag', () => {
    const input = `4/4 | C[4 4 4 4] | D[4 4 4 4] |`;
    const result = parser.parse(input);
    
    const options: RenderOptions = { displayRepeatSymbol: true };
    const svg = renderer.render(result.grid, options);

    // Should have NO % symbols
    const repeatSymbols = svg.querySelectorAll('[data-repeat-symbol]');
    expect(repeatSymbols.length).toBe(0);
    
    // Both measures are explicit (not repeats)
    expect(result.measures[0].isRepeat).toBeUndefined();
    expect(result.measures[1].isRepeat).toBeUndefined();
  });

  test('Backward compatibility: no options parameter still works', () => {
    const input = `4/4 | C[4 4 4 4] | % |`;
    const result = parser.parse(input);
    
    // Call without options (default behavior)
    const svg = renderer.render(result.grid);

    // Should render full rhythm by default (no repeat symbol)
    const repeatSymbols = svg.querySelectorAll('[data-repeat-symbol]');
    expect(repeatSymbols.length).toBe(0);
  });

  test('Backward compatibility: stemsDirection string still works', () => {
    const input = `4/4 | C[8 8 8 8] |`;
    const result = parser.parse(input);
    
    // Call with old API (stemsDirection as string)
    const svg = renderer.render(result.grid, 'down');

    expect(svg).toBeDefined();
    expect(svg.tagName).toBe('svg');
  });
});
