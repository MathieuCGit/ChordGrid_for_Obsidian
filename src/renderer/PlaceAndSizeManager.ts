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
    metadata?: any; // Informations supplémentaires (noteIndex, measureIndex, etc.)
}

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
     * Enregistre un nouvel élément dans le gestionnaire.
     * 
     * @param type - Type de l'élément
     * @param bbox - Zone occupée par l'élément
     * @param priority - Priorité de l'élément (0 = fixe, 10 = mobile)
     * @param metadata - Métadonnées optionnelles
     */
    public registerElement(
        type: ElementType, 
        bbox: BoundingBox, 
        priority: number = 5,
        metadata?: any
    ): void {
        this.elements.push({ type, bbox, priority, metadata });
        
        if (this.config.debugMode) {
            console.log(`[PlaceAndSizeManager] Registered ${type}`, bbox);
        }
    }

    /**
     * Vérifie si une zone entre en collision avec des éléments existants.
     * 
     * @param bbox - Zone à tester
     * @param excludeTypes - Types d'éléments à exclure de la vérification
     * @param spacing - Marge supplémentaire autour de la zone (défaut: minSpacing)
     * @returns true si collision détectée
     */
    public hasCollision(
        bbox: BoundingBox, 
        excludeTypes: ElementType[] = [],
        spacing?: number
    ): boolean {
        const margin = spacing ?? this.config.minSpacing;
        
        return this.elements.some(element => {
            if (excludeTypes.includes(element.type)) {
                return false;
            }
            return this.boxesCollide(bbox, element.bbox, margin);
        });
    }

    /**
     * Trouve tous les éléments en collision avec une zone donnée.
     * 
     * @param bbox - Zone à tester
     * @param excludeTypes - Types d'éléments à exclure
     * @param spacing - Marge supplémentaire
     * @returns Liste des éléments en collision
     */
    public findCollisions(
        bbox: BoundingBox,
        excludeTypes: ElementType[] = [],
        spacing?: number
    ): RegisteredElement[] {
        const margin = spacing ?? this.config.minSpacing;
        
        return this.elements.filter(element => {
            if (excludeTypes.includes(element.type)) {
                return false;
            }
            return this.boxesCollide(bbox, element.bbox, margin);
        });
    }

    /**
     * Trouve une position libre pour un élément en ajustant sa position.
     * 
     * @param bbox - Zone souhaitée
     * @param direction - Direction d'ajustement préférée
     * @param excludeTypes - Types à exclure de la détection
     * @param maxAttempts - Nombre maximum de tentatives
     * @returns Nouvelle position ajustée ou null si aucune position libre trouvée
     */
    public findFreePosition(
        bbox: BoundingBox,
        direction: AdjustmentDirection = 'vertical',
        excludeTypes: ElementType[] = [],
        maxAttempts: number = 20
    ): BoundingBox | null {
        // Si pas de collision, retourner la position d'origine
        if (!this.hasCollision(bbox, excludeTypes)) {
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

            if (!this.hasCollision(candidate, excludeTypes)) {
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
     * 
     * @param a - Première box
     * @param b - Deuxième box
     * @param margin - Marge supplémentaire à considérer
     * @returns true si collision détectée
     */
    private boxesCollide(a: BoundingBox, b: BoundingBox, margin: number = 0): boolean {
        return !(
            a.x + a.width + margin < b.x ||
            b.x + b.width + margin < a.x ||
            a.y + a.height + margin < b.y ||
            b.y + b.height + margin < a.y
        );
    }
}
