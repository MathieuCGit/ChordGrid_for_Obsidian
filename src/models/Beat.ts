import { Beat as IBeat, NoteElement, BeamGroup } from '../parser/type';
import { Note } from './Note';

/**
 * @file Beat.ts
 * @description Représentation d'un beat (temps musical) dans une mesure.
 * 
 * Un beat est une unité de temps musicale qui contient une ou plusieurs notes
 * ou silences. Les notes d'un même beat peuvent être liées par des ligatures
 * (beams) pour indiquer leur regroupement rythmique.
 * 
 * Propriétés :
 * - notes : Tableau de notes/silences dans ce beat
 * - hasBeam : Indique si les notes sont liées par une ligature
 * - beamGroups : Groupes de ligature pour les notes de ce beat
 * - chord : Accord associé à ce beat (optionnel)
 * 
 * @example
 * ```typescript
 * // Beat avec deux croches liées
 * const beat = new Beat([
 *   { value: 8, dotted: false, isRest: false },
 *   { value: 8, dotted: false, isRest: false }
 * ], "Am");
 * ```
 */
export class Beat implements IBeat {
  notes: NoteElement[];
  hasBeam: boolean;
  beamGroups: BeamGroup[];
  chord?: string;

  /**
   * Constructeur d'un beat.
   * 
   * @param notes - Tableau de notes/silences pour ce beat
   * @param chord - Accord associé (optionnel)
   */
  constructor(notes: NoteElement[] = [], chord?: string) {
    this.notes = notes.map(n => new Note(n));
    this.hasBeam = false;
    this.beamGroups = [];
    this.chord = chord;
  }

  /**
   * Calcule la durée totale du beat en unités de noires (quarter-notes).
   * 
   * Parcourt toutes les notes du beat et additionne leurs durées.
   * Prend en compte les notes pointées (multipliées par 1.5).
   * 
   * @returns Durée totale en quarter-notes
   * 
   * @example
   * // Beat avec une croche (1/2 noire) et une croche pointée (3/4 noire)
   * // retourne 1.25 noires
   */
  totalQuarterNotes(): number {
    return this.notes.reduce((sum, n) => {
      const note = n as Note;
      if (!note) return sum;
      // If a Note instance, use its helper, otherwise compute
      if (typeof (note as any).durationInQuarterNotes === 'function') {
        return sum + (note as any).durationInQuarterNotes();
      }
      const baseWhole = 1 / (note.value || 4);
      const dottedMultiplier = note.dotted ? 1.5 : 1;
      return sum + baseWhole * dottedMultiplier * 4;
    }, 0);
  }
}
