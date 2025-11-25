# Comparaison ChordGrid vs MuseScore

## Vue d'ensemble

Ce document compare l'architecture et les implémentations de ChordGrid for Obsidian avec MuseScore, l'un des logiciels de notation musicale open-source les plus aboutis.

**Contexte** :
- **ChordGrid** : Plugin Obsidian TypeScript (~5000 lignes) spécialisé dans la notation de grilles d'accords jazz
- **MuseScore** : Application C++ complète (~500k lignes) pour notation musicale professionnelle

---

## 1. Architecture Générale

### ChordGrid (Simplicité ciblée)
```
Parser → Analyzer → Renderer
   ↓         ↓          ↓
 Beat     Tuplet    SVGRenderer
 Model    Model     + Managers
```

**Philosophie** : Architecture linéaire, rendu direct en SVG
- **Avantage** : Simplicité, rapidité d'exécution, code facile à maintenir
- **Limitation** : Pas de système de pages, pas d'édition WYSIWYG

### MuseScore (Architecture complète)
```
Score DOM ← Layout Engine → Rendering Pipeline
    ↓           ↓                  ↓
Elements → LayoutContext → Painter (QPainter)
    ↓           ↓                  ↓
Measure → BeamLayout        → DrawingApi
    ↓    → SlurTieLayout
Segment → TupletLayout
```

**Philosophie** : Séparation Model-Layout-Render, architecture multicouche
- **Avantage** : Extensibilité, édition interactive, formats multiples
- **Limitation** : Complexité élevée, courbe d'apprentissage importante

---

## 2. Gestion des Ligatures (Beams)

### ChordGrid - `MusicAnalyzer.ts`
```typescript
class MusicAnalyzer {
    public analyzeBeaming(measures: Measure[]): void {
        // Analyse par mesure
        for (const measure of measures) {
            const groups = this.groupNotesForBeaming(
                measure.beats, measure.timeSignature
            );
            // Attribution directe des niveaux de ligature
            groups.forEach(group => {
                this.assignBeamLevels(group);
            });
        }
    }
}
```

**Caractéristiques** :
- ✅ Algorithme simple et direct (1 passe)
- ✅ Groupement automatique par temps
- ✅ Gestion des tuplets intégrée
- ❌ Pas de ligatures cross-measure
- ❌ Pas de modification manuelle
- ❌ Pas d'optimisation esthétique de la pente

**Complexité** : ~200 lignes

### MuseScore - `beamlayout.cpp` + `beamtremololayout.cpp`
```cpp
class BeamLayout {
    static void layout(Beam* item, const LayoutContext& ctx);
    static void layout1(Beam* item, LayoutContext& ctx);
    static void layout2(Beam* item, const LayoutContext& ctx, 
                       const std::vector<ChordRest*>& chordRests);
    static void createBeams(LayoutContext& ctx, Measure* measure);
    static void breakCrossMeasureBeams(Measure* measure, LayoutContext& ctx);
}

class BeamTremoloLayout {
    static bool calculateAnchors(...);
    static bool calculateAnchorsCross(...);
    static int computeDesiredSlant(...);
    static void offsetBeamToRemoveCollisions(...);
}
```

**Caractéristiques** :
- ✅ Ligatures cross-staff et cross-measure
- ✅ Calcul sophistiqué de la pente (maxSlope)
- ✅ Gestion des collisions avec skylines
- ✅ Support des modifications manuelles (userModified)
- ✅ Optimisation esthétique des hampes
- ✅ French style beams (beamlets internes)

**Complexité** : ~3000 lignes (beamlayout.cpp + beamtremololayout.cpp)

**Points clés de MuseScore** :
```cpp
// Calcul de la pente maximale
int getMaxSlope(const BeamBase::LayoutData* ldata) {
    return ldata->isGrace ? 1 : (ldata->isBesideTabStaff ? 8 : 
           _maxSlopes[ldata->beamSpacing - 1]);
}

// Ajustement pour éviter les collisions
void offsetBeamToRemoveCollisions(...) {
    while (true) {
        const int slope = std::abs(dictator - pointer);
        if (anchor.y() < desiredY) break;
        // Incrémente dictator/pointer jusqu'à éviter collision
    }
}
```

