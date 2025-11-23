import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

describe('Debug chord rendering', () => {
    test('Chords should render WITH rhythm', () => {
        const parser = new ChordGridParser();
        const renderer = new SVGRenderer();

        console.log('=== TEST 1: With rhythm ===');
        const input1 = `4/4 | C[4 4 4 4] | G[4 4 4 4] |`;
        const result1 = parser.parse(input1);
        const svg1 = renderer.render(result1.grid);

        // Count chord symbols
        const chordTexts1 = Array.from(svg1.querySelectorAll('text.chord-symbol'));
        console.log(`Chord symbols found: ${chordTexts1.length}`);
        chordTexts1.forEach((t: any) => console.log(`  - "${t.textContent}" at x=${t.getAttribute('x')}`));

        // Check stems
        const stems1 = svg1.querySelectorAll('line[stroke-width="2"]');
        console.log(`Stems found: ${stems1.length}`);

        expect(chordTexts1.length).toBe(2); // C and G
    });

    test('Chords should render WITHOUT rhythm', () => {
        const parser = new ChordGridParser();
        const renderer = new SVGRenderer();

        console.log('\n=== TEST 2: Without rhythm ===');
        const input2 = `4/4 | C | G |`;
        const result2 = parser.parse(input2);
        const svg2 = renderer.render(result2.grid);

        const chordTexts2 = Array.from(svg2.querySelectorAll('text.chord-symbol'));
        console.log(`Chord symbols found: ${chordTexts2.length}`);
        chordTexts2.forEach((t: any) => console.log(`  - "${t.textContent}" at x=${t.getAttribute('x')}`));

        expect(chordTexts2.length).toBe(2); // C and G
    });
});
