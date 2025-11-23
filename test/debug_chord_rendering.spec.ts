import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer, RenderOptions } from '../src/renderer/SVGRenderer';

describe('Debug actual chord rendering issue', () => {
    test('Simulate Obsidian rendering with rhythm', () => {
        const source = `4/4 | C[4 4 4 4] | G[4 4 4 4] |`;
        
        const parser = new ChordGridParser();
        const result = parser.parse(source);
        
        console.log('Parse result:', {
            measures: result.measures.length,
            measure0: {
                chord: result.measures[0].chord,
                beats: result.measures[0].beats?.length,
                chordSegments: result.measures[0].chordSegments
            },
            measure1: {
                chord: result.measures[1].chord,
                beats: result.measures[1].beats?.length,
                chordSegments: result.measures[1].chordSegments
            }
        });
        
        const renderer = new SVGRenderer();
        const options: RenderOptions = {
            stemsDirection: result.stemsDirection,
            displayRepeatSymbol: result.displayRepeatSymbol,
            pickStrokes: result.picksMode,
            measuresPerLine: result.measuresPerLine
        };
        
        console.log('Render options:', options);
        
        const svg = renderer.render(result.grid, options);
        
        // Count ALL text elements
        const allTexts = Array.from(svg.querySelectorAll('text'));
        console.log(`\nAll text elements (${allTexts.length}):`);
        allTexts.forEach((t: any) => {
            console.log(`  - "${t.textContent}" class="${t.getAttribute('class')}" x=${t.getAttribute('x')}`);
        });
        
        // Count chord symbols specifically
        const chordSymbols = Array.from(svg.querySelectorAll('text.chord-symbol'));
        console.log(`\nChord symbols found: ${chordSymbols.length}`);
        
        // Count stems
        const stems = Array.from(svg.querySelectorAll('line[stroke-width="2"]'));
        console.log(`Stems found: ${stems.length}`);
        
        expect(chordSymbols.length).toBeGreaterThanOrEqual(2);
    });

    test('Check if PlaceAndSizeManager has stem metadata', () => {
        const source = `4/4 | C[4 4 4 4] | G[4 4 4 4] |`;
        
        const parser = new ChordGridParser();
        const result = parser.parse(source);
        const renderer = new SVGRenderer();
        const svg = renderer.render(result.grid);
        
        // Try to find any data attributes that might contain stem info
        const linesWithStroke2 = Array.from(svg.querySelectorAll('line[stroke-width="2"]'));
        console.log(`\nLines with stroke-width="2": ${linesWithStroke2.length}`);
        
        if (linesWithStroke2.length > 0) {
            const firstLine = linesWithStroke2[0] as any;
            console.log('First line attributes:');
            for (let i = 0; i < firstLine.attributes.length; i++) {
                const attr = firstLine.attributes[i];
                console.log(`  ${attr.name}="${attr.value}"`);
            }
        }
    });
});
