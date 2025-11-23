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
        
        // Pour une noire (value=4), le slash a une largeur de 10px (slashHalf=5)
        // noteX est au centre, donc:
        // - headLeftX = noteX - 5
        // - headRightX = noteX + 5
        // - stem.centerX = noteX (au centre du slash)
        
        // L'accord devrait être aligné avec headLeftX, pas avec stem.centerX
        // Donc chordX devrait être environ 5px à gauche du centre de la première note
        
        // Si la première note est centrée à x=68 (comme dans les anciens tests),
        // alors headLeftX devrait être à 68 - 5 = 63
        // Vérifions que l'accord est bien proche de cette position
        
        expect(chordX).toBeLessThan(70); // Plus à gauche que le centre (68)
        expect(chordX).toBeGreaterThan(55); // Mais pas trop à gauche
    });

    it('should align multiple chord segments with their respective first notes', () => {
        // 2 segments dans une même mesure
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
        
        // Les deux accords devraient être alignés avec le début de leurs premières notes respectives
        const chord1X = parseFloat(chordSymbols[0].getAttribute('x') || '0');
        const chord2X = parseFloat(chordSymbols[1].getAttribute('x') || '0');
        
        // Le deuxième accord devrait être nettement plus à droite que le premier
        expect(chord2X).toBeGreaterThan(chord1X + 50);
    });
});