---

## 3. Gestion des Liaisons (Ties)

### ChordGrid - `TieManager.ts`
```typescript
class TieManager {
    private tieData: Array<{
        startX: number;
        startY: number;
        endX: number;
        endY: number;
        isUp: boolean;
    }> = [];

    public renderTies(svg: SVGElement): void {
        this.tieData.forEach(tie => {
            const path = this.createTiePath(tie);
            svg.appendChild(path);
        });
        this.clear();
    }
}
```

**Caractéristiques** :
- ✅ Pattern accumulate-execute simple
- ✅ Calcul basique de courbes de Bézier
- ✅ Support des liaisons multi-lignes
- ❌ Pas de collisions avec d'autres éléments
- ❌ Pas de ties cross-staff
- ❌ Pas de partial ties (répétitions)

**Complexité** : ~150 lignes

### MuseScore - `slurtielayout.cpp` + `tie.cpp`
```cpp
class SlurTieLayout {
    static TieSegment* layoutTieFor(Tie* item, System* system);
    static TieSegment* layoutTieBack(Tie* item, System* system);
    static void resolveVerticalTieCollisions(
        const std::vector<TieSegment*>& stackedTies);
    static void computeBezier(TieSegment* tieSeg, 
                             PointF shoulderOffset);
    static void adjustXforLedgerLines(...);
    static void adjustYforLedgerLines(...);
    static void calculateDirection(Tie* item);
}

class Tie : public SlurTie {
    bool isCrossStaff() const;
    bool isInside() const;
    bool isOuterTieOfChord(Grip startOrEnd) const;
    void updatePossibleJumpPoints();
    TieJumpPointList* tieJumpPoints();
}
```

**Caractéristiques** :
- ✅ Support complet ties cross-staff
- ✅ Partial ties pour les répétitions (TieJumpPoint)
- ✅ Détection automatique inside/outside chord
- ✅ Résolution sophistiquée des collisions verticales
- ✅ Ajustements pour lignes supplémentaires
- ✅ Calcul esthétique de l'épaisseur (midThickness)
- ✅ Segmentation multi-système

**Complexité** : ~3500 lignes (slurtielayout.cpp + tie.cpp)

**Points clés de MuseScore** :
```cpp
// Calcul de l'épaisseur de la liaison
void computeMidThickness(SlurTieSegment* slurTieSeg, 
                        double slurTieLengthInSp) {
    if (slurTieLengthInSp > shortTieLimit) {
        finalThickness = normalThickness;
    } else {
        const double A = 1 / (shortTieLimit - minTieLength);
        const double B = normalThickness - minTieThickness;
        const double C = shortTieLimit * minTieThickness - 
                        minTieLength * normalThickness;
        finalThickness = A * (B * slurTieLengthInSp + C);
    }
}

// Gestion des répétitions
void Tie::updatePossibleJumpPoints() {
    if (!tieJumpPoints()) return;
    tieJumpPoints()->clear();
    // Analyse des MeasureRepeat et Jump items
    const bool hasFollowingJumpItem = chord->hasFollowingJumpItem();
    if (hasFollowingJumpItem) {
        // Crée des TieJumpPoint pour chaque fin de répétition
    }
}
```

---

## 4. Gestion des Voltas

### ChordGrid - `VoltaManager.ts`
```typescript
class VoltaManager {
    private voltaInfo: Array<{
        voltaNumber: string;
        startMeasureIndex: number;
        endMeasureIndex: number;
        firstMeasureStartX: number;
        lastMeasureEndX: number;
        yPosition: number;
    }> = [];

    public renderVoltas(svg: SVGElement): void {
        this.voltaInfo.forEach(volta => {
            // Rendu direct avec support multi-lignes
            if (this.requiresMultiLineVolta(volta)) {
                this.renderMultiLineVolta(svg, volta);
            } else {
                this.renderSingleLineVolta(svg, volta);
            }
        });
    }
}
```

