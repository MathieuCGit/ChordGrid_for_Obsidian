import { Measure as IMeasure, Beat as IBeat, BarlineType, ChordSegment } from '../parser/type';
import { Beat } from './Beat';

/**
 * @file Measure.ts
 * @description Représentation d'une mesure musicale.
 * 
 * Une mesure est une unité structurelle de la musique qui contient un certain
 * nombre de beats selon la signature temporelle. Elle est délimitée par des
 * barres de mesure qui peuvent être simples, doubles, ou indiquer des reprises.
 * 
 * Propriétés :
 * - beats : Tableau de beats contenus dans la mesure
 * - chord : Accord principal de la mesure (pour compatibilité)
 * - chordSegments : Segments d'accords multiples dans la mesure
 * - barline : Type de barre de mesure (simple, double, reprise début/fin)
 * - isLineBreak : Indique si un saut de ligne doit suivre cette mesure
 * - source : Texte source ayant généré cette mesure (pour débogage)
 * 
 * @example
 * ```typescript
 * // Mesure 4/4 avec quatre noires sur Am
 * const measure = new Measure({
 *   beats: [beat1, beat2, beat3, beat4],
 *   chord: "Am",
 *   barline: BarlineType.Single
 * });
 * ```
 */
export class Measure implements IMeasure {
  beats: IBeat[];
  chord: string;
  barline: BarlineType;
  isLineBreak: boolean;
  chordSegments: ChordSegment[];
  source?: string;

  /**
   * Constructeur d'une mesure.
   * 
   * @param data - Données partielles pour initialiser la mesure
   */
  constructor(data: Partial<IMeasure> = {}) {
    this.beats = (data.beats || []).map(b => new Beat(b.notes, (b as any).chord)) as unknown as IBeat[];
    this.chord = data.chord || '';
    this.barline = data.barline || (BarlineType.Single as BarlineType);
    this.isLineBreak = Boolean((data as any).isLineBreak || (data as any).lineBreakAfter);
    this.chordSegments = data.chordSegments || [];
    this.source = data.source;
  }

  /**
   * Calcule la durée totale de la mesure en unités de noires (quarter-notes).
   * 
   * Additionne les durées de tous les beats de la mesure.
   * Utile pour valider que la mesure respecte la signature temporelle.
   * 
   * @returns Durée totale en quarter-notes
   * 
   * @example
   * // Mesure 4/4 avec 4 noires = 4 quarter-notes
   * // Mesure 3/4 avec 3 noires = 3 quarter-notes
   * // Mesure 6/8 avec 6 croches = 3 quarter-notes
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
