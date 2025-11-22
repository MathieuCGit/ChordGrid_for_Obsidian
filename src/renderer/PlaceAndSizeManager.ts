/**
 * @file PlaceAndSizeManager.ts
 * @description Système de gestion de la position et de la taille de tous les éléments SVG.
 * 
 * Ce gestionnaire maintient un registre spatial de toutes les zones occupées (bounding boxes)
 * par les différents éléments du rendu (notes, accords, tuplets, liaisons, barlines, etc.) et
 * fournit des méthodes pour :
 * - Détecter les collisions potentielles
 * - Ajuster automatiquement les positions pour éviter les chevauchements
 * - Suggérer des emplacements optimaux pour de nouveaux éléments
 * - Calculer les dimensions globales pour le viewBox et les marges
 * 
 * @example
 * ```typescript
 * const placeMgr = new PlaceAndSizeManager();
 * 
 * // Enregistrer une zone occupée par un accord
 * placeMgr.registerElement('chord', { x: 100, y: 40, width: 30, height: 20 });
 * 
 * // Vérifier si une position cause une collision
 * const hasCollision = placeMgr.hasCollision({ x: 110, y: 45, width: 20, height: 15 });
 * 
 * // Obtenir une position ajustée pour éviter les collisions
 * const adjusted = placeMgr.findFreePosition({ x: 110, y: 45, width: 20, height: 15 }, 'vertical');
 * ```
 */

/**
 * Rectangle de bounding box représentant une zone occupée.
 */
export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Élément enregistré avec son type et sa zone.
 */
interface RegisteredElement {
    type: ElementType;
    bbox: BoundingBox;
    priority: number; // 0 = haute priorité (ne bouge pas), 10 = basse priorité (peut être déplacé)
    layer: CollisionLayer; // Couche verticale de collision
    horizontalMargin: number; // Marge horizontale de sécurité autour de l'élément (px)
    metadata?: any; // Informations supplémentaires (noteIndex, measureIndex, etc.)
}

/**
 * Élément planifié (phase de calcul, avant rendu).
 * Contient toutes les infos nécessaires pour le dessin ultérieur.
 */
export interface PlannedElement {
    type: ElementType;
    initialBBox: BoundingBox;  // Position souhaitée initiale
    adjustedBBox?: BoundingBox; // Position après ajustement pour collisions (calculée)
    priority: number;
    renderData: any; // Données spécifiques pour le rendu (texte, couleur, stroke, etc.)
    metadata?: any;
}

/**
 * Couches de collision verticale - définit quels groupes d'éléments peuvent entrer en collision verticalement.
 * 
 * Les éléments d'une même couche peuvent entrer en collision entre eux.
 * Les éléments de couches différentes n'entrent généralement pas en collision,
 * sauf configuration spécifique (ex: chord peut éviter barline si trop proche).
 * 
 * Hiérarchie verticale (du bas vers le haut) :
 * 1. staff - notes, silences, hampes, beams, ties (liaisons)
 * 2. tuplets - numéros et brackets de tuplets
 * 3. decoration - pick-strokes (∏, V)
 * 4. above-staff - accords (noms d'accords)
 * 5. above-measure - volta brackets/text
 * 6. structure - barlines (éléments verticaux transversaux)
 */
export type CollisionLayer = 
    | 'above-measure' // Volta brackets/text - au-dessus de tout le bloc
    | 'above-staff'   // Accords (noms d'accords) - au-dessus de la portée
    | 'decoration'    // Pick strokes (∏, V) - au-dessus des tuplets
    | 'tuplets'       // Tuplets brackets/numbers - au-dessus du staff
    | 'staff'         // Notes, silences, hampes, beams, ties - sur la portée
    | 'structure';    // Barlines, time signatures - structure verticale

/**
 * Types d'éléments pouvant entrer en collision.
 */
