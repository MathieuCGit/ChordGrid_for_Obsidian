import { Beat as IBeat, NoteElement, BeamGroup } from '../parser/type';
import { Note } from './Note';

/**
 * Beat.ts
 * Représentation d'un beat (une unité de temps musicale contenant une ou plusieurs notes)
 */
export class Beat implements IBeat {
  notes: NoteElement[];
  hasBeam: boolean;
  beamGroups: BeamGroup[];
  chord?: string;

  constructor(notes: NoteElement[] = [], chord?: string) {
    this.notes = notes.map(n => new Note(n));
    this.hasBeam = false;
    this.beamGroups = [];
    this.chord = chord;
  }

  /**
   * Somme des durées des notes de ce beat, en quarter-notes.
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
