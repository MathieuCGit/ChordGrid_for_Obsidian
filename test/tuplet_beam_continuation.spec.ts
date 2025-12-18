import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

describe('Tuplet beam continuation with rests', () => {
    it('should maintain beam across tuplet with rest notation {8-88}3', () => {
        const input = `4/4 | C[{8-88}3] |`;
        
        const parser = new ChordGridParser();
        const result = parser.parse(input);
        const grid = result.grid;
        
        const measure = grid.measures[0];
        const beat = measure.beats[0];
        
        // Should have 3 notes in tuplet
        expect(beat.notes.length).toBe(3);
        expect(beat.notes[0].tuplet).toBeDefined();
        expect(beat.notes[0].tuplet?.count).toBe(3);
        
        // Second note should be a rest
        expect(beat.notes[0].isRest).toBe(false);
        expect(beat.notes[1].isRest).toBe(true);
        expect(beat.notes[2].isRest).toBe(false);
        
        // Should have beam group covering the 2 beamable notes (rest is not beamable)
        expect(beat.hasBeam).toBe(true);
        expect(beat.beamGroups).toBeDefined();
        expect(beat.beamGroups!.length).toBeGreaterThan(0);
        
        // The beam group should connect the 2 beamable notes (indices 0 and 2)
        const primaryBeam = beat.beamGroups![0];
        expect(primaryBeam.noteCount).toBe(2); // 2 beamable notes in tuplet
    });

    it('should maintain beam across multiple tuplets with rests {8-88}3', () => {
        const input = `4/4 | C[{8-88}3 {8-88}3] |`;
        
        const parser = new ChordGridParser();
        const result = parser.parse(input);
        const grid = result.grid;
        
        const measure = grid.measures[0];
        
        // Should have 2 beats with tuplets
        expect(measure.beats.length).toBe(2);
        
        measure.beats.forEach((beat, idx) => {
            expect(beat.notes.length).toBe(3);
            expect(beat.notes[0].tuplet).toBeDefined();
            expect(beat.hasBeam).toBe(true);
            
            // Each tuplet should have its beam
            expect(beat.beamGroups).toBeDefined();
            expect(beat.beamGroups!.length).toBeGreaterThan(0);
        });
    });

    it('should maintain beam across 4 tuplets with rests as in user example', () => {
        const input = `4/4 | Cmaj7[{8-88}3 {8-88}3 {8-88}3 {8-88}3] |`;
        
        const parser = new ChordGridParser();
        const result = parser.parse(input);
        const grid = result.grid;
        
        const measure = grid.measures[0];
        
        // Should have 4 beats (tuplets)
        expect(measure.beats.length).toBe(4);
        
        measure.beats.forEach((beat, idx) => {
            // Each beat has 3 notes
            expect(beat.notes.length).toBe(3);
            
            // All notes in tuplet
            expect(beat.notes[0].tuplet).toBeDefined();
            expect(beat.notes[0].tuplet?.count).toBe(3);
            
            // Second note is a rest
            expect(beat.notes[0].isRest).toBe(false);
            expect(beat.notes[1].isRest).toBe(true);
            expect(beat.notes[2].isRest).toBe(false);
            
            // Should have beam
            expect(beat.hasBeam).toBe(true);
            expect(beat.beamGroups).toBeDefined();
        });
        
        // Render to verify beams in SVG
        const renderer = new SVGRenderer();
        const svg = renderer.render(grid);
        const svgString = svg.outerHTML;
        
        // Should have beam lines (stroke-width="3")
        const beamLines = (svgString.match(/stroke-width="3"/g) || []).length;
        expect(beamLines).toBeGreaterThan(0);
        
        // Should have tuplet brackets
        expect(svgString).toContain('font-size="12"'); // Tuplet number
    });

    it('should NOT break beam with continuous notation {8-88}3 vs {8 -8 8}3', () => {
        const continuous = `4/4 | C[{8-88}3] |`;
        const separated = `4/4 | C[{8 -8 8}3] |`;
        
        const parser = new ChordGridParser();
        
        // Parse continuous notation
        const resultCont = parser.parse(continuous);
        const gridCont = resultCont.grid;
        const beatCont = gridCont.measures[0].beats[0];
        
        // Parse separated notation
        const resultSep = parser.parse(separated);
        const gridSep = resultSep.grid;
        const beatSep = gridSep.measures[0].beats[0];
        
        // Both should have beams
        expect(beatCont.hasBeam).toBe(true);
        expect(beatSep.hasBeam).toBe(true);
        
        // Continuous should have a beam group connecting the 2 beamable notes
        expect(beatCont.beamGroups).toBeDefined();
        const contPrimaryBeam = beatCont.beamGroups!.find(bg => bg.noteCount >= 2);
        expect(contPrimaryBeam).toBeDefined();
        expect(contPrimaryBeam!.noteCount).toBe(2); // 2 beamable notes
        
        // Separated might have different beam structure (depends on implementation)
        // but should also have beams
        expect(beatSep.beamGroups).toBeDefined();
        expect(beatSep.beamGroups!.length).toBeGreaterThan(0);
    });

    it('should handle mixed tuplet notation in same measure', () => {
        const input = `4/4 | C[{8-88}3 {888}3] |`;
        
        const parser = new ChordGridParser();
        const result = parser.parse(input);
        const grid = result.grid;
        
        const measure = grid.measures[0];
        expect(measure.beats.length).toBe(2);
        
        // First tuplet with rest
        expect(measure.beats[0].notes[1].isRest).toBe(true);
        expect(measure.beats[0].notes[0].tuplet).toBeDefined();
        
        // Second tuplet without rest
        expect(measure.beats[1].notes[1].isRest).toBe(false);
        expect(measure.beats[1].notes[0].tuplet).toBeDefined();
        
        // Both should have beams
        expect(measure.beats[0].hasBeam).toBe(true);
        expect(measure.beats[1].hasBeam).toBe(true);
    });

    it('should render beams correctly in full user example', () => {
        const input = `4/4 | Cmaj7[{8-88}3 {8-88}3 {8-88}3 {8-88}3] | Dm7[%] | G7[%] |.1-3 Cmaj7[2 2] :||.4 Bb[{888}3 88 4 168.] |`;
        
        const parser = new ChordGridParser();
        const result = parser.parse(input);
        const grid = result.grid;
        
        // First measure should have 4 tuplet beats
        const firstMeasure = grid.measures[0];
        expect(firstMeasure.beats.length).toBe(4);
        
        firstMeasure.beats.forEach((beat, idx) => {
            expect(beat.notes.length).toBe(3);
            expect(beat.hasBeam).toBe(true);
            expect(beat.notes[0].tuplet).toBeDefined();
            expect(beat.notes[1].isRest).toBe(true);
        });
        
        // Render and check for beam elements
        const renderer = new SVGRenderer();
        const svg = renderer.render(grid);
        const svgString = svg.outerHTML;
        
        // Should have multiple beam lines
        const beamCount = (svgString.match(/stroke-width="3"/g) || []).length;
        expect(beamCount).toBeGreaterThan(8); // At least one beam per tuplet
        
        // Should have tuplet brackets and numbers (just "3" for default triplets)
        const tupletNumbers = (svgString.match(/text-anchor="middle">3</g) || []).length;
        expect(tupletNumbers).toBeGreaterThanOrEqual(4); // 4 tuplets in first measure + 1 in last
    });

    it('should handle tuplet beams with rests in analyzer without breaking', () => {
        const input = `4/4 | C[{8-88}3 {8-88}3] |`;
        
        const parser = new ChordGridParser();
        const result = parser.parse(input);
        const grid = result.grid;
        
        // Grid should be properly analyzed
        expect(grid.measures).toBeDefined();
        expect(grid.measures[0]).toBeDefined();
        
        const measure = grid.measures[0];
        
        // Check that beams are analyzed
        expect(measure.beats[0].hasBeam).toBe(true);
        expect(measure.beats[1].hasBeam).toBe(true);
        
        // No errors should be thrown during rendering
        const renderer = new SVGRenderer();
        expect(() => renderer.render(grid)).not.toThrow();
    });
});
