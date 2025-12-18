/**
 * Visual test for time signature display in rendered SVG
 */

import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';
import * as fs from 'fs';

describe('Time Signature Display - Visual Test', () => {
    const parser = new ChordGridParser();
    const renderer = new SVGRenderer();

    test('should render time signature changes in SVG', () => {
        const input = '4/4 | Am[4 4 4 4] | 3/4 D[4 4 4] | 2/4 G[2] |';
        const parsed = parser.parse(input);
        const svg = renderer.render(parsed.grid);

        // Check that SVG was created
        expect(svg).toBeTruthy();
        expect(svg.tagName).toBe('svg');

        // Convert SVG to string for inspection
        const svgString = new XMLSerializer().serializeToString(svg);
        
        // Check that time signatures are in the SVG as SVG paths (not text)
        // The new TimeSignatureRenderer uses <g data-time-signature="N/M"> with path elements
        expect(svgString).toContain('data-time-signature="3/4"'); // 3/4 time signature
        expect(svgString).toContain('data-time-signature="2/4"'); // 2/4 time signature
        expect(svgString).toContain('<path d='); // SVG paths for digits

        // Log for manual inspection if needed
        console.log('\n=== SVG Output (first 500 chars) ===');
        console.log(svgString.substring(0, 500));
        console.log('\n=== Parsed Measures ===');
        parsed.grid.measures.forEach((m, i) => {
            if (m.timeSignature) {
                console.log(`Measure ${i + 1}: ${m.timeSignature.numerator}/${m.timeSignature.denominator}`);
            }
        });
    });

    test('should render user reported case correctly', () => {
        const input = '4/4 | Em | Em | C / G | D / Em | 2/4 Em[2] |';
        const parsed = parser.parse(input);
        
        // Verify parsing
        expect(parsed.grid.measures[4].timeSignature).toBeTruthy();
        expect(parsed.grid.measures[4].timeSignature?.numerator).toBe(2);
        expect(parsed.grid.measures[4].timeSignature?.denominator).toBe(4);

        // Render
        const svg = renderer.render(parsed.grid);
        expect(svg).toBeTruthy();
        
        const svgString = new XMLSerializer().serializeToString(svg);
        
        // Should contain the 2/4 time signature as SVG
        expect(svgString).toContain('data-time-signature="2/4"');
        
        console.log('\n=== User Case SVG (first 500 chars) ===');
        console.log(svgString.substring(0, 500));
    });

    test('should handle multiple time signature changes', () => {
        const input = '4/4 | Am[4 4 4 4] | 3/4 C[4 4 4] | 2/4 D[2] | 6/8 G[8 8 8 8 8 8] |';
        const parsed = parser.parse(input);
        
        // Verify all time signatures are parsed
        expect(parsed.grid.measures[0].timeSignature).toBeUndefined(); // Uses global 4/4
        expect(parsed.grid.measures[1].timeSignature?.numerator).toBe(3);
        expect(parsed.grid.measures[2].timeSignature?.numerator).toBe(2);
        expect(parsed.grid.measures[3].timeSignature?.numerator).toBe(6);
        expect(parsed.grid.measures[3].timeSignature?.denominator).toBe(8);

        // Render
        const svg = renderer.render(parsed.grid);
        expect(svg).toBeTruthy();
        
        const svgString = new XMLSerializer().serializeToString(svg);
        
        // Should contain all time signatures as SVG
        expect(svgString).toContain('data-time-signature="3/4"'); // 3/4
        expect(svgString).toContain('data-time-signature="2/4"'); // 2/4
        expect(svgString).toContain('data-time-signature="6/8"'); // 6/8
        
        console.log('\n=== Multiple Changes - Measures ===');
        parsed.grid.measures.forEach((m, i) => {
            if (m.timeSignature) {
                console.log(`Measure ${i + 1}: ${m.timeSignature.numerator}/${m.timeSignature.denominator}`);
            }
        });
    });

    // Optional: Save SVG to file for manual inspection
    test.skip('should save SVG output for visual inspection', () => {
        const testCases = [
            { name: 'basic_changes', input: '4/4 | Am[4 4 4 4] | 3/4 D[4 4 4] | 2/4 G[2] |' },
            { name: 'user_case', input: '4/4 | Em | Em | C / G | D / Em | 2/4 Em[2] |' },
            { name: 'multiple_changes', input: '4/4 | Am[4 4 4 4] | 3/4 C[4 4 4] | 2/4 D[2] | 6/8 G[8 8 8 8 8 8] |' }
        ];

        testCases.forEach(test => {
            const parsed = parser.parse(test.input);
            const svg = renderer.render(parsed.grid);
            const svgString = new XMLSerializer().serializeToString(svg);
            
            const filename = `test/output_${test.name}.svg`;
            fs.writeFileSync(filename, svgString);
            console.log(`Saved: ${filename}`);
        });
    });
});
