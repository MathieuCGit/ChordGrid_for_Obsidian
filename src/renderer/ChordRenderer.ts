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
 * Options de rendu pour les accords en mode chord-only.
 */
interface ChordOnlyRenderOptions {
    /** Position de la mesure */
    measureX: number;
    measureY: number;
    measureWidth: number;
    /** Index global de la mesure */
    measureIndex: number;
}

/**
 * Classe responsable du rendu des symboles d'accords.
 */
export class ChordRenderer {
    private readonly DEFAULT_FONT_SIZE = 24;
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
     * Trouve la position X du début de la première note d'un segment.
     * Utilise les métadonnées enregistrées dans PlaceAndSizeManager.
     * Retourne headLeftX (début gauche de la tête de note) pour un alignement visuel optimal.
     * 
     * @param placeAndSizeManager - Gestionnaire de placement
     * @param measureIndex - Index de la mesure
     * @param chordIndex - Index du segment/accord
     * @returns Position X du début de la première note, ou null si non trouvée
     */
    private findFirstNoteX(
        placeAndSizeManager: PlaceAndSizeManager,
        measureIndex: number,
        chordIndex: number
    ): number | null {
        // Récupérer toutes les notes de cette mesure
        const notes = placeAndSizeManager.getElementsByMeasure(measureIndex)
            .filter(el => el.type === 'note')
            .filter(el => el.metadata?.chordIndex === chordIndex)
            .sort((a, b) => {
                // Trier par beatIndex puis noteIndex pour trouver la première
                const beatDiff = (a.metadata!.beatIndex ?? 0) - (b.metadata!.beatIndex ?? 0);
                if (beatDiff !== 0) return beatDiff;
                return (a.metadata!.noteIndex ?? 0) - (b.metadata!.noteIndex ?? 0);
            });

        if (notes.length === 0) {
            return null;
        }

        // Retourner la position x (début gauche) de la première note
        // Le bbox.x correspond à headLeftX de la note
        const firstNote = notes[0];
        return firstNote.bbox.x;
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
        
        // Staff line is at measureY + 80 (see MeasureRenderer.ts line 85)
        const STAFF_LINE_OFFSET = 80;

        measurePositions.forEach(mp => {
            if (!mp.x || !mp.y) return;

            const measure = mp.measure as any;
            const measureX = mp.x;
            const measureY = mp.y;
            
            // Handle chord-only measures with special positioning
            if (measure.__isChordOnlyMode) {
                this.renderChordOnlyMeasure(svg, mp, placeAndSizeManager);
                return;
            }
            
            const staffLineY = measureY + STAFF_LINE_OFFSET;

            // Vérifier si la mesure a des segments d'accords
            const segments = measure.chordSegments || [{ chord: measure.chord, beats: measure.beats }];

            segments.forEach((segment: any, segmentIndex: number) => {
                const chordSymbol = segment.chord;

                // Ignorer les segments sans accord (ou avec accord vide)
                if (!chordSymbol || chordSymbol === '') {
                    return;
                }

                // Chercher la position de la première note de ce segment
                const firstNoteX = this.findFirstNoteX(
                    placeAndSizeManager,
                    mp.globalIndex,
                    segmentIndex
                );

                if (firstNoteX !== null) {
                    // Aligner l'accord avec le début de la première note (text-anchor='start')
                    this.renderChordSymbol(
                        svg,
                        chordSymbol,
                        firstNoteX,
                        staffLineY - verticalOffset,
                        fontSize,
                        'start',
                        placeAndSizeManager,
                        mp.globalIndex,
                        segmentIndex
                    );
                } else if (measure.__hasRepeatSymbol) {
                    // Mesure avec symbole % : pas de notes réelles
                    // Si 1 seul accord : positionner à gauche au début de la mesure
                    // Si plusieurs accords : les distribuer horizontalement
                    
                    if (segments.length === 1) {
                        // Un seul accord : au début de la mesure
                        const defaultNoteX = measureX + 20; // Position standard de la première note
                        
                        this.renderChordSymbol(
                            svg,
                            chordSymbol,
                            defaultNoteX,
                            staffLineY - verticalOffset,
                            fontSize,
                            'start',
                            placeAndSizeManager,
                            mp.globalIndex,
                            segmentIndex
                        );
                    } else {
                        // Plusieurs accords : distribuer horizontalement
                        const segmentWidth = mp.width / segments.length;
                        const chordX = measureX + segmentIndex * segmentWidth + 20; // 20px marge à gauche
                        
                        this.renderChordSymbol(
                            svg,
                            chordSymbol,
                            chordX,
                            staffLineY - verticalOffset,
                            fontSize,
                            'start',
                            placeAndSizeManager,
                            mp.globalIndex,
                            segmentIndex
                        );
                    }
                } else {
                    // Pas de note trouvée (mesure sans rythme ou erreur)
                    // Comportement de fallback : centrer dans le segment
                    // NOTE: Ce cas ne devrait normalement pas arriver si le rythme est bien défini
                    console.warn(
                        `[ChordRenderer] No note found for chord "${chordSymbol}" ` +
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
                        staffLineY - verticalOffset,
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
        // Replace # and b with proper music symbols ♯ and ♭
        let processedChord = chordSymbol.replace(/#/g, '♯').replace(/\bb\b/g, '♭');
        // Also handle 'b' when followed by a number (like b9, b5) or at end of quality (like Cmb5)
        processedChord = processedChord.replace(/b([0-9])/g, '♭$1');
        processedChord = processedChord.replace(/([A-G])b([^0-9]|$)/g, '$1♭$2');
        
        const chordText = document.createElementNS(SVG_NS, 'text');
        chordText.setAttribute('x', x.toString());
        chordText.setAttribute('y', y.toString());
        chordText.setAttribute('font-family', 'Arial, sans-serif');
        chordText.setAttribute('font-size', `${fontSize}px`);
        chordText.setAttribute('font-weight', 'bold');
        chordText.setAttribute('fill', '#000');
        chordText.setAttribute('text-anchor', textAnchor);
        chordText.setAttribute('class', 'chord-symbol');
        
        // Parse chord structure: Root + Quality + Superstructures + Bass
        // Root: A-G with optional ♯/♭ (always at start)
        // Quality: M, m, maj, min, dim, aug, etc. (immediately after root)
        // Superstructures: 7, 9, 11, 13, sus, add, (b9), etc. (render smaller)
        // Bass: /Note (render smaller)
        
        const rootMatch = processedChord.match(/^[A-G][♯♭]?/);
        if (!rootMatch) {
            // Fallback: render as-is if parsing fails
            chordText.textContent = processedChord;
            svg.appendChild(chordText);
            const textWidth = this.estimateTextWidth(processedChord, fontSize);
            this.registerChordBBox(chordText, x, y, textWidth, fontSize, textAnchor, placeAndSizeManager, measureIndex, chordIndex, processedChord);
            return;
        }
        
        const root = rootMatch[0];
        let remaining = processedChord.substring(root.length);
        
        // Extract quality - including mM (minor with major 7th), mmaj, mMaj, Mmaj, etc.
        // Order matters: check longer patterns first (mMaj, mmaj) before shorter ones (M, m, maj, min)
        // Quality will be rendered with superstructures (smaller size)
        const qualityMatch = remaining.match(/^(mMaj|mmaj|mM|Mmaj|major|minor|maj|min|dim|aug|M|m|ø|o|\+|\-)/);
        const quality = qualityMatch ? qualityMatch[0] : '';
        remaining = remaining.substring(quality.length);
        
        // Extract bass note (everything after last /)
        let bass = '';
        const lastSlashIndex = remaining.lastIndexOf('/');
        if (lastSlashIndex !== -1) {
            bass = remaining.substring(lastSlashIndex); // includes the "/"
            remaining = remaining.substring(0, lastSlashIndex);
        }
        
        // Everything else is superstructures (7, 9, sus4, add9, (b9), etc.)
        const superstructures = remaining;
        
        // Render: root only (normal size) - just the note letter and accidental
        const mainNode = document.createTextNode(root);
        chordText.appendChild(mainNode);
        
        // Render: quality + superstructures (smaller, 75% of main size)
        // Special handling: if multiple parentheses groups exist, stack them vertically
        const qualityAndSuper = quality + superstructures;
        if (qualityAndSuper.length > 0) {
            // Check if there are multiple parentheses groups: (xxx)(yyy)
            const parenGroups = qualityAndSuper.match(/\([^)]+\)/g);
            
            if (parenGroups && parenGroups.length > 1) {
                // Multiple parentheses: stack them vertically to the right
                // Extract the part before first parenthesis (quality + base extensions like "7")
                const firstParenIndex = qualityAndSuper.indexOf('(');
                const beforeParens = qualityAndSuper.substring(0, firstParenIndex);
                
                // Render: quality + base extensions (before parentheses) - normal superstructure size
                if (beforeParens.length > 0) {
                    const beforeSpan = document.createElementNS(SVG_NS, 'tspan');
                    beforeSpan.setAttribute('font-size', `${Math.round(fontSize * 0.75)}px`);
                    beforeSpan.textContent = beforeParens;
                    chordText.appendChild(beforeSpan);
                }
                
                // Calculate x position for stacked parentheses (to the right of main chord with spacing)
                const mainTextWidth = this.estimateTextWidth(root + beforeParens, fontSize * 0.75);
                const stackX = x + mainTextWidth + 12; // Add 12px spacing to avoid collision with extensions
                
                // Render each parenthesis group stacked vertically, small but readable
                parenGroups.forEach((group, index) => {
                    const parenSpan = document.createElementNS(SVG_NS, 'tspan');
                    parenSpan.setAttribute('font-size', `${Math.round(fontSize * 0.65)}px`); // 65% for better readability
                    parenSpan.setAttribute('x', stackX.toString()); // Align all at same x
                    
                    // Vertical positioning: first one slightly above baseline, second below
                    if (index === 0) {
                        parenSpan.setAttribute('dy', '-0.5em'); // First parenthesis goes up
                    } else {
                        parenSpan.setAttribute('dy', '1.2em'); // Next ones go down relative to previous
                    }
                    
                    parenSpan.textContent = group;
                    chordText.appendChild(parenSpan);
                });
            } else {
                // Single or no parentheses: render normally
                const superSpan = document.createElementNS(SVG_NS, 'tspan');
                superSpan.setAttribute('font-size', `${Math.round(fontSize * 0.75)}px`);
                superSpan.textContent = qualityAndSuper;
                chordText.appendChild(superSpan);
            }
        }
        
        // Render: bass note (smaller, 83% of main size)
        if (bass.length > 0) {
            const bassSpan = document.createElementNS(SVG_NS, 'tspan');
            bassSpan.setAttribute('font-size', `${Math.round(fontSize * 0.83)}px`);
            bassSpan.textContent = bass;
            chordText.appendChild(bassSpan);
        }
        
        svg.appendChild(chordText);

        // Calculer la largeur estimée du texte (approximation with mixed sizes)
        const textWidth = this.estimateTextWidth(processedChord, fontSize);
        this.registerChordBBox(chordText, x, y, textWidth, fontSize, textAnchor, placeAndSizeManager, measureIndex, chordIndex, processedChord);
    }
    
    /**
     * Helper method to register chord bounding box in PlaceAndSizeManager
     */
    private registerChordBBox(
        chordText: SVGTextElement,
        x: number,
        y: number,
        textWidth: number,
        fontSize: number,
        textAnchor: 'start' | 'middle' | 'end',
        placeAndSizeManager: PlaceAndSizeManager,
        measureIndex: number,
        chordIndex: number,
        chordSymbol: string
    ): void {
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
     * Renders chords for a chord-only measure (no rhythm notation).
     * Uses special positioning logic based on the number of chord segments.
     * 
     * @param svg - Parent SVG element
     * @param measurePosition - Measure position info
     * @param placeAndSizeManager - Placement manager
     */
    private renderChordOnlyMeasure(
        svg: SVGElement,
        measurePosition: MeasurePosition,
        placeAndSizeManager: PlaceAndSizeManager
    ): void {
        const measure = measurePosition.measure as any;
        const measureX = measurePosition.x!;
        const measureY = measurePosition.y!;
        const measureWidth = measurePosition.width;
        const measureIndex = measurePosition.globalIndex;

        const segments = measure.chordSegments || [];
        const chordCount = segments.length;

        if (chordCount === 0) {
            // No chords to render
            return;
        } else if (chordCount === 1) {
            // Single chord: center it in the measure
            const chord = segments[0].chord;
            const chordX = measureX + measureWidth / 2;
            const chordY = measureY + 60; // Vertically centered (no staff line)
            const fontSize = 28; // Larger font for chord-only mode
            
            this.renderChordSymbol(
                svg,
                chord,
                chordX,
                chordY,
                fontSize,
                'middle',
                placeAndSizeManager,
                measureIndex,
                0
            );
        } else if (chordCount === 2) {
            // Special case: 2 chords with diagonal positioning
            const fontSize = 28; // Same size as single chord for consistency
            
            // First chord: left side, ABOVE the diagonal line (top-left)
            // Use 0.35 instead of 0.25 to avoid collision with left barline for complex chords
            const chord1 = segments[0].chord;
            const chord1X = measureX + measureWidth * 0.35;
            const chord1Y = measureY + 25;
            
            this.renderChordSymbol(
                svg,
                chord1,
                chord1X,
                chord1Y,
                fontSize,
                'middle',
                placeAndSizeManager,
                measureIndex,
                0
            );
            
            // Second chord: right side, BELOW the diagonal line (bottom-right)
            // Use 0.65 instead of 0.75 to avoid collision with right barline for complex chords
            const chord2 = segments[1].chord;
            const chord2X = measureX + measureWidth * 0.65;
            const chord2Y = measureY + 95;
            
            this.renderChordSymbol(
                svg,
                chord2,
                chord2X,
                chord2Y,
                fontSize,
                'middle',
                placeAndSizeManager,
                measureIndex,
                1
            );
        } else {
            // Multiple chords (3+): distribute them horizontally
            const availableWidth = measureWidth - 20; // margins
            const chordSpacing = availableWidth / chordCount;
            const fontSize = 28; // Same size as single chord for consistency
            
            segments.forEach((segment: any, idx: number) => {
                const chord = segment.chord;
                if (!chord) return;
                
                const chordX = measureX + 10 + chordSpacing * (idx + 0.5);
                const chordY = measureY + 60; // Vertically centered
                
                this.renderChordSymbol(
                    svg,
                    chord,
                    chordX,
                    chordY,
                    fontSize,
                    'middle',
                    placeAndSizeManager,
                    measureIndex,
                    idx
                );
            });
        }
    }

}