export type ElementType = 
    | 'chord'           // Symboles d'accords
    | 'time-signature'  // Indication de mesure (métrique)
    | 'note'            // Têtes de notes
    | 'stem'            // Hampes
    | 'beam'            // Barres de ligature
    | 'tie'             // Liaisons
    | 'tuplet-bracket'  // Crochets de tuplets
    | 'tuplet-number'   // Numéros/ratios de tuplets
    | 'rest'            // Silences
    | 'barline'         // Barres de mesure
    | 'staff-line'      // Ligne de portée
    | 'repeat-count'    // Compteur de reprises (x3, x2, etc.)
    | 'repeat-symbol'   // Symbole % pour mesure répétée
    | 'volta-bracket'   // Crochets de volta/endings
    | 'volta-text'      // Texte des numéros de volta (1-3, 4, etc.)
    | 'flag'            // Crochets de notes (8e, 16e sans ligature)
    | 'diamond'         // Tête de note en losange
    | 'slash'           // Barre de slash
    | 'double-bar'      // Double barre finale (||)
    | 'dot'             // Points des notes pointées
    | 'pick-stroke';    // Indications de médiator (down/up)

/**
 * Direction d'ajustement pour résoudre une collision.
 */
export type AdjustmentDirection = 'horizontal' | 'vertical' | 'both';

/**
 * Configuration du gestionnaire de position et taille.
 */
interface PlaceAndSizeConfig {
    minSpacing: number;              // Espacement minimum entre éléments (px)
    chordTupletVerticalSpacing: number; // Espacement vertical entre accords et tuplets
    noteHorizontalSpacing: number;   // Espacement horizontal entre notes
    debugMode: boolean;              // Active les logs de collision
}

/**
 * Gestionnaire de position et taille pour le rendu SVG.
 * 
 * Maintient un registre spatial de tous les éléments rendus et fournit
 * des algorithmes pour détecter et résoudre les collisions, ainsi que
 * pour calculer les dimensions globales du rendu.
 */
export class PlaceAndSizeManager {
    private elements: RegisteredElement[] = [];
    private plannedElements: PlannedElement[] = [];
    private config: PlaceAndSizeConfig;

    /**
     * Constructeur du gestionnaire de position et taille.
     * 
     * @param config - Configuration optionnelle
     */
    constructor(config?: Partial<PlaceAndSizeConfig>) {
        this.config = {
            minSpacing: 2,
            chordTupletVerticalSpacing: 8,
            noteHorizontalSpacing: 4,
            debugMode: false,
            ...config
        };
    }

    /**
     * Détermine la couche de collision appropriée pour un type d'élément.
     * 
     * @param type - Type de l'élément
     * @returns La couche de collision appropriée
     */
    private getCollisionLayer(type: ElementType): CollisionLayer {
        switch (type) {
            // Éléments au-dessus du bloc de mesures
            case 'volta-bracket':
            case 'volta-text':
                return 'above-measure';
            
            // Éléments au-dessus de la portée (noms d'accords)
            case 'chord':
            case 'repeat-count':
                return 'above-staff';
            
            // Décorations (pick-strokes uniquement)
            case 'pick-stroke':
                return 'decoration';
            
            // Tuplets (au-dessus du staff, sous les decorations)
            case 'tuplet-bracket':
            case 'tuplet-number':
                return 'tuplets';
            
            // Éléments sur la portée (notes, rests, stems, beams, ties)
            case 'note':
            case 'rest':
            case 'stem':
            case 'beam':
            case 'tie':
            case 'flag':
            case 'diamond':
            case 'slash':
            case 'dot':
            case 'staff-line':
                return 'staff';
            
            // Éléments structurels
            case 'barline':
            case 'time-signature':
            case 'double-bar':
            case 'repeat-symbol':
                return 'structure';
            
            default:
                return 'staff'; // Par défaut
        }
    }

