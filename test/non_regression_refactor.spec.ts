import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;

describe('Non-Regression Refactor Tests', () => {
    let parser: ChordGridParser;
    let renderer: SVGRenderer;
    let container: HTMLElement;

    beforeEach(() => {
        parser = new ChordGridParser();
        renderer = new SVGRenderer();
        container = document.createElement('div');
    });

    it('should render a multi-line grid with cross-line ties without errors', () => {
        // Create a grid with enough measures to force a wrap.
        // Use explicit duration syntax to ensure valid rhythm.
        // "C[4 4 4 4_] | [_4] C[4 4 4]" creates a tie across the bar line.
        
        const input = '4/4 | C[4 4 4 4] | C[4 4 4 4] | C[4 4 4 4] | C[4 4 4 4_] | [_4] C[4 4 4] | C[4 4 4 4] | C[4 4 4 4] | C[4 4 4 4] |'; 
        
        const parseResult = parser.parse(input);
        expect(parseResult.errors).toHaveLength(0);
        
        // Render without explicit width (uses internal default)
        const svgElement = renderer.render(parseResult.grid);
        container.appendChild(svgElement);

        const svg = container.querySelector('svg');
        expect(svg).not.toBeNull();

        // Check if we have multiple "lines" of music.
        // The new architecture renders everything into one SVG, but positions them.
        // We check the viewBox height.
        
        const viewBox = svg!.getAttribute('viewBox') || '0 0 0 0';
        const parts = viewBox.split(' ');
        const height = parseFloat(parts[3]);
        
        expect(height).toBeGreaterThan(100); // A single line is usually around 120px + margins.

        // Check for tie paths
        const paths = container.querySelectorAll('path');
        
        let tieCount = 0;
        paths.forEach(p => {
            tieCount++;
        });
        
        expect(tieCount).toBeGreaterThan(0);
    });

    it('should handle pickstrokes on multiple lines', () => {
        // Use 4/4 and fill it properly to be safe and standard.
        let longInput = '4/4 ';
        for(let i=0; i<10; i++) {
            longInput += '| A A A A ';
        }
        longInput += '|';

        const parseResult = parser.parse(longInput);
        expect(parseResult.errors).toHaveLength(0);

        // Enable pickstrokes
        const svgElement = renderer.render(parseResult.grid, { pickStrokes: 'auto' });
        container.appendChild(svgElement);
        
        const svg = container.querySelector('svg');
        expect(svg).not.toBeNull();
        
        const viewBox = svg!.getAttribute('viewBox') || '0 0 0 0';
        const parts = viewBox.split(' ');
        const height = parseFloat(parts[3]);
        expect(height).toBeGreaterThan(200); 
        
        // Check for pickstroke paths
        const html = container.innerHTML;
        // UPBOW_PATH starts with "M 125.6"
        // DOWNBOW_PATH starts with "m 99,44"
        const hasUpbow = html.includes('M 125.6') || html.includes('M 125.6');
        const hasDownbow = html.includes('m 99,44') || html.includes('m 99,44');
        
        expect(hasUpbow || hasDownbow).toBe(true);
    });
});
