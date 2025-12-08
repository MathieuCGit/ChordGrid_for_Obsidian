import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

describe('Auto-break behavior with 88888888', () => {
    let parser: ChordGridParser;

    beforeEach(() => {
        parser = new ChordGridParser();
    });

    it('WITH noauto: 88888888 should render ONE continuous beam (no auto-break)', () => {
        const input = `4/4 noauto | C[88888888] |`;
        
        const result = parser.parse(input);
        const grid = result.grid;
        
        const measure = grid.measures[0];
        const segment = measure.chordSegments[0];
        
        console.log('NOAUTO - Parser beats:', segment.beats.length);
        const beat = segment.beats[0];
        console.log('NOAUTO - Beam groups:', beat.beamGroups);
        
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
        }).length;
        console.log('NOAUTO - Beam lines in SVG:', beamLines);
        
        // With noauto, should have 1 continuous beam connecting all 8 notes
        // = 1 long beam line
        expect(beamLines).toBe(1);
    });

    it('WITHOUT noauto (auto mode): 88888888 should render in groups of 2 (binary)', () => {
        const input = `4/4 | C[88888888] |`;
        
        const result = parser.parse(input);
        const grid = result.grid;
        
        const measure = grid.measures[0];
        const segment = measure.chordSegments[0];
        
        console.log('AUTO - Parser beats:', segment.beats.length);
        const beat = segment.beats[0];
        console.log('AUTO - Beam groups:', beat.beamGroups);
        
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
        }).length;
        console.log('AUTO - Beam lines in SVG:', beamLines);
        
        // With auto-break (binary), should have 4 beam groups of 2 notes each
        // = 4 separate beam lines
        expect(beamLines).toBe(4);
    });

    it('WITH binary explicit: 88888888 should render in groups of 2', () => {
        const input = `4/4 binary | C[88888888] |`;
        
        const result = parser.parse(input);
        const grid = result.grid;
        
        const measure = grid.measures[0];
        const segment = measure.chordSegments[0];
        
        console.log('BINARY - Parser beats:', segment.beats.length);
        const beat = segment.beats[0];
        console.log('BINARY - Beam groups:', beat.beamGroups);
        
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
        }).length;
        console.log('BINARY - Beam lines in SVG:', beamLines);
        
        // Same as auto mode for 4/4: 4 beam lines
        expect(beamLines).toBe(4);
    });
});

