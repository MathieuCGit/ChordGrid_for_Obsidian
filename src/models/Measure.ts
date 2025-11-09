import { Measure as IMeasure, Beat as IBeat, BarlineType } from '../parser/type';
import { Beat } from './Beat';

/**
 * Measure.ts
 * Représentation d'une mesure musicale (une collection de beats et métadonnées)
 */
export class Measure implements IMeasure {
  beats: IBeat[];
  chord: string;
  barline: BarlineType;
  lineBreakAfter: boolean;
  source?: string;

  constructor(data: Partial<IMeasure> = {}) {
    this.beats = (data.beats || []).map(b => new Beat(b.notes, (b as any).chord)) as unknown as IBeat[];
    this.chord = data.chord || '';
    this.barline = data.barline || (BarlineType.Single as BarlineType);
    this.lineBreakAfter = Boolean(data.lineBreakAfter);
    this.source = data.source;
  }

  /**
   * Somme des durées (en quarter-notes) de tous les beats de la mesure
   */
  totalQuarterNotes(): number {
    return this.beats.reduce((s, b) => {
      const beat = b as Beat;
      if (typeof (beat as any).totalQuarterNotes === 'function') return s + (beat as any).totalQuarterNotes();
      // fallback
      return s;
    }, 0);
  }
}
