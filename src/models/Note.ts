import { NoteElement, NoteValue } from '../parser/type';

/**
 * Note.ts
 * Représentation d'une note (ou d'un silence) au niveau métier.
 * Cette classe implémente l'interface `NoteElement` définie dans `src/parser/type.ts`.
 */
export class Note implements NoteElement {
  value: NoteValue;
  dotted: boolean;
  isRest: boolean;
  tieStart: boolean;
  tieEnd: boolean;
  tieToVoid: boolean;
  tieFromVoid: boolean;
  position?: number;
  length?: number;

  constructor(data: Partial<NoteElement> = {}) {
    this.value = (data.value ?? 4) as NoteValue;
    this.dotted = Boolean(data.dotted);
    this.isRest = Boolean(data.isRest);
    this.tieStart = Boolean(data.tieStart);
    this.tieEnd = Boolean(data.tieEnd);
    this.tieToVoid = Boolean(data.tieToVoid);
    this.tieFromVoid = Boolean(data.tieFromVoid);
    this.position = data.position;
    this.length = data.length;
  }

  /**
   * Retourne la durée de la note en unités de noire (quarter-notes).
   */
  durationInQuarterNotes(): number {
    const baseWhole = 1 / (this.value || 4);
    const dottedMultiplier = this.dotted ? 1.5 : 1;
    return baseWhole * dottedMultiplier * 4;
  }
}
