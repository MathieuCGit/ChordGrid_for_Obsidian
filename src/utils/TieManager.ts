export class TieManager {
  // pending ties saved when a tie continues beyond the rendered area (e.g. line break)
  private pending: Array<{ measureIndex: number; x: number; y: number }> = [];

  addPendingTie(measureIndex: number, x: number, y: number) {
    this.pending.push({ measureIndex, x, y });
  }

  /**
   * Try to resolve a pending tie for a note that begins from void (tieFromVoid).
   * Returns the pending tie (and removes it) or null.
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

  clearPending() {
    this.pending = [];
  }
}