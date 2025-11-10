import ChordGridPlugin from '../main_2025-11-08';
import { App, TFile } from 'obsidian';

declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;
declare const afterEach: any;

const TEST_CONTENT = `4/4
[8 8]G[8 8] | [4]Am[8 8] | [8]G[8] |
[8] G[8] | [8]F[8] G[8] |`;

describe('Ligature rendering tests', () => {
    let app: any = {};
    let file: TFile;
    let plugin: ChordGridPlugin;
    let container: HTMLElement;

    beforeEach(async () => {
        // Setup
        container = document.createElement('div');
        document.body.appendChild(container);
        
    // Create plugin instance (use minimal mocks for constructor)
    plugin = new ChordGridPlugin(app as any, {} as any);
        await plugin.onload();
    });

    afterEach(() => {
        document.body.removeChild(container);
    });

    it('should render beams correctly', () => {
        // Parse and render the test content
        plugin.renderChordGrid(TEST_CONTENT, container);

        // Get all SVG elements
        const svgElements = container.querySelectorAll('svg');
        expect(svgElements.length).toBeGreaterThan(0);

        // Verify beam elements
        const beams = container.querySelectorAll('line[stroke-width="2"]');
        console.log('Found beam elements:', beams.length);

        beams.forEach((beam, index) => {
            const x1 = parseFloat(beam.getAttribute('x1') || '0');
            const x2 = parseFloat(beam.getAttribute('x2') || '0');
            const y1 = parseFloat(beam.getAttribute('y1') || '0');
            const y2 = parseFloat(beam.getAttribute('y2') || '0');

            console.log(`Beam ${index}:`, { x1, y1, x2, y2, width: x2 - x1 });
        });
    });
});