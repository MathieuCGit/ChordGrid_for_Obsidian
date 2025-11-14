/**
 * @file type.ts
 * @description Définitions de types et interfaces pour le parsing et le rendu de grilles d'accords.
 * 
 * Ce fichier centralise tous les types utilisés dans le projet :
 * - Types de notes et silences
 * - Structures de beats et mesures
 * - Informations de ligatures et liaisons
 * - Types de barres de mesure
 * - Résultats de parsing et erreurs de validation
 * 
 * Ces interfaces assurent la cohérence entre le parser et le renderer.
 */

/**
 * Valeurs rythmiques supportées.
 * - 1 = ronde (whole note)
 * - 2 = blanche (half note)
 * - 4 = noire (quarter note)
 * - 8 = croche (eighth note)
 * - 16 = double-croche (sixteenth note)
 * - 32 = triple-croche (thirty-second note)
 * - 64 = quadruple-croche (sixty-fourth note)
 */
export type NoteValue = 1 | 2 | 4 | 8 | 16 | 32 | 64;

/**
 * Informations de liaison entre notes de différentes mesures.
 */
export interface TieInfo {
  fromMeasure: number;
  fromBeat: number;
  fromNote: number;
  toMeasure: number;
  toBeat: number;
  toNote: number;
}

/**
 * Élément note ou silence avec toutes ses propriétés rythmiques.
 * 
 * Propriétés de base :
 * - value : valeur rythmique (1, 2, 4, 8, 16, 32, 64)
 * - dotted : note pointée (durée × 1.5)
 * - isRest : silence plutôt que note
 * 
 * Propriétés de liaison :
 * - tieStart : début d'une liaison vers la note suivante
 * - tieEnd : fin d'une liaison depuis la note précédente
 * - tieToVoid : liaison vers note virtuelle (fin de ligne)
 * - tieFromVoid : liaison depuis note virtuelle (début de ligne)
 * - tieInfo : informations détaillées de liaison entre mesures
 * 
 * Propriétés de parsing :
 * - position : position dans le texte source
 * - length : longueur dans le texte source
 */
export interface NoteElement {
  value: NoteValue;
  dotted: boolean;
  isRest: boolean;
  tieStart: boolean;
  tieEnd: boolean;
  tieToVoid: boolean;
  tieFromVoid: boolean;
  // For cross-measure ties
  tieInfo?: TieInfo;
  // parser/runtime hints (optional)
  position?: number;
  length?: number;
  /**
   * Informations de tuplet si la note appartient à un groupe de tuplet.
   * - count : nombre de notes dans le tuplet (ex: 3 pour triolet, 5 pour quintolet)
   * - groupId : identifiant unique du groupe tuplet
   * - position : 'start' | 'middle' | 'end' (facilite le rendu du bracket et des ligatures)
   * - ratio : ratio explicite numerator:denominator (ex: {8 8 8}3:2 → {numerator: 3, denominator: 2})
   *           Si non fourni, le ratio par défaut ou automatique sera utilisé
   */
  tuplet?: {
    count: number;
    groupId: string;
    position: 'start' | 'middle' | 'end';
    ratio?: {
      numerator: number;
      denominator: number;
    };
  };
  /**
   * Flag indiquant qu'il y avait un espace lexical avant cette note dans le texte source.
   * Utilisé pour casser les ligatures de niveau supérieur dans les tuplets.
   * Ex: {161616 161616}6 → l'espace entre les groupes casse la ligature niveau 2 mais garde niveau 1
   */
  hasLeadingSpace?: boolean;
}

/**
 * Groupe de notes liées par une ligature (beam).
 * 
 * Définit les indices de début et fin des notes à relier visuellement.
 */
export interface BeamGroup {
  startIndex: number;
  endIndex: number;
  noteCount: number;
}

/**
 * Beat (temps) contenant une ou plusieurs notes/silences.
 * 
 * Un beat représente une unité de temps dans une mesure.
 * Les notes d'un même beat peuvent être groupées par des ligatures.
 */
export interface Beat {
  notes: NoteElement[];
  hasBeam: boolean;
  beamGroups: BeamGroup[];
  chord?: string;
}

/**
 * Types de barres de mesure.
 * - Single (|) : barre simple
 * - Double (||) : double barre (fin de section)
 * - RepeatStart (||:) : début de reprise
 * - RepeatEnd (:||) : fin de reprise
 */
export enum BarlineType {
  Single = '|',
  Double = '||',
  RepeatStart = '||:',
  RepeatEnd = ':||'
}

/**
 * Segment d'accord dans une mesure.
 * 
 * Une mesure peut contenir plusieurs changements d'accords.
 * Chaque segment représente un accord et les beats associés.
 */
export interface ChordSegment {
  chord: string;
  beats: Beat[];
  /** If true, there was a visible space before this segment in the source text */
  leadingSpace?: boolean;
}

/**
 * Mesure musicale complète.
 * 
 * Contient tous les beats de la mesure, l'accord principal,
 * les segments d'accords multiples, et le type de barre de mesure.
 */
export interface Measure {
  beats: Beat[];
  chord: string;
  barline: BarlineType;
  isLineBreak: boolean;
  chordSegments: ChordSegment[];
  source?: string;
}

/**
 * Signature temporelle (time signature).
 * 
 * Définit le nombre de temps par mesure et la valeur de note par temps.
 * Exemple : 4/4 = 4 temps de noire par mesure
 */
export interface TimeSignature {
  numerator: number;
  denominator: number;
  beatsPerMeasure: number;
  beatUnit: number;
}

/**
 * Grille d'accords complète parsée.
 * 
 * Structure principale retournée par le parser, contenant :
 * - La signature temporelle
 * - Toutes les mesures de la grille
 * - Les mesures regroupées en lignes pour le rendu
 */
export interface ChordGrid {
  timeSignature: TimeSignature;
  measures: Measure[];
  lines: Measure[][];
}

/**
 * Erreur de validation de mesure.
 * 
 * Générée lorsque la durée totale d'une mesure ne correspond pas
 * à la signature temporelle déclarée.
 */
export interface ValidationError {
  measureIndex: number; // 0-based
  measureSource?: string;
  expectedQuarterNotes: number;
  foundQuarterNotes: number;
  message: string;
}

/**
 * Résultat complet du parsing d'une grille d'accords.
 * 
 * Contient la grille parsée, les erreurs de validation éventuelles,
 * et la liste brute des mesures.
 */
export interface ParseResult {
  grid: ChordGrid;
  errors: ValidationError[];
  measures: Measure[];
}