    /**
     * Détermine la marge horizontale de sécurité pour un type d'élément.
     * 
     * Cette marge crée un "espace de sécurité" horizontal de part et d'autre de l'élément
     * pour éviter que d'autres éléments ne le touchent (surtout important pour barlines, 
     * accords, volta text, etc.).
     * 
     * @param type - Type de l'élément
     * @returns Marge horizontale en pixels
     */
    private getHorizontalMargin(type: ElementType): number {
        switch (type) {
            // Éléments critiques nécessitant un large espace
            case 'barline':
            case 'double-bar':
                return 5; // Barres de mesure : large marge pour la lisibilité
            
            case 'time-signature':
                return 4; // Chiffrage : besoin d'espace pour la lisibilité
            
            // Éléments textuels au-dessus de la portée
            case 'chord':
                return 3; // Accords : marge moyenne
            
            case 'volta-text':
            case 'repeat-count':
                return 3; // Textes volta/repeat : marge moyenne
            
            case 'tuplet-number':
                return 2; // Numéros de tuplet : petite marge
            
            // Éléments graphiques nécessitant un peu d'espace
            case 'volta-bracket':
            case 'tuplet-bracket':
                return 1; // Brackets : marge minimale
            
            // Éléments sur la portée (notes, rests)
            case 'note':
            case 'rest':
            case 'diamond':
            case 'slash':
                return 1; // Petite marge pour éviter collisions avec accords
            
            // Éléments linéaires/décoratifs sans besoin de marge
            case 'stem':
            case 'beam':
            case 'tie':
            case 'pick-stroke':
            case 'flag':
            case 'dot':
            case 'staff-line':
            case 'repeat-symbol':
                return 0; // Pas de marge horizontale
            
            default:
                return 2; // Par défaut : marge moyenne
        }
    }

    /**
     * Vérifie si deux types d'éléments ont besoin d'une protection contre les collisions HORIZONTALES.
     * 
     * Certains éléments (stem, beam, tie, staff-line) peuvent se superposer horizontalement sans problème.
     * D'autres (barlines, chords, volta-text) ont besoin d'espace horizontal protégé.
     * 
     * @param type1 - Premier type d'élément
     * @param type2 - Deuxième type d'élément
     * @returns true si les éléments ne doivent PAS se chevaucher horizontalement
     */
    private canCollideHorizontally(type1: ElementType, type2: ElementType): boolean {
        // Éléments qui peuvent TOUJOURS se superposer horizontalement (pas de collision)
        const transparentHorizontal = new Set<ElementType>([
            'stem', 'beam', 'tie', 'staff-line', 'flag'
        ]);
        
        // Si les DEUX éléments sont transparents, pas de collision
        if (transparentHorizontal.has(type1) && transparentHorizontal.has(type2)) {
            return false;
        }
        
        // Si UN élément est transparent et l'autre ne définit pas de marge horizontale, pas de collision
        const margin1 = this.getHorizontalMargin(type1);
        const margin2 = this.getHorizontalMargin(type2);
        
        if (transparentHorizontal.has(type1) && margin2 === 0) {
            return false;
        }
        if (transparentHorizontal.has(type2) && margin1 === 0) {
            return false;
        }
        
        // Sinon, collision horizontale possible
        return true;
    }

