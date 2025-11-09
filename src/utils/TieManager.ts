class TieManager {
  private pendingTies: Map<string, TieInfo> = new Map();
  
  interface TieInfo {
    note: Note;
    measureIndex: number;
    lineIndex: number;
    isToVoid: boolean;
  }
  
  /**
   * Traite une mesure et gère les liaisons cross-ligne
   */
  processMeasure(
    measure: Measure, 
    measureIndex: number, 
    lineIndex: number,
    isLastInLine: boolean
  ) {
    const firstBeat = measure.beats[0];
    const lastBeat = measure.beats[measure.beats.length - 1];
    
    // Vérifier liaison entrante depuis le vide
    if (firstBeat?.notes[0]?.tieFromVoid) {
      const key = `line-${lineIndex - 1}`;
      const tieInfo = this.pendingTies.get(key);
      
      if (tieInfo?.isToVoid) {
        // Confirmer que la liaison cross-ligne est complète
        console.log(`Liaison cross-ligne complétée: ligne ${lineIndex - 1} → ${lineIndex}`);
      }
    }
    
    // Enregistrer liaison sortante vers le vide
    if (lastBeat?.notes[lastBeat.notes.length - 1]?.tieToVoid) {
      const key = `line-${lineIndex}`;
      this.pendingTies.set(key, {
        note: lastBeat.notes[lastBeat.notes.length - 1],
        measureIndex,
        lineIndex,
        isToVoid: true
      });
    }
    
    // Nettoyer les liaisons résolues
    if (isLastInLine) {
      this.pendingTies.delete(`line-${lineIndex - 1}`);
    }
  }
}