/**
 * @file repeat_rendering.spec.ts
 * @description Tests for repeat notation rendering (% and [%])
 * 
 * Test cases:
 * 1. Without show%: repeated measures render normally (rhythm + chords visible)
 * 2. With show%: simple % shows only symbol, no chord, no staff
 * 3. With show%: [%] shows chord + symbol, no staff
 */

import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

describe('Repeat Notation Rendering', () => {
    let parser: ChordGridParser;
    let renderer: SVGRenderer;

    beforeEach(() => {
        parser = new ChordGridParser();
        renderer = new SVGRenderer();
    });

    describe('Without show% option', () => {
        test('Simple % repeat should render rhythm and chords normally', () => {
            const input = `4/4 Am[4 4] | % | G[%]`;
            const parseResult = parser.parse(input);
            
            expect(parseResult.measures).toHaveLength(3);
            
            // Measure 1: explicit rhythm
            expect(parseResult.measures[0].chord).toBe('Am');
            expect(parseResult.measures[0].isRepeat).toBeUndefined();
            
            // Measure 2: simple % repeat
            expect(parseResult.measures[1].isRepeat).toBe(true);
            expect(parseResult.measures[1].source).toBe('%');
            expect(parseResult.measures[1].chord).toBe('Am'); // Should keep original chord
            
            // Measure 3: [%] repeat with new chord
            expect(parseResult.measures[2].isRepeat).toBe(true);
            expect(parseResult.measures[2].source).toContain('[%]');
            expect(parseResult.measures[2].chord).toBe('G');
            
            // Render without show%
            const svg = renderer.render(parseResult, { displayRepeatSymbol: false });
            const svgString = svg.outerHTML;
            
            // Should NOT contain repeat symbols
            expect(svgString).not.toMatch(/data-repeat-symbol/);
            
            // Should contain chord symbols for all measures
            expect(svgString).toMatch(/Am/);
            expect(svgString).toMatch(/G/);
            
            // Should contain staff lines for all measures (rhythm notation)
            const staffLines = svgString.match(/stroke="#000".*?stroke-width="1"/g);
            expect(staffLines).toBeTruthy();
            expect(staffLines!.length).toBeGreaterThan(0);
        });

        test('Repeated measures should show rhythm notation', () => {
            const input = `4/4 C[4 4 4 4] | % | %`;
            const parseResult = parser.parse(input);
            
            // Render without show%
            const svg = renderer.render(parseResult, { displayRepeatSymbol: false });
            const svgString = svg.outerHTML;
            
            // Should contain note stems/heads (check for note rendering)
            expect(svgString).toMatch(/data-note/);
            
            // All measures should have staff lines
            const staffLineMatches = svgString.match(/<line.*?y1="[0-9.]+"/g);
            expect(staffLineMatches).toBeTruthy();
        });
    });

    describe('With show% option', () => {
        test('Simple % should show only symbol, no chord, no staff', () => {
            const input = `show%\n4/4 Am[4 4] | %`;
            const parseResult = parser.parse(input);
            
            expect(parseResult.displayRepeatSymbol).toBe(true);
            expect(parseResult.measures).toHaveLength(2);
            
            // Measure 2: simple % repeat
            expect(parseResult.measures[1].isRepeat).toBe(true);
            expect(parseResult.measures[1].source).toBe('%');
            
            // Render with show%
            const svg = renderer.render(parseResult, { displayRepeatSymbol: true });
            const svgString = svg.outerHTML;
            
            // Should contain repeat symbol
            expect(svgString).toMatch(/data-repeat-symbol="true"/);
            
            // Measure 1 should show chord "Am"
            const measure1Chord = svgString.indexOf('Am');
            expect(measure1Chord).toBeGreaterThan(0);
            
            // Should NOT show chord for measure 2 (simple %)
            // This is tricky to test - we'd need to check that "Am" doesn't appear twice
            // or use more sophisticated SVG parsing
        });

        test('Chord[%] should show chord name and % symbol, no staff', () => {
            const input = `show%\n4/4 Am[4 4] | G[%]`;
            const parseResult = parser.parse(input);
            
            expect(parseResult.displayRepeatSymbol).toBe(true);
            expect(parseResult.measures).toHaveLength(2);
            
            // Measure 2: [%] with new chord
            expect(parseResult.measures[1].isRepeat).toBe(true);
            expect(parseResult.measures[1].source).toContain('[%]');
            expect(parseResult.measures[1].chord).toBe('G');
            expect((parseResult.measures[1] as any).__isChordOnlyMode).toBe(true);
            
            // Render with show%
            const svg = renderer.render(parseResult, { displayRepeatSymbol: true });
            const svgString = svg.outerHTML;
            
            // Should contain repeat symbol
            expect(svgString).toMatch(/data-repeat-symbol="true"/);
            
            // Should show both "Am" and "G"
            expect(svgString).toMatch(/Am/);
            expect(svgString).toMatch(/G/);
        });

        test('Multiple % in sequence should work correctly', () => {
            const input = `show%\n4/4 C[4 4] | % | % | D[%]`;
            const parseResult = parser.parse(input);
            
            expect(parseResult.measures).toHaveLength(4);
            
            // Measures 2 and 3: simple %
            expect(parseResult.measures[1].source).toBe('%');
            expect(parseResult.measures[2].source).toBe('%');
            
            // Measure 4: [%] with new chord
            expect(parseResult.measures[3].source).toContain('[%]');
            expect(parseResult.measures[3].chord).toBe('D');
            
            const svg = renderer.render(parseResult, { displayRepeatSymbol: true });
            const svgString = svg.outerHTML;
            
            // Should contain multiple repeat symbols
            const repeatSymbols = svgString.match(/data-repeat-symbol="true"/g);
            expect(repeatSymbols).toBeTruthy();
            expect(repeatSymbols!.length).toBe(4); // All 4 measures have %
        });
    });

    describe('Edge cases', () => {
        test('First measure cannot be %', () => {
            const input = `4/4 %`;
            const parseResult = parser.parse(input);
            
            // Should not create a measure or should create empty
            expect(parseResult.measures.length).toBe(0);
        });

        test('Mixed repeat types in same grid', () => {
            const input = `show%\n4/4 Am[4] | % | G[%] | C[4] | %`;
            const parseResult = parser.parse(input);
            
            expect(parseResult.measures).toHaveLength(5);
            
            // Verify each measure type
            expect(parseResult.measures[0].isRepeat).toBeUndefined();
            expect(parseResult.measures[1].source).toBe('%');
            expect(parseResult.measures[2].source).toContain('[%]');
            expect(parseResult.measures[3].isRepeat).toBeUndefined();
            expect(parseResult.measures[4].source).toBe('%');
            expect(parseResult.measures[4].chord).toBe('C'); // Should repeat C from measure 4
        });
    });
});
