/**
 * @file BeamAndTieAnalyzer.ts
 * @description Analyseur de ligatures et liaisons pour la notation rythmique (version autonome).
 * 
 * Cette classe utilitaire analyse les groupes rythmiques pour déterminer :
 * - Quelles notes doivent être reliées par des ligatures (beams)
 * - Comment grouper les notes selon les espaces et la valeur rythmique
 * 
 * Règles de ligature :
 * - Les notes de valeur >= 8 (croches, doubles-croches, etc.) peuvent être liées
 * - Les silences brisent les groupes de ligature
 * - Les notes longues (rondes, blanches, noires) ne sont pas liées
 * - Un groupe de ligature nécessite au moins 2 notes
 * 
 * Note : Cette classe est une version simplifiée. La version complète avec
 * gestion des liaisons (ties) est intégrée dans ChordGridParser.ts.
 * 
 * @see ChordGridParser pour la version complète avec gestion des liaisons
 */

import { NoteElement, BeamGroup } from '../parser/type';

/**
 * Analyseur de ligatures pour groupes de notes.
 */
class BeamAndTieAnalyzer {
  
  /**
   * Calcule les groupes de ligature pour un tableau de notes.
   * 
   * Parcourt les notes et crée des groupes pour les notes consécutives
   * de valeur >= 8 (croches ou plus rapide) qui ne sont pas séparées
   * par des silences.
   * 
   * @param elements - Tableau de notes/silences à analyser
   * @returns Tableau de groupes de ligature avec indices de début et fin
   * 
   * @example
   * ```typescript
   * // [croche, croche, noire, croche, croche]
   * // Résultat : groupe[0-1], pas de groupe pour la noire, groupe[3-4]
   * const groups = analyzer.calculateBeamGroups(notes);
   * ```
   */
  private calculateBeamGroups(elements: NoteElement[]): BeamGroup[] {
    const groups: BeamGroup[] = [];
    let currentGroupIndices: number[] = [];
    
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      
      // Un silence ou une note longue (<=4) brise le groupe
      if (element.isRest || element.value < 8) {
        // Sauvegarder le groupe actuel SI >= 2 notes
        if (currentGroupIndices.length >= 2) {
          groups.push({
            startIndex: currentGroupIndices[0],
            endIndex: currentGroupIndices[currentGroupIndices.length - 1],
            noteCount: currentGroupIndices.length,
          });
        }
        // Réinitialiser
        currentGroupIndices = [];
      } else {
        // Note >= 8: ajouter son INDEX au groupe courant
        currentGroupIndices.push(i);
      }
    }
    
    // Traiter le dernier groupe
    if (currentGroupIndices.length >= 2) {
      groups.push({
        startIndex: currentGroupIndices[0],
        endIndex: currentGroupIndices[currentGroupIndices.length - 1],
        noteCount: currentGroupIndices.length,
      });
    }
    
    return groups;
  }
}