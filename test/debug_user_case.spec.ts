import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

describe('Debug user case with repeat symbols', () => {
    test('User input: 4/4 ||: C[4 88_4 4] | % | G[%] | % :||', () => {
        const source = `4/4 ||: C[4 88_4 4] | % | G[%] | % :||`;
        
        const parser = new ChordGridParser();
        const result = parser.parse(source);
        
        console.log('=== PARSE RESULT ===');
        console.log('Measures count:', result.measures.length);
        result.measures.forEach((m, i) => {
            console.log(`\nMeasure ${i}:`, {
                chord: m.chord,
                isRepeat: (m as any).isRepeat,
                beats: m.beats?.length,
                chordSegments: m.chordSegments?.map((s: any) => ({
                    chord: s.chord,
                    leadingSpace: s.leadingSpace,
                    beats: s.beats?.length
                }))
            });
        });
        
        const renderer = new SVGRenderer();
        const svg = renderer.render(result.grid, {
            stemsDirection: 'up',
            displayRepeatSymbol: false  // Test with false first
        });
        
        console.log('\n=== SVG RENDERING (displayRepeatSymbol: false) ===');
        const allTexts1 = Array.from(svg.querySelectorAll('text'));
        console.log(`All text elements: ${allTexts1.length}`);
        allTexts1.forEach((t: any) => {
            console.log(`  - "${t.textContent}" class="${t.getAttribute('class')}"`);
        });
        
        const chordSymbols1 = Array.from(svg.querySelectorAll('text.chord-symbol'));
        console.log(`Chord symbols: ${chordSymbols1.length}`);
        
        // Test with displayRepeatSymbol: true
        const svg2 = renderer.render(result.grid, {
            stemsDirection: 'up',
            displayRepeatSymbol: true
        });
        
        console.log('\n=== SVG RENDERING (displayRepeatSymbol: true) ===');
        const allTexts2 = Array.from(svg2.querySelectorAll('text'));
        console.log(`All text elements: ${allTexts2.length}`);
        allTexts2.forEach((t: any) => {
            console.log(`  - "${t.textContent}" class="${t.getAttribute('class')}"`);
        });
        
        const chordSymbols2 = Array.from(svg2.querySelectorAll('text.chord-symbol'));
        console.log(`Chord symbols: ${chordSymbols2.length}`);
        chordSymbols2.forEach((t: any) => {
            console.log(`  Chord "${t.textContent}" at x=${t.getAttribute('x')}, y=${t.getAttribute('y')}`);
        });
        
        // Check SVG viewBox
        const viewBox = svg2.getAttribute('viewBox');
        const width = svg2.getAttribute('width');
        const height = svg2.getAttribute('height');
        console.log(`SVG dimensions: width="${width}" height="${height}" viewBox="${viewBox}"`);
        
        const repeatSymbols = Array.from(svg2.querySelectorAll('[data-repeat-symbol]'));
        console.log(`Repeat symbols (% groups): ${repeatSymbols.length}`);
        
        // Save SVG to file for inspection
        const fs = require('fs');
        fs.writeFileSync('test_user_case.html', `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>ChordGrid Test</title>
    <style>
        body { margin: 20px; background: white; }
        svg { border: 2px solid #ccc; }
    </style>
</head>
<body>
    <h1>Test: 4/4 ||: C[4 88_4 4] | % | G[%] | % :||</h1>
    <h2>displayRepeatSymbol: false</h2>
    ${svg.outerHTML}
    <h2>displayRepeatSymbol: true</h2>
    ${svg2.outerHTML}
</body>
</html>
        `);
        console.log('\nSVG saved to: test_user_case.html');
    });
});
