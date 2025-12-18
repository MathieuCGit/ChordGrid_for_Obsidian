import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

describe('Beam continuation after tuplet', () => {
    let parser: ChordGridParser;

    beforeEach(() => {
        parser = new ChordGridParser();
    });

    it('Two eighths after a triplet should be beamed together: {888}3 88', () => {
        const input = `4/4 noauto | Bb[{888}3 88 4 168.] |`;
        
        const result = parser.parse(input);
        const grid = result.grid;
        
        const measure = grid.measures[0];
        const segment = measure.chordSegments[0];
        
        console.log('Parser beats:', segment.beats.length);
        segment.beats.forEach((beat, i) => {
            console.log(`Beat ${i}:`, {
                notes: beat.notes.map(n => n.value),
                beamGroups: beat.beamGroups
            });
        });
        
        // Render to SVG
        const renderer = new SVGRenderer();
        const svg = renderer.render(grid);
        const svgString = svg.outerHTML;
        
        // Count beam lines (horizontal lines with y1=y2, stroke="#000", stroke-width="3")
        const allLines = svgString.match(/<line[^>]*>/g) || [];
        const beamLines = allLines.filter(line => {
            const y1Match = line.match(/y1="([^"]+)"/);
            const y2Match = line.match(/y2="([^"]+)"/);
            const isHorizontal = y1Match && y2Match && y1Match[1] === y2Match[1];
            const isBeam = line.includes('stroke="#000"') && line.includes('stroke-width="3"');
            return isHorizontal && isBeam;
        });
        
        console.log('Beam lines found:', beamLines.length);
        beamLines.forEach((line, i) => {
            const x1 = line.match(/x1="([^"]+)"/)?.[1];
            const x2 = line.match(/x2="([^"]+)"/)?.[1];
            const y = line.match(/y1="([^"]+)"/)?.[1];
            console.log(`  Beam ${i}: x1=${x1}, x2=${x2}, y=${y}`);
        });
        
        // Expected: 4 beam lines (includes beamlet for the 16th note)
        // 1. Beam for the triplet {888}3 (3 eighth notes)
        // 2. Beam for the two eighths 88 after the tuplet
        // 3. Beam for 16th + dotted 8th (168.)
        // 4. Secondary beamlet for the 16th note
        expect(beamLines.length).toBe(4);
    });

    it('Simplified: Just {888}3 88 should have 2 beams', () => {
        const input = `4/4 noauto | C[{888}3 88] |`;
        
        const result = parser.parse(input);
        const grid = result.grid;
        
        const measure = grid.measures[0];
        const segment = measure.chordSegments[0];
        
        console.log('\n=== SIMPLIFIED TEST ===');
        console.log('Parser beats:', segment.beats.length);
        
        segment.beats.forEach((beat, i) => {
            console.log(`Beat ${i}:`, {
                notes: beat.notes.map(n => ({ value: n.value, tuplet: n.tuplet })),
                beamGroups: beat.beamGroups
            });
        });
        
        // Render to SVG
        const renderer = new SVGRenderer();
        const svg = renderer.render(grid);
        const svgString = svg.outerHTML;
        
        // Count beam lines
        const allLines = svgString.match(/<line[^>]*>/g) || [];
        const beamLines = allLines.filter(line => {
            const y1Match = line.match(/y1="([^"]+)"/);
            const y2Match = line.match(/y2="([^"]+)"/);
            const isHorizontal = y1Match && y2Match && y1Match[1] === y2Match[1];
            const isBeam = line.includes('stroke="#000"') && line.includes('stroke-width="3"');
            return isHorizontal && isBeam;
        });
        
        console.log('Beam lines found:', beamLines.length);
        beamLines.forEach((line, i) => {
            const x1 = line.match(/x1="([^"]+)"/)?.[1];
            const x2 = line.match(/x2="([^"]+)"/)?.[1];
            const y = line.match(/y1="([^"]+)"/)?.[1];
            console.log(`  Beam ${i}: x1=${x1}, x2=${x2}, y=${y}, length=${Number(x2) - Number(x1)}`);
        });
        
        // Expected: 2 beam lines
        // 1. Beam for {888}3 - triplet of 3 eighths
        // 2. Beam for 88 - two regular eighths
        expect(beamLines.length).toBe(2);
    });
});
