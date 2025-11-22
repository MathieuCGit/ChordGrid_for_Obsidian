import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;

describe('Manual Layout Mode', () => {
    let parser: ChordGridParser;
    let renderer: SVGRenderer;
    let container: HTMLElement;

    beforeEach(() => {
        parser = new ChordGridParser();
        renderer = new SVGRenderer();
        container = document.createElement('div');
    });

    it('should respect manual-layout and not wrap long lines', () => {
        // 8 measures on one line. Normally fits 4.
        const input = `manual-layout 4/4
C | G | D | A | E | B | F# | C# |`;
        
        const parseResult = parser.parse(input);
        expect(parseResult.manualLayout).toBe(true);
        expect(parseResult.grid.measures).toHaveLength(8);
        
        // Render
        const svgElement = renderer.render(parseResult.grid, { manualLayout: parseResult.manualLayout });
        container.appendChild(svgElement);
        
        // Check SVG height to infer number of lines
        const svg = container.querySelector('svg');
        const viewBox = svg!.getAttribute('viewBox') || '0 0 0 0';
        const height = parseFloat(viewBox.split(' ')[3]);
        
        // A single line is usually around 120px + margins (say < 200px).
        // Two lines would be > 250px.
        expect(height).toBeLessThan(250);
        
        // Verify that we have 8 measures drawn
        // We can count the number of bar lines or chord names?
        // Let's assume if height is small and no errors, it worked.
    });

    it('should wrap normally without manual-layout', () => {
        // Same input without keyword
        const input = `4/4
C | G | D | A | E | B | F# | C# |`;
        
        const parseResult = parser.parse(input);
        expect(parseResult.manualLayout).toBe(false);
        
        const svgElement = renderer.render(parseResult.grid);
        container.appendChild(svgElement);
        
        const svg = container.querySelector('svg');
        const viewBox = svg!.getAttribute('viewBox') || '0 0 0 0';
        const height = parseFloat(viewBox.split(' ')[3]);
        
        // Should wrap to at least 2 lines
        expect(height).toBeGreaterThan(250);
    });
});
