/**
 * @file line_breaking_modes.spec.ts
 * @description Tests pour les 3 modes de gestion des retours à la ligne :
 * 1. Automatique (par défaut) : Le script gère automatiquement les retours à la ligne
 * 2. Retours à la ligne explicites (\n) : Si un \n est détecté, une nouvelle ligne est créée
 * 3. measures-per-line:N : Force exactement N mesures par ligne
 */

import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

describe('Line Breaking Modes', () => {
    let parser: ChordGridParser;
    let renderer: SVGRenderer;

    beforeEach(() => {
        parser = new ChordGridParser();
        renderer = new SVGRenderer();
    });

    describe('MODE 1: Automatic line breaking', () => {
        it('should automatically break lines based on width (default behavior)', () => {
            // A long sequence of measures that should be automatically split into lines
            const input = `4/4
| Am[4 4 4 4] | C[4 4 4 4] | G[4 4 4 4] | F[4 4 4 4] | Em[4 4 4 4] | Dm[4 4 4 4] | Am[4 4 4 4] | C[4 4 4 4] |`;
            
            const parseResult = parser.parse(input);
            expect(parseResult.errors).toHaveLength(0);
            expect(parseResult.measures.length).toBe(8);
            
            // Verify that rendering does not generate errors
            const svg = renderer.render(parseResult.grid);
            expect(svg).toBeDefined();
            
            // Le SVG devrait avoir une hauteur suffisante pour plusieurs lignes
            const viewBox = svg.getAttribute('viewBox');
            expect(viewBox).toBeTruthy();
            const [,, width, height] = viewBox!.split(' ').map(Number);
            expect(height).toBeGreaterThan(150); // Plus d'une ligne
        });
    });

    describe('MODE 2: Explicit line breaks with \\n', () => {
        it('should create a new line when \\n is detected', () => {
            const input = `4/4
| Am[4 4 4 4] | C[4 4 4 4] |
| G[4 4 4 4] | F[4 4 4 4] |`;
            
            const parseResult = parser.parse(input);
            expect(parseResult.errors).toHaveLength(0);
            expect(parseResult.measures.length).toBe(4);
            
            // Verify that isLineBreak is marked on the correct measures
            expect(parseResult.measures[1].isLineBreak).toBe(true); // End of first line
            expect(parseResult.measures[3].isLineBreak).toBe(false); // Last measure has no break after it
            
            const svg = renderer.render(parseResult.grid);
            expect(svg).toBeDefined();
            
            // Le SVG devrait avoir une hauteur pour 2 lignes
            const viewBox = svg.getAttribute('viewBox');
            expect(viewBox).toBeTruthy();
            const [,, width, height] = viewBox!.split(' ').map(Number);
            expect(height).toBeGreaterThan(150); // Au moins 2 lignes
        });

        it('should handle multiple explicit line breaks', () => {
            const input = `4/4
| Am[4 4 4 4] |
| C[4 4 4 4] |
| G[4 4 4 4] |`;
            
            const parseResult = parser.parse(input);
            expect(parseResult.errors).toHaveLength(0);
            expect(parseResult.measures.length).toBe(3);
            
            // Each measure except the last should have isLineBreak
            expect(parseResult.measures[0].isLineBreak).toBe(true);
            expect(parseResult.measures[1].isLineBreak).toBe(true);
            expect(parseResult.measures[2].isLineBreak).toBe(false);
        });
    });

    describe('MODE 3: measures-per-line:N forced layout', () => {
        it('should force exactly 2 measures per line with measures-per-line:2', () => {
            const input = `measures-per-line:2 4/4
| Am[4 4 4 4] | C[4 4 4 4] | G[4 4 4 4] | F[4 4 4 4] | Em[4 4 4 4] | Dm[4 4 4 4] |`;
            
            const parseResult = parser.parse(input);
            expect(parseResult.errors).toHaveLength(0);
            expect(parseResult.measures.length).toBe(6);
            expect(parseResult.measuresPerLine).toBe(2);
            
            const svg = renderer.render(parseResult.grid, {
                measuresPerLine: parseResult.measuresPerLine
            });
            expect(svg).toBeDefined();
            
            // Le SVG devrait avoir une hauteur pour 3 lignes (6 mesures / 2 par ligne)
            const viewBox = svg.getAttribute('viewBox');
            expect(viewBox).toBeTruthy();
            const [,, width, height] = viewBox!.split(' ').map(Number);
            expect(height).toBeGreaterThan(250); // Au moins 3 lignes
        });

        it('should force exactly 3 measures per line with measures-per-line:3', () => {
            const input = `measures-per-line:3 4/4
| Am[4 4 4 4] | C[4 4 4 4] | G[4 4 4 4] | F[4 4 4 4] | Em[4 4 4 4] | Dm[4 4 4 4] |`;
            
            const parseResult = parser.parse(input);
            expect(parseResult.errors).toHaveLength(0);
            expect(parseResult.measures.length).toBe(6);
            expect(parseResult.measuresPerLine).toBe(3);
            
            const svg = renderer.render(parseResult.grid, {
                measuresPerLine: parseResult.measuresPerLine
            });
            expect(svg).toBeDefined();
            
            // Le SVG devrait avoir une hauteur pour 2 lignes (6 mesures / 3 par ligne)
            const viewBox = svg.getAttribute('viewBox');
            expect(viewBox).toBeTruthy();
            const [,, width, height] = viewBox!.split(' ').map(Number);
            expect(height).toBeGreaterThan(150); // Au moins 2 lignes
        });

        it('should respect explicit line breaks even with measures-per-line', () => {
            // If \n is present, it should be respected even with measures-per-line
            const input = `measures-per-line:4 4/4
| Am[4 4 4 4] | C[4 4 4 4] |
| G[4 4 4 4] | F[4 4 4 4] |`;
            
            const parseResult = parser.parse(input);
            expect(parseResult.errors).toHaveLength(0);
            expect(parseResult.measures.length).toBe(4);
            expect(parseResult.measuresPerLine).toBe(4);
            
            // The isLineBreak markers should be respected
            expect(parseResult.measures[1].isLineBreak).toBe(true);
            
            const svg = renderer.render(parseResult.grid, {
                measuresPerLine: parseResult.measuresPerLine
            });
            expect(svg).toBeDefined();
        });
    });

    describe('Dynamic spacing', () => {
        it('should apply spacing adjustments within readable limits', () => {
            // Test with a very short line (should be widened)
            const input = `4/4
| Am[1] | C[1] |`;
            
            const parseResult = parser.parse(input);
            const svg = renderer.render(parseResult.grid);
            expect(svg).toBeDefined();
            
            // Verify that the SVG has a reasonable width
            const viewBox = svg.getAttribute('viewBox');
            expect(viewBox).toBeTruthy();
            const [,, width] = viewBox!.split(' ').map(Number);
            expect(width).toBeGreaterThan(200); // Largeur minimum raisonnable
        });

        it('should compress spacing when forced layout creates wide lines', () => {
            // Force 8 measures on one line (should be compressed)
            const input = `measures-per-line:8 4/4
| Am[8 8 8 8 8 8 8 8] | C[8 8 8 8 8 8 8 8] | G[8 8 8 8 8 8 8 8] | F[8 8 8 8 8 8 8 8] | Em[8 8 8 8 8 8 8 8] | Dm[8 8 8 8 8 8 8 8] | Am[8 8 8 8 8 8 8 8] | C[8 8 8 8 8 8 8 8] |`;
            
            const parseResult = parser.parse(input);
            expect(parseResult.measuresPerLine).toBe(8);
            
            const svg = renderer.render(parseResult.grid, {
                measuresPerLine: parseResult.measuresPerLine
            });
            expect(svg).toBeDefined();
            
            // Rendering should not generate errors despite compression
            const viewBox = svg.getAttribute('viewBox');
            expect(viewBox).toBeTruthy();
        });
    });
});

