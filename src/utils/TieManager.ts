/**
 * @file TieManager.ts
 * @description Manager for ties between measures and lines.
 * 
 * This class manages ties that cross measure or line boundaries.
 * It maintains a list of "pending" ties that will be resolved
 * when the destination note is rendered.
 * 
 * Use cases:
 * - Tie ending at the end of a line (tieToVoid)
 * - Tie starting at the beginning of a line (tieFromVoid)
 * - Ties crossing multiple measures
 * 
 * The TieManager allows SVGRenderer to draw tie curves
 * even when tied notes are not visually adjacent.
 * 
 * @example
 * ```typescript
 * const tieManager = new TieManager();
 * // At end of line
 * tieManager.addPendingTie(measureIndex, x, y);
 * // At beginning of next line
 * const pending = tieManager.resolvePendingFor(measureIndex + 1);
 * if (pending) {
 *   // Draw tie from pending to new note
 * }
 * ```
 */

/**
 * Manager for ties between measures and lines.
 */
export class TieManager {
  // pending ties saved when a tie continues beyond the rendered area (e.g. line break)
  private pending: Array<{ measureIndex: number; x: number; y: number }> = [];

  /**
   * Adds a tie awaiting resolution.
   * 
   * Used when a note ends with a "to void" tie at the end of a line.
   * 
   * @param measureIndex - Index of the measure containing the start note
   * @param x - X position of the tie end
   * @param y - Y position of the tie end
   */
  addPendingTie(measureIndex: number, x: number, y: number) {
    this.pending.push({ measureIndex, x, y });
  }

  /**
   * Attempts to resolve a pending tie for a note starting with "from void".
   * 
   * Searches for a pending tie whose measure index is strictly less than
   * the given one (since the tie comes from a previous measure).
   * 
   * @param measureIndex - Index of the measure containing the destination note
   * @returns The pending tie (and removes it from the list) or null if none
   */
  resolvePendingFor(measureIndex: number) {
    // find the earliest pending tie whose measureIndex is strictly less than the given one
    for (let i = 0; i < this.pending.length; i++) {
      if (this.pending[i].measureIndex < measureIndex) {
        const p = this.pending.splice(i, 1)[0];
        return p;
      }
    }
    
    return null;
  }

  /**
   * Clears all pending ties.
   * 
   * Used to reset the manager between different renders.
   */
  clearPending() {
    this.pending = [];
  }
}