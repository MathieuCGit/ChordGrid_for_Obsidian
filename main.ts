/**
 * @file main.ts
 * @description Plugin principal pour Obsidian permettant le rendu de grilles d'accords avec notation rythmique.
 * 
 * Ce plugin permet d'afficher des grilles d'accords en notation musicale avec des symboles rythmiques
 * (noires, croches, etc.) dans des blocs de code Obsidian utilisant le langage `chordgrid`.
 * 
 * Fonctionnalités principales :
 * - Parsing de grilles d'accords en notation textuelle
 * - Rendu SVG des mesures avec barres de mesure, notes, silences, ligatures et liaisons
 * - Support de signatures temporelles variées (4/4, 3/4, 6/8, etc.)
 * - Validation de la durée des mesures
 * - Gestion des reprises et des barres de mesure spéciales
 * 
 * @example
 * ```chordgrid
 * 4/4 ||: Am[88 4 4 88] | C[2 4 4] :||
 * ```
 * 
 * @see {@link ChordGridParser} pour le parsing de la notation textuelle
 * @see {@link SVGRenderer} pour le rendu graphique des grilles
 * @see README.md pour la documentation complète de la syntaxe
 * 
 * @author MathieuCGit
 * @version 1.0.0
 */

import { Plugin } from 'obsidian';
import { ChordGridParser } from './src/parser/ChordGridParser';
import { SVGRenderer } from './src/renderer/SVGRenderer';
// DebugLogger supprimé pour release utilisateur

/**
 * Plugin Obsidian pour le rendu de grilles d'accords.
 * 
 * Enregistre un processeur de blocs de code markdown pour le langage `chordgrid`,
 * qui parse et rend les grilles d'accords en format SVG.
 */
export default class ChordGridPlugin extends Plugin {
  /**
   * Méthode appelée lors du chargement du plugin.
   * 
   * Enregistre le processeur de blocs de code pour le langage `chordgrid`.
   * Ce processeur :
   * 1. Parse le contenu du bloc avec ChordGridParser
   * 2. Valide la durée des mesures par rapport à la signature temporelle
   * 3. Affiche les erreurs de validation le cas échéant
   * 4. Rend la grille en SVG avec SVGRenderer
   * 
   * En cas d'erreur de parsing, affiche un message d'erreur formaté.
   */
  async onload() {
    console.log('Loading Chord Grid Plugin');

    this.registerMarkdownCodeBlockProcessor(
      'chordgrid',
      (source, el, ctx) => {
        try {
          // DebugLogger supprimé

          const parser = new ChordGridParser();
          const result = parser.parse(source);
          const grid = result.grid;

          // DebugLogger supprimé

          // If there are validation errors, render them (but still render the grid)
          if (result.errors && result.errors.length > 0) {
            // DebugLogger supprimé
            const pre = el.createEl('pre', { cls: 'chord-grid-error' });
            pre.setText('Rhythm validation errors:\n' + result.errors.map(e => e.message).join('\n'));
          }

          // DebugLogger supprimé
          const renderer = new SVGRenderer();
          const svg = renderer.render(grid, {
            stemsDirection: result.stemsDirection,
            displayRepeatSymbol: result.displayRepeatSymbol,
            pickStrokes: result.picksMode
          });
          el.appendChild(svg);
        } catch (err) {
          // DebugLogger supprimé
          const error = err as Error;
          el.createEl('pre', {
            text: `Erreur: ${error?.message ?? String(err)}`,
            cls: 'chord-grid-error'
          });
        }
      }
    );
  }

  /**
   * Méthode appelée lors du déchargement du plugin.
   * 
   * Permet de nettoyer les ressources si nécessaire.
   */
  onunload() {
    console.log('Unloading Chord Grid Plugin');
  }
}