**Caractéristiques** :
- ✅ Pattern accumulate-execute cohérent avec TieManager
- ✅ Support basique multi-lignes
- ✅ Calcul automatique de la position Y
- ❌ Pas de gestion des collisions
- ❌ Pas de styles personnalisables
- ❌ Texte fixe (numéros uniquement)

**Complexité** : ~220 lignes

### MuseScore - `volta.h` + `volta.cpp` + Layout
```cpp
class Volta : public TextLineBase {
    std::vector<int> m_endings;
    
    bool hasEnding(int repeat) const;
    int firstEnding() const;
    int lastEnding() const;
    void setEndings(const std::vector<int>& l);
    void setText(const String& s);
    String text() const;
};

// Dans le système de layout
class VoltaSegment : public TextLineBaseSegment {
    VoltaSegment* clone() const override;
    Volta* volta() const;
};
```

**Caractéristiques** :
- ✅ Hérite de TextLineBase (architecture réutilisable)
- ✅ Support complet des endings multiples (1,2 ou 1-3 ou 1,2,4-6)
- ✅ Texte personnalisable
- ✅ Styles configurables (voltaLineStyle, voltaHook, etc.)
- ✅ Intégration avec le moteur de playback (setChannel, setTempo)
- ✅ Export vers formats multiples (MEI, MusicXML, Braille)

**Complexité** : ~500 lignes (volta.cpp + intégrations)

**Configuration dans MuseScore** :
```xml
<!-- Styles disponibles -->
<voltaPosAbove x="0" y="-3"/>
<voltaHook>2.2</voltaHook>
<voltaLineWidth>0.11</voltaLineWidth>
<voltaLineStyle>solid</voltaLineStyle> <!-- ou dashed -->
<voltaDashLineLen>5</voltaDashLineLen>
<voltaFontFace>Edwin</voltaFontFace>
<voltaFontSize>11</voltaFontSize>
<voltaColor r="0" g="0" b="0" a="255"/>
<voltaFrameType>0</voltaFrameType>
```

---

## 5. Système de Collision et Placement

### ChordGrid - `PlaceAndSizeManager.ts`
```typescript
class PlaceAndSizeManager {
    public calculateMeasurePositions(
        measures: Measure[], 
        totalWidth: number
    ): void {
        // Distribution proportionnelle basique
        measures.forEach((measure, i) => {
            measure.x = currentX;
            currentX += measureWidth;
        });
    }
}
```

**Caractéristiques** :
- ✅ Calcul simple et rapide
- ✅ Distribution proportionnelle des mesures
- ❌ Pas de gestion des collisions
- ❌ Pas de système de skyline
- ❌ Espacement fixe, pas d'optimisation

**Complexité** : ~100 lignes

### MuseScore - Skyline System
```cpp
class Skyline {
    // Système sophistiqué de détection de collisions
    void add(const Shape& shape);
    double minDistance(const Skyline& other) const;
    void clear();
    bool contains(const PointF& p) const;
};

class Shape {
    std::vector<RectF> m_elements;
    void add(const RectF& r);
    void remove(const RectF& r);
    void translate(const PointF& pt);
    double minVerticalDistance(const Shape& s) const;
};

// Utilisation dans le layout
void SystemLayout::createSkylines(...) {
    for (Staff* staff : system->staves()) {
        staff->skyline().add(element->shape().translate(pos));
    }
}
```

**Caractéristiques** :
- ✅ Détection précise des collisions
- ✅ Calcul automatique de distances minimales
- ✅ Optimisation de l'espacement horizontal
- ✅ Support des formes complexes (pas seulement rectangles)

**Complexité** : ~2000 lignes (skyline.cpp + shape.cpp + horizontalspacing.cpp)

---

## 6. Gestion des Tuplets

### ChordGrid - `MusicAnalyzer.ts`
```typescript
class TupletInfo {
    ratio: string;      // "3:2"
    actualNotes: number; // 3
    normalNotes: number; // 2
    displayRatio: boolean;
}

public analyzeTuplets(beat: Beat): void {
    if (beat.subdivisions.length === beat.tupletInfo.actualNotes) {
        beat.subdivisions.forEach(sub => {
            sub.isTuplet = true;
            sub.tupletNumber = beat.tupletInfo.actualNotes;
        });
    }
}
```

