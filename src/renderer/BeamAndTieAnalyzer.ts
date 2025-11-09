import { NoteElement, BeamGroup } from '../parser/type';

class BeamAndTieAnalyzer {
  
  /**
   * Calcule les groupes de ligature
   * Un groupe contient les INDICES des éléments à lier
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