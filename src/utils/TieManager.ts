/**
 * @file TieManager.ts
 * @description Gestionnaire de liaisons (ties) entre mesures et lignes.
 * 
 * Cette classe gère les liaisons qui traversent les limites de mesure
 * ou de ligne. Elle maintient une liste de liaisons "en attente" (pending)
 * qui seront résolues lorsque la note de destination sera rendue.
 * 
 * Cas d'usage :
 * - Liaison se terminant en fin de ligne (tieToVoid)
 * - Liaison démarrant en début de ligne (tieFromVoid)
 * - Liaisons traversant plusieurs mesures
 * 
 * Le TieManager permet au SVGRenderer de dessiner les courbes de liaison
 * même lorsque les notes liées ne sont pas adjacentes visuellement.
 * 
 * @example
 * ```typescript
 * const tieManager = new TieManager();
 * // En fin de ligne
 * tieManager.addPendingTie(measureIndex, x, y);
 * // Au début de la ligne suivante
 * const pending = tieManager.resolvePendingFor(measureIndex + 1);
 * if (pending) {
 *   // Dessiner la liaison de pending vers la nouvelle note
 * }
 * ```
 */

import { DebugLogger } from './DebugLogger';

/**
 * Gestionnaire de liaisons entre mesures et lignes.
 */
export class TieManager {
  // pending ties saved when a tie continues beyond the rendered area (e.g. line break)
  private pending: Array<{ measureIndex: number; x: number; y: number }> = [];

  /**
   * Ajoute une liaison en attente de résolution.
   * 
   * Utilisé lorsqu'une note se termine par une liaison "to void" en fin de ligne.
   * 
   * @param measureIndex - Index de la mesure contenant la note de départ
   * @param x - Position X de la fin de la liaison
   * @param y - Position Y de la fin de la liaison
   */
  addPendingTie(measureIndex: number, x: number, y: number) {
    DebugLogger.log('📌 Adding pending tie', { measureIndex, x, y });
    this.pending.push({ measureIndex, x, y });
    DebugLogger.log('Current pending ties', { count: this.pending.length, pending: this.pending });
  }

  /**
   * Tente de résoudre une liaison en attente pour une note commençant par "from void".
   * 
   * Recherche une liaison en attente dont l'index de mesure est strictement inférieur
   * à celui donné (car la liaison vient d'une mesure précédente).
   * 
   * @param measureIndex - Index de la mesure contenant la note d'arrivée
   * @returns La liaison en attente (et la retire de la liste) ou null si aucune
   */
  resolvePendingFor(measureIndex: number) {
    DebugLogger.log('🔍 Resolving pending tie for measure', { measureIndex, availablePending: this.pending });
    
    // find the earliest pending tie whose measureIndex is strictly less than the given one
    for (let i = 0; i < this.pending.length; i++) {
      if (this.pending[i].measureIndex < measureIndex) {
        const p = this.pending.splice(i, 1)[0];
        DebugLogger.log('✅ Resolved pending tie', { resolved: p, remaining: this.pending.length });
        return p;
      }
    }
    
    DebugLogger.warn('No pending tie found for measure', { measureIndex });
    return null;
  }

  /**
   * Efface toutes les liaisons en attente.
   * 
   * Utilisé pour réinitialiser le gestionnaire entre différents rendus.
   */
  clearPending() {
    this.pending = [];
  }
}