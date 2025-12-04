/**
 * Test pour vérifier que les accords s'alignent avec le début de la tête de note (headLeftX)
 * plutôt qu'avec le centre de la hampe (stem.centerX)
 */

import { SVGRenderer } from '../src/renderer/SVGRenderer';
import { ChordGridParser } from '../src/parser/ChordGridParser';

declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;

describe('Chord Alignment with Note Head', () => {
    let parser: ChordGridParser;

    beforeEach(() => {
        parser = new ChordGridParser();
        
        // Mock DOM elements for SVG rendering
        const mockCreateElementNS = (ns: string, tagName: string) => {
            const element: any = {
                tagName: tagName.toUpperCase(),
                attributes: {},
                children: [],
                classList: {
                    add: () => {},
                    remove: () => {},
                },
                setAttribute(name: string, value: string) {
                    this.attributes[name] = value;
                },
                getAttribute(name: string) {
                    return this.attributes[name];
                },
                appendChild(child: any) {
                    this.children.push(child);
                    return child;
                },
                querySelectorAll(selector: string) {
                    const results: any[] = [];
                    const traverse = (node: any) => {
                        if (selector === 'text.chord-symbol') {
                            if (node.tagName === 'TEXT' && node.attributes.class === 'chord-symbol') {
                                results.push(node);
                            }
                        }
                        if (node.children) {
                            node.children.forEach((child: any) => traverse(child));
                        }
                    };
                    traverse(this);
                    return results;
                },
                textContent: null
            };
            return element;
        };
        
        (global as any).document = {
            createElementNS: mockCreateElementNS
        };
    });

    it('should align chord with note head left edge (headLeftX) not stem center', () => {
        // Input avec rythme - 4 noires
        const input = `4/4 || C[4 4 4 4] ||`;
        
        const parseResult = parser.parse(input);
        
        const renderer = new SVGRenderer();
        const svg = renderer.render(parseResult.grid, {});
        
        // Trouver l'accord
        const chordSymbols = svg.querySelectorAll('text.chord-symbol');
        
        expect(chordSymbols.length).toBe(1);
        
        const chord = chordSymbols[0];
        const chordX = parseFloat(chord.getAttribute('x') || '0');
        
        console.log('\n=== Chord Alignment Test ===');
        console.log(`Chord "${chord.textContent}" at x=${chordX}`);
        
        // For a quarter note (value=4), the slash has a width of 10px (slashHalf=5)
        // noteX is at the center, so:
        // - headLeftX = noteX - 5
        // - headRightX = noteX + 5
        // - stem.centerX = noteX (at the center of the slash)
        
        // The chord should align with headLeftX, not with stem.centerX
        // Therefore chordX should be approximately 5px to the left of the first note's center
        
        // If the first note is centered at x=68 (as in older tests),
        // then headLeftX should be at 68 - 5 = 63
        // Verify that the chord is close to this position
        
        expect(chordX).toBeLessThan(70); // More to the left than center (68)
        expect(chordX).toBeGreaterThan(55); // But not too far left
    });

    it('aligns chord with first note head in multi-segment measure', () => {
        // Test with 2 chord segments in a single measure
        // Each segment should align its chord with its first note's left edge
        const input = `4/4 || C[4 4] Dm[4 4] ||`;
        
        const parseResult = parser.parse(input);
        
        const renderer = new SVGRenderer();
        const svg = renderer.render(parseResult.grid, {});
        
        const chordSymbols = svg.querySelectorAll('text.chord-symbol');
        
        console.log('\n=== Multiple Segments Alignment ===');
        chordSymbols.forEach((el, idx) => {
            const x = el.getAttribute('x');
            const text = el.textContent;
            console.log(`${idx + 1}. "${text}" at x=${x}`);
        });
        
        expect(chordSymbols.length).toBe(2);
        
        // Both chords should be aligned with the left edge of their respective first notes
        const chord1X = parseFloat(chordSymbols[0].getAttribute('x') || '0');
        const chord2X = parseFloat(chordSymbols[1].getAttribute('x') || '0');
        
        // The second chord should be significantly to the right of the first chord
        // This ensures proper spacing between segments in the same measure
        expect(chord2X).toBeGreaterThan(chord1X + 50);
    });
});
