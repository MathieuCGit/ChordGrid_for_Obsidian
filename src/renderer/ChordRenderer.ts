/**
 * @file ChordRenderer.ts
 * @description Gestionnaire du rendu des symboles d'accords.
 * 
 * Ce renderer est responsable de :
 * - Positionner les accords au-dessus des mesures
 * - Aligner les accords avec la première hampe (stem) de chaque segment rythmique
 * - Gérer les cas spéciaux (mesures répétées avec %, mesures sans rythme)
 * - Enregistrer les accords dans le PlaceAndSizeManager avec métadonnées complètes
 */

import { Measure } from '../models/Measure';
import { PlaceAndSizeManager, ChordMetadata } from './PlaceAndSizeManager';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Position calculée d'une mesure dans le rendu.
 */
export interface MeasurePosition {
    measure: Measure;
    lineIndex: number;
    posInLine: number;
    globalIndex: number;
    width: number;
    x?: number;
    y?: number;
}

/**
 * Options de rendu pour les accords.
 */
export interface ChordRenderOptions {
    /** Afficher le symbole % pour les mesures répétées */
    displayRepeatSymbol?: boolean;
    /** Taille de police pour les accords */
    fontSize?: number;
    /** Offset vertical au-dessus de la portée */
    verticalOffset?: number;
}

/**
 * Classe responsable du rendu des symboles d'accords.
 */
export class ChordRenderer {
    private readonly DEFAULT_FONT_SIZE = 16;
    private readonly DEFAULT_VERTICAL_OFFSET = 30;
    private readonly CHAR_WIDTH_RATIO = 0.53; // Estimation largeur char/fontSize

    /**
     * Constructeur du ChordRenderer.
     */
    constructor() {}

    /**
     * Estime la largeur d'un texte d'accord.
     * 
     * @param text - Texte de l'accord
     * @param fontSize - Taille de police
     * @returns Largeur estimée en pixels
     */
    private estimateTextWidth(text: string, fontSize: number): number {
        return Math.ceil(text.length * fontSize * this.CHAR_WIDTH_RATIO);
    }

    /**
     * Trouve la position X de la première hampe (stem) d'un segment.
     * Utilise les métadonnées enregistrées dans PlaceAndSizeManager.
     * 
     * @param placeAndSizeManager - Gestionnaire de placement
     * @param measureIndex - Index de la mesure
     * @param chordIndex - Index du segment/accord
     * @returns Position X de la première hampe, ou null si non trouvée
     */
    private findFirstStemX(
        placeAndSizeManager: PlaceAndSizeManager,
        measureIndex: number,
        chordIndex: number
    ): number | null {
        // Récupérer tous les stems de cette mesure
        const stems = placeAndSizeManager.getElementsByMeasure(measureIndex)
            .filter(el => el.type === 'stem' && el.metadata?.stem)
            .filter(el => el.metadata!.chordIndex === chordIndex)
            .sort((a, b) => {
                // Trier par beatIndex puis noteIndex pour trouver le premier
                const beatDiff = (a.metadata!.beatIndex ?? 0) - (b.metadata!.beatIndex ?? 0);
                if (beatDiff !== 0) return beatDiff;
                return (a.metadata!.noteIndex ?? 0) - (b.metadata!.noteIndex ?? 0);
            });

        if (stems.length === 0) {
            return null;
        }

        // Retourner la position centerX de la première hampe
        const firstStem = stems[0];
        return firstStem.metadata!.stem!.centerX;
    }

    /**
     * Rend tous les accords pour les mesures données.
     * 
     * Cette méthode est appelée APRÈS que toutes les notes/stems ont été rendues
     * et enregistrées dans le PlaceAndSizeManager, permettant un alignement précis
     * avec les hampes.
     * 
     * @param svg - Élément SVG parent
     * @param measurePositions - Positions des mesures
     * @param placeAndSizeManager - Gestionnaire de placement
     * @param options - Options de rendu
     */
    public renderChords(
        svg: SVGElement,
        measurePositions: MeasurePosition[],
        placeAndSizeManager: PlaceAndSizeManager,
        options: ChordRenderOptions = {}
    ): void {
        const fontSize = options.fontSize ?? this.DEFAULT_FONT_SIZE;
        const verticalOffset = options.verticalOffset ?? this.DEFAULT_VERTICAL_OFFSET;
        const displayRepeatSymbol = options.displayRepeatSymbol ?? false;

        measurePositions.forEach(mp => {
            if (!mp.x || !mp.y) return;

            const measure = mp.measure as any;
            const measureX = mp.x;
            const measureY = mp.y;

            // Vérifier si la mesure a des segments d'accords
            const segments = measure.chordSegments || [{ chord: measure.chord, beats: measure.beats }];

            segments.forEach((segment: any, segmentIndex: number) => {
                const chordSymbol = segment.chord;

                // Ignorer les segments sans accord (ou avec accord vide)
                if (!chordSymbol || chordSymbol === '') {
                    return;
                }

                // Chercher la position de la première hampe de ce segment
                const firstStemX = this.findFirstStemX(
                    placeAndSizeManager,
                    mp.globalIndex,
                    segmentIndex
                );

                if (firstStemX !== null) {
                    // Aligner l'accord avec la première hampe (text-anchor='start')
                    this.renderChordSymbol(
                        svg,
                        chordSymbol,
                        firstStemX,
                        measureY - verticalOffset,
                        fontSize,
                        'start',
                        placeAndSizeManager,
                        mp.globalIndex,
                        segmentIndex
                    );
                } else {
                    // Pas de hampe trouvée (mesure sans rythme ou erreur)
                    // Comportement de fallback : centrer dans le segment
                    // NOTE: Ce cas ne devrait normalement pas arriver si le rythme est bien défini
                    console.warn(
                        `[ChordRenderer] No stem found for chord "${chordSymbol}" ` +
                        `in measure ${mp.globalIndex}, segment ${segmentIndex}. ` +
                        `Using fallback centered position.`
                    );
                    
                    // Calculer une position approximative au centre du segment
                    const segmentWidth = mp.width / segments.length;
                    const segmentX = measureX + segmentIndex * segmentWidth + segmentWidth / 2;
                    
                    this.renderChordSymbol(
                        svg,
                        chordSymbol,
                        segmentX,
                        measureY - verticalOffset,
                        fontSize,
                        'middle',
                        placeAndSizeManager,
                        mp.globalIndex,
                        segmentIndex
                    );
                }
            });
        });
    }

