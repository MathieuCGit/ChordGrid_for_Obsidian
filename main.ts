import { Plugin } from 'obsidian';
import { ChordGridParser } from './src/parser/ChordGridParser';
import { SVGRenderer } from './src/renderer/SVGRenderer';

export default class ChordGridPlugin extends Plugin {
  async onload() {
    console.log('Loading Chord Grid Plugin');

    this.registerMarkdownCodeBlockProcessor(
      'chordgrid',
      (source, el, ctx) => {
        try {
          const parser = new ChordGridParser();
          const result = parser.parse(source);
          const grid = result.grid;

          // If there are validation errors, render them (but still render the grid)
          if (result.errors && result.errors.length > 0) {
            const pre = el.createEl('pre', { cls: 'chord-grid-error' });
            pre.setText('Rhythm validation errors:\n' + result.errors.map(e => e.message).join('\n'));
          }

          const renderer = new SVGRenderer();
          const svg = renderer.render(grid);

          el.appendChild(svg);
        } catch (err) {
          const error = err as Error;
          el.createEl('pre', {
            text: `Erreur: ${error?.message ?? String(err)}`,
            cls: 'chord-grid-error'
          });
        }
      }
    );
  }

  onunload() {
    console.log('Unloading Chord Grid Plugin');
  }
}