**Caractéristiques** :
- ✅ Support basique des tuplets standards (triplets, quintolets, etc.)
- ✅ Affichage du ratio (optionnel)
- ✅ Ligatures automatiques dans les tuplets
- ❌ Pas de tuplets imbriqués
- ❌ Pas de bracket personnalisable
- ❌ Calcul simple de l'espacement

**Complexité** : ~150 lignes

### MuseScore - `tupletlayout.cpp` + `tuplet.h`
```cpp
class TupletLayout {
    static void layoutBracket(Tuplet* item, 
                             const ChordRest* cr1, 
                             const ChordRest* cr2, 
                             LayoutContext& ctx);
    static void layout(Tuplet* item, LayoutContext& ctx);
};

class Tuplet : public DurationElement {
    int m_number = 0;
    int m_baseLen = 0;
    int m_actualNotes = 0;
    int m_normalNotes = 0;
    TupletNumberType m_numberType;
    TupletBracketType m_bracketType;
    DirectionV m_direction = DirectionV::AUTO;
    bool m_hasBracket = false;
    
    Fraction baseLen() const;
    void setBaseLen(const Fraction& f);
};
```

**Caractéristiques** :
- ✅ Tuplets imbriqués (nested tuplets)
- ✅ Bracket automatique ou manuel
- ✅ Calcul sophistiqué de la pente du bracket
- ✅ Évitement des collisions avec notes
- ✅ Styles multiples (Number, Ratio, None)
- ✅ Support des tuplets cross-staff
- ✅ Ajustement automatique de la longueur des hampes

**Complexité** : ~600 lignes (tupletlayout.cpp)

**Calcul de la pente dans MuseScore** :
```cpp
void TupletLayout::layoutBracket(...) {
    double maxSlope = style.styleD(Sid::tupletMaxSlope);
    
    // Check that slope is no more than max
    double d = (p2.y() - p1.y()) / (p2.x() - p1.x());
    if (d < -maxSlope) {
        p2.ry() = p1.y() - maxSlope * (p2.x() - p1.x());
    } else if (d > maxSlope) {
        p1.ry() = p2.ry() - maxSlope * (p2.x() - p1.x());
    }
    
    // Check for collisions with intermediate notes
    for (size_t i = 1; i < (n - 1); ++i) {
        EngravingItem* e = item->elements()[i];
        if (e->isChord()) {
            // Ajuste la position pour éviter la collision
        }
    }
}
```

---

## 7. Tableau Récapitulatif