    /**
     * Rend un symbole d'accord à la position donnée.
     * 
     * @param svg - Élément SVG parent
     * @param chordSymbol - Symbole de l'accord (ex: "C", "Am7", "G/B")
     * @param x - Position X
     * @param y - Position Y (baseline)
     * @param fontSize - Taille de police
     * @param textAnchor - Mode d'ancrage du texte
     * @param placeAndSizeManager - Gestionnaire de placement
     * @param measureIndex - Index de la mesure
     * @param chordIndex - Index du segment
     */
    private renderChordSymbol(
        svg: SVGElement,
        chordSymbol: string,
        x: number,
        y: number,
        fontSize: number,
        textAnchor: 'start' | 'middle' | 'end',
        placeAndSizeManager: PlaceAndSizeManager,
        measureIndex: number,
        chordIndex: number
    ): void {
        const chordText = document.createElementNS(SVG_NS, 'text');
        chordText.setAttribute('x', x.toString());
        chordText.setAttribute('y', y.toString());
        chordText.setAttribute('font-family', 'Arial, sans-serif');
        chordText.setAttribute('font-size', `${fontSize}px`);
        chordText.setAttribute('font-weight', 'bold');
        chordText.setAttribute('fill', '#000');
        chordText.setAttribute('text-anchor', textAnchor);
        chordText.setAttribute('class', 'chord-symbol');
        chordText.textContent = chordSymbol;
        svg.appendChild(chordText);

        // Calculer la largeur estimée du texte
        const textWidth = this.estimateTextWidth(chordSymbol, fontSize);

        // Calculer la bbox selon l'ancrage
        let bboxX: number;
        if (textAnchor === 'start') {
            bboxX = x;
        } else if (textAnchor === 'middle') {
            bboxX = x - textWidth / 2;
        } else { // 'end'
            bboxX = x - textWidth;
        }

        // Enregistrer avec métadonnées complètes
        placeAndSizeManager.registerElement('chord', {
            x: bboxX,
            y: y - fontSize,
            width: textWidth,
            height: fontSize + 4
        }, 5, {
            measureIndex,
            chordIndex,
            canCollide: true,
            chord: {
                symbol: chordSymbol,
                textX: x,
                textY: y,
                textAnchor: textAnchor,
                textWidth: textWidth,
                fontSize: fontSize
            }
        });
    }

    /**
     * Rend le symbole % pour une mesure répétée.
     * 
     * @param svg - Élément SVG parent
     * @param x - Position X (centre)
     * @param y - Position Y (baseline)
     * @param fontSize - Taille de police
     * @param placeAndSizeManager - Gestionnaire de placement
     * @param measureIndex - Index de la mesure
     * @param chordIndex - Index du segment
     */
    private renderRepeatSymbol(
        svg: SVGElement,
        x: number,
        y: number,
        fontSize: number,
        placeAndSizeManager: PlaceAndSizeManager,
        measureIndex: number,
        chordIndex: number
    ): void {
        const symbolText = document.createElementNS(SVG_NS, 'text');
        symbolText.setAttribute('x', x.toString());
        symbolText.setAttribute('y', y.toString());
        symbolText.setAttribute('font-family', 'Arial, sans-serif');
        symbolText.setAttribute('font-size', `${fontSize * 1.5}px`); // Plus grand pour %
        symbolText.setAttribute('font-weight', 'bold');
        symbolText.setAttribute('fill', '#666');
        symbolText.setAttribute('text-anchor', 'middle');
        symbolText.setAttribute('class', 'repeat-symbol');
        symbolText.setAttribute('data-repeat-symbol', 'true');
        symbolText.textContent = '%';
        svg.appendChild(symbolText);

        // Largeur approximative du symbole %
        const symbolWidth = fontSize * 1.5 * 0.6;

        // Enregistrer comme repeat-symbol
        placeAndSizeManager.registerElement('repeat-symbol', {
            x: x - symbolWidth / 2,
            y: y - fontSize * 1.5,
            width: symbolWidth,
            height: fontSize * 1.5 + 4
        }, 5, {
            measureIndex,
            chordIndex,
            canCollide: true
        });
    }
}
