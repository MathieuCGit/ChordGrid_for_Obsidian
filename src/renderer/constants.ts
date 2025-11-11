/**
 * @file constants.ts
 * @description Constantes utilisées pour le rendu SVG.
 * 
 * Ce fichier centralise les valeurs constantes nécessaires au rendu,
 * notamment l'espace de noms XML pour les éléments SVG.
 * 
 * Peut être étendu avec d'autres constantes de rendu comme :
 * - Tailles de police par défaut
 * - Espacements standards
 * - Couleurs
 * - Épaisseurs de ligne
 */

/**
 * Espace de noms XML pour les éléments SVG.
 * Requis pour créer des éléments SVG avec document.createElementNS().
 */
export const SVG_NS = 'http://www.w3.org/2000/svg';

// Common SVG helper values can be added here later (default font, sizes, etc.)

/**
 * Feature flag: use analyzer-based beam overlay.
 * When true, beams are drawn from MusicAnalyzer's BeamGroup[] on top of legacy note rendering.
 */
export const USE_ANALYZER_BEAMS = true;
