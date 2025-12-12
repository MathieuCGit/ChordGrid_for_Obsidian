import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

describe('Auto-break behavior with 88888888', () => {
    let parser: ChordGridParser;

    beforeEach(() => {
        parser = new ChordGridParser();
    });

    it('DEFAULT (space-based): 88888888 should render ONE continuous beam (no auto-break)', () => {
        const input = `4/4 | C[88888888] |`;
        
        const result = parser.parse(input);
        const grid = result.grid;
        
        const measure = grid.measures[0];
        const segment = measure.chordSegments[0];
        
        console.log('SPACE-BASED - Parser beats:', segment.beats.length);
        const beat = segment.beats[0];
        console.log('SPACE-BASED - Beam groups:', beat.beamGroups);
        
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
        console.log('SPACE-BASED - Beam lines in SVG:', beamLines);
        
        // v3.0: Default space-based mode, no spaces = 1 continuous beam
        // = 1 long beam line
        expect(beamLines).toBe(1);
    });

    it('WITH auto-beam: 88888888 should render in groups at beat boundaries', () => {
        const input = `auto-beam\n4/4 | C[88888888] |`;
        
        const result = parser.parse(input);
        const grid = result.grid;
        
        const measure = grid.measures[0];
        const segment = measure.chordSegments[0];
        
        console.log('AUTO-BEAM - Parser beats:', segment.beats.length);
        const beat = segment.beats[0];
        console.log('AUTO-BEAM - Beam groups:', beat.beamGroups);
        
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
        console.log('AUTO-BEAM - Beam lines in SVG:', beamLines);
        
        // v3.0: auto-beam in 4/4 breaks at each beat (quarter note)
        // 8 eighths = 4 beats → 4 beam groups = 4 separate beam lines
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