| Fonctionnalité | ChordGrid | MuseScore | Commentaire |
|----------------|-----------|-----------|-------------|
| **Architecture** | |||
| Séparation Model-Layout-Render | ⚠️ Partielle | ✅ Complète | ChordGrid mélange parfois layout et render |
| Pattern Manager | ✅ TieManager, VoltaManager | ✅ Multiples (Beam, Slur, etc.) | Approche similaire mais moins systématique dans ChordGrid |
| Système de coordonnées | ✅ Simple (X/Y) | ✅ Complexe (System, Staff, Page) | MuseScore gère plusieurs systèmes et pages |
| **Ligatures** | |||
| Beaming automatique | ✅ Par temps | ✅ Configurable par TimeSignature | Algorithme similaire mais ChordGrid plus simple |
| Ligatures cross-measure | ❌ Non | ✅ Oui | Fonctionnalité avancée de MuseScore |
| Ligatures cross-staff | ❌ Non | ✅ Oui | Nécessite gestion multi-portées |
| Optimisation pente | ❌ Basique | ✅ maxSlope, collision avoidance | MuseScore beaucoup plus sophistiqué |
| French beamlets | ❌ Non | ✅ Oui | Détail esthétique professionnel |
| **Liaisons** | |||
| Ties basiques | ✅ Oui | ✅ Oui | Implémentation similaire mais MuseScore plus robuste |
| Ties cross-staff | ❌ Non | ✅ Oui | Nécessite multi-portées |
| Partial ties (repeats) | ❌ Non | ✅ TieJumpPoint | Fonctionnalité avancée pour répétitions |
| Inside/outside detection | ❌ Non | ✅ Automatique | Améliore la lisibilité des accords |
| Collision résolution | ❌ Non | ✅ resolveVerticalTieCollisions | Essentiel pour accords complexes |
| **Voltas** | |||
| Voltas basiques | ✅ Oui | ✅ Oui | Fonctionnalité comparable |
| Multi-ligne support | ✅ Oui | ✅ Oui | Implémenté dans les deux |
| Endings complexes | ❌ Non (1,2 uniquement) | ✅ Oui (1-3, 1,2,4-6, etc.) | MuseScore plus flexible |
| Texte personnalisable | ❌ Non | ✅ Oui | ChordGrid affiche uniquement numéros |
| Styles configurables | ❌ Non | ✅ Complet | MuseScore offre 10+ paramètres de style |
| **Espacement & Collision** | |||
| Système de skyline | ❌ Non | ✅ Complet | Différence majeure d'architecture |
| Gestion collisions | ❌ Minimale | ✅ Sophistiquée | ChordGrid repose sur espacements fixes |
| Espacement horizontal | ✅ Proportionnel | ✅ Optimisé | MuseScore analyse les formes réelles |
| **Tuplets** | |||
| Tuplets simples | ✅ Oui | ✅ Oui | Fonctionnalité comparable |
| Tuplets imbriqués | ❌ Non | ✅ Oui | ChordGrid limité à 1 niveau |
| Bracket personnalisable | ❌ Non | ✅ Oui | MuseScore offre 3+ styles |
| **Complexité Code** | |||
| Total lignes | ~5000 | ~500 000 | Facteur 100x |
| Lignes pour beaming | ~200 | ~3000 | Facteur 15x |
| Lignes pour ties | ~150 | ~3500 | Facteur 23x |
| Lignes pour voltas | ~220 | ~500 | Facteur 2.3x |

---

## 8. Points Forts de Chaque Approche

### ChordGrid - Approche Pragmatique

**✅ Avantages** :
1. **Simplicité** : Code facile à comprendre et maintenir
2. **Performance** : Rendu rapide, pas de calculs complexes
3. **Légèreté** : 5000 lignes vs 500 000, charge minimale
4. **Intégration** : S'intègre parfaitement dans Obsidian
5. **Focus** : Optimisé pour les grilles d'accords jazz, pas de surcharge fonctionnelle
6. **Pattern cohérent** : TieManager et VoltaManager suivent le même pattern accumulate-execute

**Cas d'usage idéaux** :
- Grilles d'accords pour musiciens de jazz
- Documentation de standards
- Lead sheets simples
- Contexte où la simplicité prime sur l'exhaustivité

### MuseScore - Approche Professionnelle

**✅ Avantages** :
1. **Complétude** : Toutes les fonctionnalités d'un éditeur professionnel
2. **Qualité d'édition** : Notation publication-ready
3. **Extensibilité** : Architecture permettant l'ajout de nouvelles fonctionnalités
4. **Robustesse** : Gestion de tous les cas limites
5. **Standards** : Respecte les conventions de gravure musicale
6. **Multi-format** : Export vers PDF, MusicXML, MIDI, Braille, etc.

**Cas d'usage idéaux** :
- Partition complète d'orchestre
- Édition musicale professionnelle
- Notation complexe (musique contemporaine)
- Besoin d'édition interactive WYSIWYG

---

## 9. Leçons Architecturales

### Ce que ChordGrid pourrait adopter de MuseScore

1. **Système de Skyline** (priorité moyenne)
   - **Bénéfice** : Meilleure gestion des collisions entre voltas et autres éléments
   - **Coût** : +500 lignes, complexité accrue
   - **Recommandation** : Implémenter une version simplifiée pour voltas uniquement