    /**
     * Vérifie si deux types d'éléments peuvent entrer en collision VERTICALE.
     * Utilise le système de layers pour déterminer si deux éléments peuvent se superposer verticalement.
     * 
     * @param type1 - Premier type d'élément
     * @param type2 - Deuxième type d'élément
     * @returns true si les éléments ne doivent PAS se chevaucher verticalement
     */
    private canCollideVertically(type1: ElementType, type2: ElementType): boolean {
        const layer1 = this.getCollisionLayer(type1);
        const layer2 = this.getCollisionLayer(type2);
        
        // Même couche : collision possible
        if (layer1 === layer2) {
            return true;
        }
        
        // Règles spéciales entre couches différentes :
        
        // above-measure (volta) peut collider avec structure (barlines)
        if ((layer1 === 'above-measure' && layer2 === 'structure') ||
            (layer1 === 'structure' && layer2 === 'above-measure')) {
            return true;
        }
        
        // above-measure (volta) peut collider avec above-staff (chord/tuplet)
        if ((layer1 === 'above-measure' && layer2 === 'above-staff') ||
            (layer1 === 'above-staff' && layer2 === 'above-measure')) {
            return true;
        }
        
        // above-staff peut collider avec structure (ex: chord évite barline)
        if ((layer1 === 'above-staff' && layer2 === 'structure') ||
            (layer1 === 'structure' && layer2 === 'above-staff')) {
            return true;
        }
        
        // staff ne collide PAS avec above-staff (séparation verticale naturelle)
        if ((layer1 === 'staff' && layer2 === 'above-staff') ||
            (layer1 === 'above-staff' && layer2 === 'staff')) {
            return false;
        }
        
        // staff ne collide PAS avec above-measure (encore plus séparé)
        if ((layer1 === 'staff' && layer2 === 'above-measure') ||
            (layer1 === 'above-measure' && layer2 === 'staff')) {
            return false;
        }
        
        // decoration ne collide PAS avec above-staff (séparation verticale)
        if ((layer1 === 'decoration' && layer2 === 'above-staff') ||
            (layer1 === 'above-staff' && layer2 === 'decoration')) {
            return false;
        }
        
        // decoration ne collide PAS avec above-measure (encore plus séparé)
        if ((layer1 === 'decoration' && layer2 === 'above-measure') ||
            (layer1 === 'above-measure' && layer2 === 'decoration')) {
            return false;
        }
        
        // Par défaut, pas de collision entre couches différentes
        return false;
    }

    /**
     * Vérifie si deux types d'éléments peuvent entrer en collision (2D: horizontal ET vertical).
     * 
     * Logique :
     * - Si les éléments sont sur des layers verticaux séparés (ex: notes vs chords) → PAS de collision
     * - Si les éléments sont sur le même layer vertical → vérifier collision horizontale
     * 
     * @param type1 - Premier type d'élément
     * @param type2 - Deuxième type d'élément
     * @returns true si les éléments peuvent entrer en collision
     */
    private canCollide(type1: ElementType, type2: ElementType): boolean {
        // D'abord vérifier si les layers verticaux permettent la collision
        const canCollideVert = this.canCollideVertically(type1, type2);
        
        // Si les layers verticaux sont séparés (pas de collision verticale possible),
        // alors pas de collision du tout
        if (!canCollideVert) {
            return false;
        }
        
        // Si les layers verticaux se chevauchent (même layer ou layers compatibles),
        // alors vérifier la collision horizontale
        return this.canCollideHorizontally(type1, type2);
    }

    /**
     * Enregistre un nouvel élément dans le gestionnaire.
     * 
     * @param type - Type de l'élément
     * @param bbox - Zone occupée par l'élément
     * @param priority - Priorité de l'élément (0 = fixe, 10 = mobile)
     * @param metadata - Métadonnées optionnelles
     * @param overrideLayer - Layer personnalisé (pour éléments dynamiques comme pick-strokes)
     */
    public registerElement(
        type: ElementType, 
        bbox: BoundingBox, 
        priority: number = 5,
        metadata?: any,
        overrideLayer?: CollisionLayer
    ): void {
        const layer = overrideLayer ?? this.getCollisionLayer(type);
        const horizontalMargin = this.getHorizontalMargin(type);
        this.elements.push({ type, bbox, priority, layer, horizontalMargin, metadata });
        
        if (this.config.debugMode) {
            console.log(`[PlaceAndSizeManager] Registered ${type}`, bbox, `layer: ${layer}, margin: ${horizontalMargin}px`);
        }
    }

