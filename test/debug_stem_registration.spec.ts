import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

describe('Debug stem registration', () => {
    test('Check if stems are registered in PlaceAndSizeManager', () => {
        const source = `4/4 | C[4 4 4 4] | G[8 8 8 8] |`;
        
        const parser = new ChordGridParser();
        const result = parser.parse(source);
        
        // Patch PlaceAndSizeManager to log registrations
        const originalRegister = (global as any).PlaceAndSizeManager?.prototype?.registerElement;
        let stemCount = 0;
        let lastStems: any[] = [];
        
        // We can't easily patch it, so let's just render and check the warnings
        const renderer = new SVGRenderer();
        const svg = renderer.render(result.grid);
        
        const chordSymbols = Array.from(svg.querySelectorAll('text.chord-symbol'));
        console.log(`\nChord symbols rendered: ${chordSymbols.length}`);
        chordSymbols.forEach((t: any) => {
            console.log(`  - "${t.textContent}" at x=${t.getAttribute('x')}, y=${t.getAttribute('y')}`);
        });
        
        // Count stems
        const stems = Array.from(svg.querySelectorAll('line[stroke-width="2"]'));
        console.log(`\nStems rendered: ${stems.length}`);
        
        // If we see warnings, stems are not found
        // If no warnings, stems are found
        
        expect(chordSymbols.length).toBe(2);
    });
});
