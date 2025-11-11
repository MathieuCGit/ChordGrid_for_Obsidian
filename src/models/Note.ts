import { NoteElement, NoteValue } from '../parser/type';

/**
 * @file Note.ts
 * @description Représentation d'une note ou d'un silence musical.
 * 
 * Cette classe implémente l'interface `NoteElement` et représente une note
 * individuelle avec toutes ses propriétés rythmiques et de liaison.
 * 
 * Propriétés principales :
 * - value : Valeur rythmique (1=ronde, 2=blanche, 4=noire, 8=croche, etc.)
 * - dotted : Indique si la note est pointée (durée × 1.5)
 * - isRest : Indique s'il s'agit d'un silence plutôt qu'une note
 * - tieStart/tieEnd : Marque le début/fin d'une liaison
 * - tieToVoid/tieFromVoid : Liaisons vers/depuis une note virtuelle (fin/début de ligne)
 * - position/length : Position dans le texte source (pour débogage)
 * 
 * @example
 * ```typescript
 * // Croche pointée
 * const note = new Note({ value: 8, dotted: true, isRest: false });
 * 
 * // Silence (soupir = noire de silence)
 * const rest = new Note({ value: 4, isRest: true });
 * 
 * // Note avec liaison
 * const tiedNote = new Note({ value: 4, tieStart: true });
 * ```
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

  /**
   * Constructeur d'une note.
   * 
   * @param data - Données partielles pour initialiser la note
   *               Par défaut : value=4 (noire), dotted=false, isRest=false
   */
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
   * Calcule la durée de la note en unités de noires (quarter-notes).
   * 
   * Formule :
   * - Durée de base = 4 / value (ex: noire=1, croche=0.5, blanche=2)
   * - Si pointée : durée × 1.5
   * 
   * @returns Durée en quarter-notes
   * 
   * @example
   * // Noire = 1 quarter-note
   * new Note({ value: 4 }).durationInQuarterNotes() // 1
   * 
   * // Croche = 0.5 quarter-note
   * new Note({ value: 8 }).durationInQuarterNotes() // 0.5
   * 
   * // Noire pointée = 1.5 quarter-notes
   * new Note({ value: 4, dotted: true }).durationInQuarterNotes() // 1.5
   * 
   * // Blanche = 2 quarter-notes
   * new Note({ value: 2 }).durationInQuarterNotes() // 2
   */
  durationInQuarterNotes(): number {
    const baseWhole = 1 / (this.value || 4);
    const dottedMultiplier = this.dotted ? 1.5 : 1;
    return baseWhole * dottedMultiplier * 4;
  }
}