    /**
     * Vérifie si une zone entre en collision avec des éléments existants.
     * 
     * @param bbox - Zone à tester
     * @param testType - Type de l'élément qu'on teste (pour vérifier canCollide)
     * @param excludeTypes - Types d'éléments à exclure de la vérification
     * @param spacing - Marge supplémentaire autour de la zone (défaut: minSpacing)
     * @returns true si collision détectée
     */
    public hasCollision(
        bbox: BoundingBox,
        testType?: ElementType,
        excludeTypes: ElementType[] = [],
        spacing?: number
    ): boolean {
        const baseMargin = spacing ?? this.config.minSpacing;
        const testMargin = testType ? this.getHorizontalMargin(testType) : 0;
        
        return this.elements.some(element => {
            if (excludeTypes.includes(element.type)) {
                return false;
            }
            // Si testType fourni, vérifier si les types peuvent entrer en collision
            if (testType && !this.canCollide(testType, element.type)) {
                return false;
            }
            
            // Combiner les marges : marge de base + marge horizontale de l'élément testé + marge de l'élément existant
            const totalMargin = baseMargin + testMargin + element.horizontalMargin;
            
            return this.boxesCollide(bbox, element.bbox, totalMargin);
        });
    }

    /**
     * Trouve tous les éléments en collision avec une zone donnée.
     * 
     * @param bbox - Zone à tester
     * @param testType - Type de l'élément qu'on teste (pour vérifier canCollide)
     * @param excludeTypes - Types d'éléments à exclure
     * @param spacing - Marge supplémentaire
     * @returns Liste des éléments en collision
     */
    public findCollisions(
        bbox: BoundingBox,
        testType?: ElementType,
        excludeTypes: ElementType[] = [],
        spacing?: number
    ): RegisteredElement[] {
        const baseMargin = spacing ?? this.config.minSpacing;
        const testMargin = testType ? this.getHorizontalMargin(testType) : 0;
        
        return this.elements.filter(element => {
            if (excludeTypes.includes(element.type)) {
                return false;
            }
            // Si testType fourni, vérifier si les types peuvent entrer en collision
            if (testType && !this.canCollide(testType, element.type)) {
                return false;
            }
            
            // Combiner les marges
            const totalMargin = baseMargin + testMargin + element.horizontalMargin;
            
            return this.boxesCollide(bbox, element.bbox, totalMargin);
        });
    }

    /**
     * Trouve une position libre pour un élément en ajustant sa position.
     * 
     * @param bbox - Zone souhaitée
     * @param testType - Type de l'élément qu'on cherche à placer
     * @param direction - Direction d'ajustement préférée
     * @param excludeTypes - Types à exclure de la détection
     * @param maxAttempts - Nombre maximum de tentatives
     * @returns Nouvelle position ajustée ou null si aucune position libre trouvée
     */
    public findFreePosition(
        bbox: BoundingBox,
        testType?: ElementType,
        direction: AdjustmentDirection = 'vertical',
        excludeTypes: ElementType[] = [],
        maxAttempts: number = 20
    ): BoundingBox | null {
        // Si pas de collision, retourner la position d'origine
        if (!this.hasCollision(bbox, testType, excludeTypes)) {
            return bbox;
        }

        const step = this.config.minSpacing + 2;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            let candidate: BoundingBox;

            if (direction === 'vertical') {
                // Essayer d'abord vers le haut, puis vers le bas
                const offset = attempt % 2 === 1 
                    ? -Math.ceil(attempt / 2) * step 
                    : Math.floor(attempt / 2) * step;
                candidate = { ...bbox, y: bbox.y + offset };
            } else if (direction === 'horizontal') {
                // Essayer d'abord vers la droite, puis vers la gauche
                const offset = attempt % 2 === 1 
                    ? Math.ceil(attempt / 2) * step 
                    : -Math.floor(attempt / 2) * step;
                candidate = { ...bbox, x: bbox.x + offset };
            } else {
                // Both: essayer les 4 directions en spirale
                const quadrant = attempt % 4;
                const distance = Math.ceil(attempt / 4) * step;
                if (quadrant === 0) candidate = { ...bbox, y: bbox.y - distance };
                else if (quadrant === 1) candidate = { ...bbox, x: bbox.x + distance };
                else if (quadrant === 2) candidate = { ...bbox, y: bbox.y + distance };
                else candidate = { ...bbox, x: bbox.x - distance };
            }

            if (!this.hasCollision(candidate, testType, excludeTypes)) {
                if (this.config.debugMode) {
                    console.log(`[PlaceAndSizeManager] Found free position after ${attempt} attempts`, candidate);
                }
                return candidate;
            }
        }