2. **Séparation Layout Data** (priorité basse)
   ```typescript
   // Actuellement dans ChordGrid : mélange de logique
   class Beat {
       x: number;  // Layout
       duration: number;  // Model
       render(svg): void;  // Render
   }
   
   // Approche MuseScore :
   class Beat {
       duration: number;  // Model uniquement
   }
   class BeatLayoutData {
       x: number;
       bbox: Rectangle;
   }
   ```
   - **Bénéfice** : Architecture plus propre, testabilité
   - **Coût** : Refactoring significatif
   - **Recommandation** : Pour v3.0 si le projet évolue vers édition interactive

3. **Configuration par Styles** (priorité haute)
   ```typescript
   // Ajouter un système de styles pour voltas
   interface VoltaStyle {
       lineWidth: number;
       hookLength: number;
       fontSize: number;
       fontFamily: string;
       color: string;
   }
   ```
   - **Bénéfice** : Flexibilité sans complexifier le code
   - **Coût** : +50 lignes
   - **Recommandation** : À implémenter, ROI élevé

4. **Partial Ties pour Répétitions** (priorité moyenne-haute)
   - **Bénéfice** : Notation correcte des répétitions avec liaisons
   - **Coût** : +200 lignes
   - **Recommandation** : Fonctionnalité utile pour grilles de jazz

### Ce que MuseScore pourrait simplifier (inspiration ChordGrid)

1. **Pattern Manager Unifié**
   - MuseScore a des approches différentes pour Beam, Slur, Volta
   - ChordGrid montre qu'un pattern accumulate-execute peut être unifié
   - Bénéfice : Cohérence, maintenabilité

2. **Calculs Simplifiés pour Cas Simples**
   - MuseScore calcule toujours tout (collisions, skylines) même pour cas triviaux
   - ChordGrid montre qu'on peut optimiser les cas simples
   - Bénéfice : Performance

---

## 10. Conclusion

### ChordGrid : La Justesse par la Simplicité

ChordGrid adopte une approche **pragmatique et ciblée** :
- **20% de fonctionnalités** couvrent **80% des besoins** pour les grilles d'accords
- **Code 100x plus petit** mais parfaitement adapté au cas d'usage
- **Pattern architectural cohérent** (TieManager, VoltaManager)
- **Pas de surengineering** : chaque ligne de code a une justification claire

### MuseScore : La Justesse par l'Exhaustivité

MuseScore adopte une approche **professionnelle et complète** :
- **Gère tous les cas limites** de la notation musicale
- **Architecture extensible** permettant l'évolution
- **Qualité publication** avec attention aux détails esthétiques
- **Standard de facto** pour notation musicale open-source

### Recommandations pour ChordGrid

**À court terme (v2.2)** :
1. ✅ Garder la simplicité actuelle
2. ✅ Pattern TieManager/VoltaManager déjà excellent
3. ⚠️ Ajouter configuration de styles pour voltas

**À moyen terme (v2.3-2.4)** :
1. Implémenter partial ties pour répétitions
2. Ajouter skyline simplifiée pour voltas
3. Améliorer calcul de pente des ligatures (maxSlope)

**À long terme (v3.0+)** :
1. Évaluer séparation Layout Data si besoin d'édition interactive
2. Considérer système de collision plus sophistiqué si complexité augmente
3. **Ne pas** chercher à reproduire MuseScore : la simplicité est une force

### Philosophie

> **ChordGrid n'est pas une version simplifiée de MuseScore.**
> **C'est un outil différent, optimisé pour un cas d'usage spécifique.**
> **La comparaison avec MuseScore valide que les choix architecturaux de ChordGrid sont justifiés pour son contexte.**

---

## 11. Références

- [MuseScore GitHub Repository](https://github.com/musescore/MuseScore)
- [MuseScore Architecture Documentation](https://musescore.org/en/handbook/developers-handbook)
- ChordGrid for Obsidian v2.2.0 Documentation

**Date** : 24 novembre 2025  
**Version ChordGrid** : 2.2.0  
**Version MuseScore analysée** : 4.x (main branch)
