import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

describe('Chord positioning with volta and tuplet collision', () => {
    it('should render chord symbol below volta line when volta marker is present', () => {
        const input = `4/4 |.4 Bb[{888}3 88 4 168.] |`;
        
        const parser = new ChordGridParser();
        const result = parser.parse(input);
        const grid = result.grid;
        
        // Verify measure has volta
        const measure = grid.measures[0];
        expect(measure.voltaStart).toBeDefined();
        expect(measure.voltaStart?.numbers).toEqual([4]);
        expect(measure.chord).toBe('Bb');
        
        // Render to SVG
        const renderer = new SVGRenderer();
        const svg = renderer.render(grid);
        const svgString = svg.outerHTML;
        
        // Check that Bb chord is rendered (as B♭)
        expect(svgString).toContain('B♭');
        
        // Extract chord Y position from SVG
        const chordMatch = svgString.match(/class="chord-symbol">B♭<\/text>/);
        expect(chordMatch).toBeTruthy();
        
        // Find the text element with chord
        const textBeforeChord = svgString.substring(0, chordMatch!.index);
        const lastTextTag = textBeforeChord.lastIndexOf('<text');
        const textElement = svgString.substring(lastTextTag, chordMatch!.index! + chordMatch![0].length);
        
        // Extract Y position
        const yMatch = textElement.match(/y="([\d.]+)"/);
        expect(yMatch).toBeTruthy();
        
        const chordY = parseFloat(yMatch![1]);
        
        // Chord Y should be greater than 0 (visible)
        expect(chordY).toBeGreaterThan(0);
        
        // Chord Y should be reasonable (not pushed too far down)
        expect(chordY).toBeLessThan(100);
        
        // With volta at y=20 and text at ~36, chord should be around 34-40
        expect(chordY).toBeGreaterThanOrEqual(20);
        expect(chordY).toBeLessThanOrEqual(50);
    });

    it('should render chord after volta text when they overlap horizontally', () => {
        const input = `4/4 |.1-3 C[8.16 88] :||.4 Bb[{888}3 88 4 168.] |`;
        
        const parser = new ChordGridParser();
        const result = parser.parse(input);
        const grid = result.grid;
        
        const renderer = new SVGRenderer();
        const svg = renderer.render(grid);
        const svgString = svg.outerHTML;
        
        // Both chords should be present
        expect(svgString).toContain('>C<');
        expect(svgString).toContain('B♭');
        
        // Find volta text position
        const voltaTextMatch = svgString.match(/data-volta="text"[^>]*>(\d+-?\d*|\\d+)</);
        expect(voltaTextMatch).toBeTruthy();
        
        // Chord should be visible and positioned correctly
        const chordMatches = svgString.match(/class="chord-symbol">[^<]+</g);
        expect(chordMatches!.length).toBeGreaterThanOrEqual(2);
    });

    it('should position chord correctly with both volta and tuplet present', () => {
        const input = `measures-per-line:5 4/4 ||: C[8.16 88 4 168.] | G[%] | Am[%] |.1-3 F / G :||.4 Bb[{888}3 88 4 168.] |`;
        
        const parser = new ChordGridParser();
        const result = parser.parse(input);
        const grid = result.grid;
        
        // Last measure should have volta, tuplet, and chord
        const lastMeasure = grid.measures[grid.measures.length - 1];
        expect(lastMeasure.voltaStart).toBeDefined();
        expect(lastMeasure.chord).toBe('Bb');
        expect(lastMeasure.beats[0].notes[0].tuplet).toBeDefined();
        
        const renderer = new SVGRenderer();
        const svg = renderer.render(grid);
        const svgString = svg.outerHTML;
        
        // All chords should be rendered
        expect(svgString).toContain('>C<');
        expect(svgString).toContain('>G<');
        expect(svgString).toContain('A<tspan'); // Am
        expect(svgString).toContain('>F<');
        expect(svgString).toContain('B♭'); // Bb
        
        // Count chord symbols - should have C, G, Am, F, G, Bb but G and Am show as %
        // So we should have at least C, F, G (repeat end), and Bb visible
        const chordCount = (svgString.match(/class="chord-symbol"/g) || []).length;
        expect(chordCount).toBeGreaterThanOrEqual(4);
    });

    it('should keep chord visible even with multiple collision elements', () => {
        const input = `4/4 |.1 Am[{888}3 {88}3] |.2 Dm[{888}3 88] |.3 G[88 {88}3] |`;
        
        const parser = new ChordGridParser();
        const result = parser.parse(input);
        const grid = result.grid;
        
        const renderer = new SVGRenderer();
        const svg = renderer.render(grid);
        const svgString = svg.outerHTML;
        
        // All three chords should be visible
        expect(svgString).toContain('A<tspan'); // Am
        expect(svgString).toContain('D<tspan'); // Dm
        expect(svgString).toContain('>G<');
        
        // Extract all chord Y positions
        const chordElements = svgString.match(/<text[^>]*class="chord-symbol"[^>]*>/g);
        expect(chordElements).toBeTruthy();
        expect(chordElements!.length).toBeGreaterThanOrEqual(3);
        
        // All chords should have valid Y positions (visible)
        chordElements!.forEach(element => {
            const yMatch = element.match(/y="([\d.-]+)"/);
            expect(yMatch).toBeTruthy();
            const y = parseFloat(yMatch![1]);
            expect(y).toBeGreaterThan(0);
            expect(y).toBeLessThan(100);
        });
    });

    it('should not break chord positioning on measures without volta', () => {
        const input = `4/4 | C[{888}3 88 4 168.] | G[88 88 4 168.] |`;
        
        const parser = new ChordGridParser();
        const result = parser.parse(input);
        const grid = result.grid;
        
        // Measures should not have volta
        expect(grid.measures[0].voltaStart).toBeUndefined();
        expect(grid.measures[1].voltaStart).toBeUndefined();
        
        const renderer = new SVGRenderer();
        const svg = renderer.render(grid);
        const svgString = svg.outerHTML;
        
        // Both chords should be rendered normally
        expect(svgString).toContain('>C<');
        expect(svgString).toContain('>G<');
        
        // Chords should be positioned at normal height (above stems)
        const chordYMatches = svgString.match(/<text[^>]*class="chord-symbol"[^>]*>/g);
        expect(chordYMatches).toBeTruthy();
        expect(chordYMatches!.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle volta without tuplet correctly', () => {
        const input = `4/4 |.1-3 C[88 88] :||.4 Bb[88 88] |`;
        
        const parser = new ChordGridParser();
        const result = parser.parse(input);
        const grid = result.grid;
        
        const renderer = new SVGRenderer();
        const svg = renderer.render(grid);
        const svgString = svg.outerHTML;
        
        // Both chords should be visible
        expect(svgString).toContain('>C<');
        expect(svgString).toContain('B♭');
    });

    it('should handle tuplet without volta correctly', () => {
        const input = `4/4 | C[{888}3 88 4 168.] | G[88 88 4 168.] |`;
        
        const parser = new ChordGridParser();
        const result = parser.parse(input);
        const grid = result.grid;
        
        // First measure has tuplet
        expect(grid.measures[0].beats[0].notes[0].tuplet).toBeDefined();
        
        const renderer = new SVGRenderer();
        const svg = renderer.render(grid);
        const svgString = svg.outerHTML;
        
        // Both chords should be visible
        expect(svgString).toContain('>C<');
        expect(svgString).toContain('>G<');
        
        // Chords should avoid tuplet brackets
        const chordYMatches = svgString.match(/<text[^>]*class="chord-symbol"[^>]*>/g);
        expect(chordYMatches).toBeTruthy();
        
        chordYMatches!.forEach(match => {
            const yMatch = match.match(/y="([\d.-]+)"/);
            const y = parseFloat(yMatch![1]);
            expect(y).toBeGreaterThan(0);
        });
    });
});
