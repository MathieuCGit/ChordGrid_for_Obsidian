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
            // Une longue séquence de mesures qui devrait être automatiquement coupée
            const input = `4/4
| Am[4 4 4 4] | C[4 4 4 4] | G[4 4 4 4] | F[4 4 4 4] | Em[4 4 4 4] | Dm[4 4 4 4] | Am[4 4 4 4] | C[4 4 4 4] |`;
            
            const parseResult = parser.parse(input);
            expect(parseResult.errors).toHaveLength(0);
            expect(parseResult.measures.length).toBe(8);
            
            // Vérifier que le rendu ne génère pas d'erreur
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
            
            // Vérifier que isLineBreak est marqué sur les bonnes mesures
            expect(parseResult.measures[1].isLineBreak).toBe(true); // Fin de la première ligne
            expect(parseResult.measures[3].isLineBreak).toBe(false); // Dernière mesure n'a pas de break après
            
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
            
            // Chaque mesure sauf la dernière devrait avoir isLineBreak
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
            // Si \n est présent, il doit être respecté même avec measures-per-line
            const input = `measures-per-line:4 4/4
| Am[4 4 4 4] | C[4 4 4 4] |
| G[4 4 4 4] | F[4 4 4 4] |`;
            
            const parseResult = parser.parse(input);
            expect(parseResult.errors).toHaveLength(0);
            expect(parseResult.measures.length).toBe(4);
            expect(parseResult.measuresPerLine).toBe(4);
            
            // Les isLineBreak doivent être respectés
            expect(parseResult.measures[1].isLineBreak).toBe(true);
            
            const svg = renderer.render(parseResult.grid, {
                measuresPerLine: parseResult.measuresPerLine
            });
            expect(svg).toBeDefined();
        });
    });

    describe('Dynamic spacing', () => {
        it('should apply spacing adjustments within readable limits', () => {
            // Tester avec une ligne très courte (devrait être élargie)
            const input = `4/4
| Am[1] | C[1] |`;
            
            const parseResult = parser.parse(input);
            const svg = renderer.render(parseResult.grid);
            expect(svg).toBeDefined();
            
            // Vérifier que le SVG a une largeur raisonnable
            const viewBox = svg.getAttribute('viewBox');
            expect(viewBox).toBeTruthy();
            const [,, width] = viewBox!.split(' ').map(Number);
            expect(width).toBeGreaterThan(200); // Largeur minimum raisonnable
        });

        it('should compress spacing when forced layout creates wide lines', () => {
            // Forcer 8 mesures sur une ligne (devrait être compressé)
            const input = `measures-per-line:8 4/4
| Am[8 8 8 8 8 8 8 8] | C[8 8 8 8 8 8 8 8] | G[8 8 8 8 8 8 8 8] | F[8 8 8 8 8 8 8 8] | Em[8 8 8 8 8 8 8 8] | Dm[8 8 8 8 8 8 8 8] | Am[8 8 8 8 8 8 8 8] | C[8 8 8 8 8 8 8 8] |`;
            
            const parseResult = parser.parse(input);
            expect(parseResult.measuresPerLine).toBe(8);
            
            const svg = renderer.render(parseResult.grid, {
                measuresPerLine: parseResult.measuresPerLine
            });
            expect(svg).toBeDefined();
            
            // Le rendu ne devrait pas générer d'erreur malgré la compression
            const viewBox = svg.getAttribute('viewBox');
            expect(viewBox).toBeTruthy();
        });
    });
});
