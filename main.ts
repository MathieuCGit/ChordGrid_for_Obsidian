/**
 * @file main.ts
 * @description Main Obsidian plugin for rendering chord grids with rhythmic notation.
 * 
 * This plugin allows displaying chord grids in musical notation with rhythmic symbols
 * (quarter notes, eighth notes, etc.) in Obsidian code blocks using the `chordgrid` language.
 * 
 * Main features:
 * - Parsing of chord grids in textual notation
 * - SVG rendering of measures with bar lines, notes, rests, beams, and ties
 * - Support for various time signatures (4/4, 3/4, 6/8, etc.)
 * - Measure duration validation
 * - Support for repeats and special bar lines
 * 
 * @example
 * ```chordgrid
 * 4/4 ||: Am[88 4 4 88] | C[2 4 4] :||
 * ```
 * 
 * @see {@link ChordGridParser} for textual notation parsing
 * @see {@link SVGRenderer} for graphical rendering of grids
 * @see README.md for complete syntax documentation
 * 
 * @author MathieuCGit
 * @version 1.0.0
 */

import { Plugin } from 'obsidian';
import { ChordGridParser } from './src/parser/ChordGridParser';
import { SVGRenderer } from './src/renderer/SVGRenderer';
// DebugLogger removed for user release

/**
 * Obsidian plugin for chord grid rendering.
 * 
 * Registers a markdown code block processor for the `chordgrid` language,
 * which parses and renders chord grids in SVG format.
 */
export default class ChordGridPlugin extends Plugin {
  /**
   * Method called when the plugin is loaded.
   * 
   * Registers the code block processor for the `chordgrid` language.
   * This processor:
   * 1. Parses the block content with ChordGridParser
   * 2. Validates measure durations against the time signature
   * 3. Displays validation errors if any
   * 4. Renders the grid as SVG with SVGRenderer
   * 
   * In case of parsing error, displays a formatted error message.
   */
  async onload() {
    console.log('Loading Chord Grid Plugin');

    this.registerMarkdownCodeBlockProcessor(
      'chordgrid',
      (source, el, ctx) => {
        try {
          // DebugLogger removed

          const parser = new ChordGridParser();
          const result = parser.parse(source);
          const grid = result.grid;

          // DebugLogger removed

          // If there are validation errors, render them (but still render the grid)
          if (result.errors && result.errors.length > 0) {
            // DebugLogger removed
            const pre = el.createEl('pre', { cls: 'chord-grid-error' });
            pre.setText('Rhythm validation errors:\n' + result.errors.map(e => e.message).join('\n'));
          }

          // DebugLogger removed
          const renderer = new SVGRenderer();
          const svg = renderer.render(grid, {
            stemsDirection: result.stemsDirection,
            displayRepeatSymbol: result.displayRepeatSymbol,
            pickStrokes: result.picksMode,
            measuresPerLine: result.measuresPerLine
          });
          el.appendChild(svg);
        } catch (err) {
          // DebugLogger removed
          const error = err as Error;
          el.createEl('pre', {
            text: `Error: ${error?.message ?? String(err)}`,
            cls: 'chord-grid-error'
          });
        }
      }
    );
  }

  /**
   * Method called when the plugin is unloaded.
   * 
   * Allows cleaning up resources if necessary.
   */
  onunload() {
    console.log('Unloading Chord Grid Plugin');
  }
}