import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer, RenderOptions } from '../src/renderer/SVGRenderer';

const parser = new ChordGridParser();
const renderer = new SVGRenderer();

const input = `4/4 | C[4 4 4 4] | G[%] |`;
const result = parser.parse(input);

console.log('=== MEASURES ===');
result.measures.forEach((m, i) => {
    console.log(`Measure ${i}:`, {
        chord: m.chord,
        isRepeat: m.isRepeat,
        beats: m.beats.length,
        chordSegments: m.chordSegments?.map(s => ({
            chord: s.chord,
            beats: s.beats?.length
        }))
    });
});

const options: RenderOptions = { displayRepeatSymbol: true };
const svg = renderer.render(result.grid, options);

console.log('\n=== ALL TEXT ELEMENTS ===');
const allTexts = Array.from(svg.querySelectorAll('text'));
allTexts.forEach((t: any, i: number) => {
    console.log(`Text ${i}:`, {
        content: t.textContent,
        class: t.getAttribute('class'),
        'data-repeat-symbol': t.getAttribute('data-repeat-symbol'),
        x: t.getAttribute('x'),
        y: t.getAttribute('y')
    });
});

console.log('\n=== REPEAT SYMBOLS (data-repeat-symbol) ===');
const repeatSymbols = svg.querySelectorAll('[data-repeat-symbol]');
repeatSymbols.forEach((el: any, i: number) => {
    console.log(`RepeatSymbol ${i}:`, {
        tagName: el.tagName,
        hasPath: el.querySelector('path') ? 'YES' : 'NO',
        textContent: el.textContent
    });
});

console.log('\n=== CHORD TEXTS (C or G) ===');
const chordTexts = Array.from(svg.querySelectorAll('text')).filter((t: any) => 
    t.textContent === 'C' || t.textContent === 'G'
);
console.log(`Found ${chordTexts.length} chord texts:`, chordTexts.map((t: any) => ({
    content: t.textContent,
    class: t.getAttribute('class')
})));
