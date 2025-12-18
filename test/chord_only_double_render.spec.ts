/**
 * Test pour vérifier que les accords ne sont pas rendus 2 fois en mode chord-only
 */

import { SVGRenderer } from '../src/renderer/SVGRenderer';
import { ChordGridParser } from '../src/parser/ChordGridParser';

declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;

describe('Chord-Only Mode - Double Render Bug', () => {
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

    it('should render chord symbols only once in chord-only mode', () => {
        // Input sans rythme (mode chord-only)
        const input = `4/4 || C | Am | G | F ||`;
        
        const parseResult = parser.parse(input);
        
        const renderer = new SVGRenderer();
        const svg = renderer.render(parseResult.grid, {});
        
        // Count the number of <text> elements with class "chord-symbol"
        const chordSymbols = svg.querySelectorAll('text.chord-symbol');
        
        console.log('\n=== Chord Symbols Found ===');
        chordSymbols.forEach((el, idx) => {
            const x = el.getAttribute('x');
            const y = el.getAttribute('y');
            const text = el.textContent;
            console.log(`${idx + 1}. "${text}" at x=${x}, y=${y}`);
        });
        
        // On devrait avoir exactement 4 accords (C, Am, G, F)
        expect(chordSymbols.length).toBe(4);
        
        // Verify the content
        const chordTexts = Array.from(chordSymbols).map(el => el.textContent);
        expect(chordTexts).toEqual(['C', 'Am', 'G', 'F']);
    });

    it('should render chord symbols correctly with rhythm', () => {
        // Input avec rythme
        const input = `4/4 || C[4 4 4 4] | Am[2 2 2 2 2 2 2 2] | G[1] | F[4 4 4 4] ||`;
        
        const parseResult = parser.parse(input);
        
        const renderer = new SVGRenderer();
        const svg = renderer.render(parseResult.grid, {});
        
        // Count the number of <text> elements with class "chord-symbol"
        const chordSymbols = svg.querySelectorAll('text.chord-symbol');
        
        console.log('\n=== Chord Symbols Found (with rhythm) ===');
        chordSymbols.forEach((el, idx) => {
            const x = el.getAttribute('x');
            const y = el.getAttribute('y');
            const text = el.textContent;
            console.log(`${idx + 1}. "${text}" at x=${x}, y=${y}`);
        });
        
        // On devrait avoir exactement 4 accords (C, Am, G, F)
        expect(chordSymbols.length).toBe(4);
        
        // Verify the content
        const chordTexts = Array.from(chordSymbols).map(el => el.textContent);
        expect(chordTexts).toEqual(['C', 'Am', 'G', 'F']);
    });

    it('should render multiple chord segments in one measure (chord-only)', () => {
        // 2 chords in the same measure, without rhythm notation
        const input = `4/4 || C / Dm | G | F ||`;
        
        const parseResult = parser.parse(input);
        
        const renderer = new SVGRenderer();
        const svg = renderer.render(parseResult.grid, {});
        
        // Count the number of <text> elements with class "chord-symbol"
        const chordSymbols = svg.querySelectorAll('text.chord-symbol');
        
        console.log('\n=== Multiple Chord Segments (chord-only) ===');
        chordSymbols.forEach((el, idx) => {
            const x = el.getAttribute('x');
            const y = el.getAttribute('y');
            const text = el.textContent;
            console.log(`${idx + 1}. "${text}" at x=${x}, y=${y}`);
        });
        
        // On devrait avoir 4 accords: C, Dm (mesure 1), G (mesure 2), F (mesure 3)
        expect(chordSymbols.length).toBe(4);
        
        // Verify the content
        const chordTexts = Array.from(chordSymbols).map(el => el.textContent);
        expect(chordTexts).toEqual(['C', 'Dm', 'G', 'F']);
    });
});

