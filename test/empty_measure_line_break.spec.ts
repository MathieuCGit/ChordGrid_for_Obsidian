import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

describe('Empty Measure Line Break Bug', () => {
    let parser: ChordGridParser;
    let renderer: SVGRenderer;

    beforeEach(() => {
        parser = new ChordGridParser();
        renderer = new SVGRenderer();
    });

    test('should not create empty measure when line ends with | and next line starts with |', () => {
        const input = `4/4 | Em[4 88 4 88] | D[4 88 4 88] | C[4 88 4 88] | G[4 88 4 88] |
    | Am[4 88 4 88] | F[4 88 4 88] | G[4 88 4 88] | C[4 88 4 88] |`;

        const parseResult = parser.parse(input);
        expect(parseResult.errors).toHaveLength(0);
        
        // Should have exactly 8 measures, not 9
        expect(parseResult.measures).toHaveLength(8);
        
        // Verify that all measures contain chords
        parseResult.measures.forEach((measure, index) => {
            expect(measure.chord).toBeTruthy();
            expect(measure.chord.length).toBeGreaterThan(0);
        });

        // Verify the specific chords
        const chords = parseResult.measures.map(m => m.chord);
        
        expect(chords).toEqual(['Em', 'D', 'C', 'G', 'Am', 'F', 'G', 'C']);
    });

    test('should not create empty measure with multiple continuation lines', () => {
        const input = `4/4 | C[4 4 4 4] | D[4 4 4 4] | E[4 4 4 4] | F[4 4 4 4] |
    | G[4 4 4 4] | A[4 4 4 4] | B[4 4 4 4] | C[4 4 4 4] |
    | D[4 4 4 4] | E[4 4 4 4] | F[4 4 4 4] | G[4 4 4 4] |`;

        const parseResult = parser.parse(input);
        expect(parseResult.errors).toHaveLength(0);
        
        // Should have exactly 12 measures
        expect(parseResult.measures).toHaveLength(12);
        
        // Verify that no measure is empty
        parseResult.measures.forEach((measure, index) => {
            expect(measure.chord).toBeTruthy();
            expect(measure.chord.length).toBeGreaterThan(0);
        });
    });

    test('should handle normal empty measures (without line break)', () => {
        const input = `4/4 | C[4 4 4 4] | | D[4 4 4 4] |`;

        const parseResult = parser.parse(input);
        expect(parseResult.errors).toHaveLength(0);
        
        // Should have 3 measures with an empty measure in the middle
        expect(parseResult.measures).toHaveLength(3);
        expect(parseResult.measures[1].chord).toBe('');
    });
});