        if (this.config.debugMode) {
            console.warn(`[PlaceAndSizeManager] Could not find free position after ${maxAttempts} attempts`);
        }
        
        return null;
    }

    /**
     * Suggère un ajustement vertical optimal entre deux types d'éléments spécifiques.
     * 
     * @param elementType - Type d'élément à positionner
     * @param referenceType - Type d'élément de référence
     * @param defaultY - Position Y par défaut
     * @returns Position Y ajustée
     */
    public suggestVerticalOffset(
        elementType: ElementType,
        referenceType: ElementType,
        defaultY: number
    ): number {
        // Règles spécifiques pour certaines paires d'éléments
        if (elementType === 'tuplet-number' && referenceType === 'chord') {
            return defaultY - this.config.chordTupletVerticalSpacing;
        }

        // Chercher les éléments du type de référence
        const refElements = this.elements.filter(e => e.type === referenceType);
        if (refElements.length === 0) {
            return defaultY;
        }

        // Trouver le plus proche verticalement
        const closest = refElements.reduce((prev, curr) => {
            const prevDist = Math.abs(prev.bbox.y - defaultY);
            const currDist = Math.abs(curr.bbox.y - defaultY);
            return currDist < prevDist ? curr : prev;
        });

        // Ajuster selon la position relative
        const refBottom = closest.bbox.y + closest.bbox.height;
        if (defaultY > closest.bbox.y && defaultY < refBottom) {
            // Collision verticale, déplacer en dessous
            return refBottom + this.config.minSpacing;
        }

        return defaultY;
    }

    /**
     * Efface tous les éléments enregistrés.
     * Utile pour réinitialiser entre différentes mesures ou lignes.
     */
    public clear(): void {
        this.elements = [];
        if (this.config.debugMode) {
            console.log('[PlaceAndSizeManager] Cleared all elements');
        }
    }

    /**
     * Efface les éléments d'un type spécifique.
     * 
     * @param type - Type d'élément à effacer
     */
    public clearType(type: ElementType): void {
        const before = this.elements.length;
        this.elements = this.elements.filter(e => e.type !== type);
        if (this.config.debugMode) {
            console.log(`[PlaceAndSizeManager] Cleared ${before - this.elements.length} elements of type ${type}`);
        }
    }

    /**
     * Obtient tous les éléments enregistrés (lecture seule).
     * 
     * @returns Copie du tableau des éléments
     */
    public getElements(): ReadonlyArray<RegisteredElement> {
        return [...this.elements];
    }

    /**
     * Obtient les statistiques du gestionnaire.
     * 
     * @returns Statistiques sur les éléments enregistrés
     */
    public getStats(): { total: number; byType: Record<string, number> } {
        const byType: Record<string, number> = {};
        
        this.elements.forEach(e => {
            byType[e.type] = (byType[e.type] || 0) + 1;
        });

        return {
            total: this.elements.length,
            byType
        };
    }

    /**
     * Calcule les bounds globaux de tous les éléments enregistrés.
     * Utile pour dimensionner correctement le SVG avec des marges.
     * 
     * @returns Les coordonnées min/max de tous les éléments, ou null si aucun élément
     */
    public getGlobalBounds(): { minX: number; minY: number; maxX: number; maxY: number } | null {
        if (this.elements.length === 0) {
            return null;
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        this.elements.forEach(el => {
            const { x, y, width, height } = el.bbox;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + width);
            maxY = Math.max(maxY, y + height);
        });

        return { minX, minY, maxX, maxY };
    }

    /**
     * Vérifie si deux bounding boxes se chevauchent (avec marge optionnelle).
     * La marge est appliquée AUTOUR de chaque box (des deux côtés).
     * 
     * Exemple : box à x=150, width=15, margin=5
     *   → zone protégée : (150-5) à (150+15+5) = 145 à 170
     * 
     * @param a - Première box
     * @param b - Deuxième box
     * @param margin - Marge supplémentaire à considérer (appliquée des deux côtés)
     * @returns true si collision détectée
     */
    private boxesCollide(a: BoundingBox, b: BoundingBox, margin: number = 0): boolean {
        // Agrandir les boxes de 'margin' de chaque côté pour la comparaison
        const aExpanded = {
            x: a.x - margin,
            y: a.y - margin,
            width: a.width + 2 * margin,
            height: a.height + 2 * margin
        };
        const bExpanded = {
            x: b.x - margin,
            y: b.y - margin,
            width: b.width + 2 * margin,
            height: b.height + 2 * margin
        };
        
        // Test de collision standard (boxes ne se chevauchent PAS si...)
        return !(
            aExpanded.x + aExpanded.width < bExpanded.x ||
            bExpanded.x + bExpanded.width < aExpanded.x ||
            aExpanded.y + aExpanded.height < bExpanded.y ||
            bExpanded.y + bExpanded.height < aExpanded.y
        );
    }

    // ========== MÉTHODES DE PLANIFICATION (2-PHASE ARCHITECTURE) ==========

    /**
     * PHASE 1 (CALCUL): Planifie un élément pour le rendu.
     * Enregistre la position initiale souhaitée sans dessiner.
     * 
     * @param type - Type d'élément
     * @param initialBBox - Position/dimensions souhaitées initiales
     * @param priority - Priorité (éléments à priorité élevée fixés en premier)
     * @param renderData - Données nécessaires au rendu (texte, couleur, style, etc.)
     * @param metadata - Métadonnées optionnelles
     */
    public planElement(
        type: ElementType,
        initialBBox: BoundingBox,
        priority: number,
        renderData: any,
        metadata?: any
    ): void {
        this.plannedElements.push({
            type,
            initialBBox,
            priority,
            renderData,
            metadata
        });
    }

    /**
     * PHASE 2 (RÉSOLUTION): Résout toutes les collisions entre éléments planifiés.
     * Ajuste les positions selon les priorités et les règles de collision.
     * Doit être appelé après avoir planifié tous les éléments, avant le rendu.
     */
    public resolveAllCollisions(): void {
        // Trier par priorité décroissante (les éléments à haute priorité sont fixés en premier)
        const sorted = [...this.plannedElements].sort((a, b) => b.priority - a.priority);

        // Résoudre les collisions en ordre de priorité
        for (const planned of sorted) {
            const layer = this.getCollisionLayer(planned.type);
            const margin = this.getHorizontalMargin(planned.type);

            // Trouver les éléments déjà placés avec lesquels on peut entrer en collision
            const alreadyPlaced = this.plannedElements
                .filter(p => p.adjustedBBox && this.canCollide(p.type, planned.type))
                .map(p => p.type);

            // Chercher une position libre
            const adjustedBBox = this.findFreePosition(
                planned.initialBBox,
                planned.type,
                'horizontal',
                alreadyPlaced,
                10
            );

            planned.adjustedBBox = adjustedBBox || planned.initialBBox;

            // Enregistrer temporairement pour la détection de collision avec les éléments suivants
            this.registerElement(planned.type, planned.adjustedBBox, planned.priority, planned.metadata);
        }
    }

    /**
     * PHASE 3 (RENDU): Récupère tous les éléments planifiés avec leurs positions ajustées.
     * À utiliser dans la phase de rendu pour dessiner les éléments.
     * 
     * @returns Tableau des éléments planifiés avec positions finales
     */
    public getPlannedElements(): PlannedElement[] {
        return this.plannedElements;
    }

    /**
     * Efface tous les éléments planifiés.
     * À appeler au début d'un nouveau cycle de rendu.
     */
    public clearPlannedElements(): void {
        this.plannedElements = [];
    }

    /**
     * Efface à la fois les éléments enregistrés et planifiés.
     * Réinitialisation complète du gestionnaire.
     */
    public clearAll(): void {
        this.clear();
        this.clearPlannedElements();
    }
}
