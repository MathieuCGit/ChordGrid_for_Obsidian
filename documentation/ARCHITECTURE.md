# Chord Grid Plugin Architecture

## Overview

This Obsidian plugin renders chord grids with rhythmic notation in SVG format. It follows a clean three-stage pipeline: **Parser → Analyzer → Renderer**, backed by shared **Models**, **Utilities**, and an intelligent **CollisionManager** system. The v2.1.0 release is **complete**, with full tuplet support, complex time signatures (12+), and professional collision avoidance integrated.

## Project Structure

```
ChordGrid_for_Obsidian/
├── main.ts                          # Obsidian plugin entry point
├── manifest.json                    # Plugin manifest
├── package.json                     # Dependencies & scripts
├── esbuild.config.mjs               # Build configuration
├── jest.config.js                   # Test configuration
├── styles.css                       # Plugin styles
├── README.md                        # User documentation (English)
├── README.fr.md                     # User documentation (French)
├── LICENSE                          # MIT License
├── documentation/                   # Technical documentation
│   ├── README.md                    # Documentation index
│   ├── ARCHITECTURE.md              # This file (English)
│   ├── ARCHITECTURE_[Fr].md         # Architecture (French)
│   ├── CHANGELOG.md                 # Version history
│   ├── CONTRIBUTING.md              # Contribution guidelines
│   ├── DEBUG_IMPLEMENTATION*.md     # Debug system guides
│   ├── DEBUG_LOGGER*.md             # Logger documentation
│   ├── TUPLET_RATIOS*.md            # Tuplet ratio system
│   ├── MIXED_TUPLETS.md             # Mixed tuplets (baseLen)
│   ├── GROUPING_CONVENTIONS.md      # Binary/ternary grouping
│   └── release_notes_v2.1.0.md      # Release notes
├── src/
│   ├── parser/                      # Parsing (syntax only)
│   │   ├── ChordGridParser.ts       # Main parser (includes tie & tuplet parsing)
│   │   └── type.ts                  # Type definitions
│   ├── analyzer/                    # Musical analysis (beams across segments, levels)
│   │   ├── MusicAnalyzer.ts         # Analyzer implementation
│   │   └── analyzer-types.ts        # BeamGroup, NoteReference, etc.
│   ├── models/                      # Data models
│   │   ├── Beat.ts                  # Beat model
│   │   ├── Measure.ts               # Measure model
│   │   ├── Note.ts                  # Note model
│   │   └── TimeSignature.ts         # TimeSignature model
│   ├── renderer/                    # SVG rendering
│   │   ├── SVGRenderer.ts           # Main renderer (orchestration)
│   │   ├── MeasureRenderer.ts       # Measure rendering
│   │   ├── NoteRenderer.ts          # Note rendering
│   │   ├── RestRenderer.ts          # Rest rendering
│   │   ├── BeamRenderer.ts          # Beam rendering
│   │   ├── AnalyzerBeamOverlay.ts   # Draw beams from analyzer
│   │   ├── ChordRenderer.ts         # Chord symbol rendering
│   │   ├── PlaceAndSizeManager.ts   # Placement & collision management
│   │   └── constants.ts             # SVG/layout constants
│   └── utils/
│       ├── TieManager.ts            # Cross-measure tie management
│       └── DebugLogger.ts           # Debug logging system
└── test/                            # Unit tests (40 test files, 275 tests)
    ├── *.spec.ts                    # Jest test files
    ├── analyzer.spec.ts             # Analyzer tests
    ├── beam_*.spec.ts               # Beam tests
    ├── chord_*.spec.ts              # Chord rendering tests
    ├── tie_*.spec.ts                # Tie tests
    ├── tuplet_*.spec.ts             # Tuplet tests
    ├── repeat_*.spec.ts             # Repeat notation tests
    ├── volta_*.spec.ts              # Volta bracket tests
    └── ...                          # Parser, renderer tests

```

## Data Flow

```
Text input (chordgrid notation)
     ↓
   Parser (ChordGridParser) — syntax only (includes tuplets)
     ↓
   Analyzer (MusicAnalyzer) — musical semantics (beam groups)
     ↓
   CollisionManager — element registration (chords, notes, stems, tuplets, ties, dots)
     ↓
   Renderer (SVGRenderer + Measure/Note/Rest) — with collision-aware positioning
     ↓
   CollisionManager — resolution & adjustments (tie curves, tuplet numbers)
     ↓
   SVG Element (output)
```

### Mermaid Diagram

```mermaid
flowchart LR
    A[Raw chordgrid text\n(code block)] --> B[Parser\nChordGridParser]
    B -->|Measures + Segments + Rhythm + Tuplets| C[Analyzer\nMusicAnalyzer]
    C -->|BeamGroups + NoteRefs| D[CollisionManager\nElement Registration]
    D --> E[Renderer Orchestrator\nSVGRenderer]
    E --> F[MeasureRenderer]
    E --> G[NoteRenderer]
    E --> H[RestRenderer]
    E --> I[TieManager]
    C --> J[AnalyzerBeamOverlay]
    J --> E
    I --> E
    D --> K[Collision Resolution\nAdjustments]
    K --> E
    E --> Z[SVG Output]

    classDef parser fill:#2b6cb0,stroke:#1a4568,stroke-width:1,color:#fff;
    classDef analyzer fill:#805ad5,stroke:#553c9a,color:#fff;
    classDef collision fill:#dd6b20,stroke:#9c4221,color:#fff;
    classDef renderer fill:#38a169,stroke:#276749,color:#fff;
    classDef util fill:#718096,stroke:#4a5568,color:#fff;
    class B parser;
    class C,J analyzer;
    class D,K collision;
    class E,F,G,H,Z renderer;
    class I util;
```

## Parser Module

### ChordGridParser

**Responsibilities:**
- Parse textual notation into typed structures (measures, segments, rhythm groups)
- Validate measure durations against time signature
- Detect ties markers (`_`) and rests (`-`) in syntax (without computing geometry)
- Preserve whitespace significance (segment-leading space breaks beams)
- Handle line breaks and measure grouping

**Note**: The parser includes an internal `BeamAndTieAnalyzer` class that handles tie detection during parsing. This is separate from the renderer's beam analysis.

**Supported Syntax:**
- Time signatures: `4/4`, `3/4`, `6/8`, `C`, `C|`
- Bar lines: `|` (single), `||` (double), `||:` (repeat start), `:||` (repeat end)
- Chords: standard notation (Am, C7, Gmaj7, F#m, Bb7, etc.)
- Notes: 1, 2, 4, 8, 16, 32, 64
- Dotted notes: `4.`, `8.`, etc.
- Rests: `-4`, `-8`, etc.
- Ties: `_` (e.g., `4_88_` or `[_8]`)
- Beams: notes grouped without space (e.g., `88` = 2 beamed eighth notes)

**Parsing Algorithm:**
1. Extract time signature (first line)
2. Tokenize by bar lines
3. Parse each measure:
   - Extract chords and rhythms
   - Create beats and notes
  - Detect ties markers at group boundaries
4. Validate durations
5. Group into rendering lines

## Analyzer Module

### MusicAnalyzer

**Responsibilities:**
- Compute musical beam groups per measure, possibly spanning chord segments when no whitespace separates them
- Support multi-level beams (8th/16th/32nd/64th) and beamlet direction rules (dotted-note aware)
- Respect rests and whitespace as hard beam breaks
- Produce stable references back to parsed notes via `NoteReference`

**Beam Rules (summary):**
- Values ≥ 8 (eighth and shorter) are eligible for beaming
- Rests break beams; whitespace between segments breaks beams
- Dotted notes influence beamlet direction (follow/precede logic)
- Single short notes get beamlets where musically appropriate

**Ties:**
- Analyzer does not invent ties; it uses parser tie markers and TieManager for cross-line resolution

## Module Modèles

### Hiérarchie des structures

```
ChordGrid
  ├── TimeSignature
  └── Measure[]
       ├── ChordSegment[]
       │    ├── chord (string)
       │    └── Beat[]
       │         └── Note[]
       └── barline (BarlineType)
```

### Note
- **Propriétés rythmiques** : value, dotted, isRest
- **Propriétés de liaison** : tieStart, tieEnd, tieToVoid, tieFromVoid
- **Méthode clé** : `durationInQuarterNotes()` - calcul de durée

### Beat
- Contient un tableau de notes/silences
- **Méthodes clés** : 
  - `totalQuarterNotes()` - somme des durées des notes

### Measure
- Contient les beats et métadonnées
- Support de changements d'accords multiples via `chordSegments`
- **Méthodes clés** :
  - `totalQuarterNotes()` - durée totale de la mesure

### TimeSignature
- Parsing et validation de signatures temporelles
- Calculs de durée et tempo
- Détection de mesures composées

## Module Renderer

### Architecture de rendu

```
SVGRenderer (orchestration)
    ↓
CollisionManager (element tracking & resolution)
    ↓
MeasureRenderer (par mesure)
    ↓
NoteRenderer / RestRenderer (par note)
```

### SVGRenderer

**Responsabilités :**
- Calculer la taille globale du SVG avec espacement dynamique
- Positionner les mesures sur la grille (4 par ligne, adaptatif)
- Gérer les sauts de ligne (automatiques et manuels)
- Initialiser CollisionManager et TieManager
- Calculer largeur dynamique de la signature rythmique
- Dessiner les liaisons entre mesures avec évitement de collision
- Appliquer ajustements de collision (courbes de liaison, numéros de tuplets)

**Paramètres de layout :**
- `measuresPerLine` : 4 (défaut)
- `baseMeasureWidth` : 240px (minimum, ajusté dynamiquement selon densité rythmique)
- `measureHeight` : 120px
- Espacement entre lignes : 20px
- Padding gauche dynamique : calculé selon largeur signature rythmique
- Facteur espacement signature : 0.53 (v2.1.0, optimisé)
- Marge signature : 4px (v2.1.0, optimisé)

### CollisionManager

**Responsabilités :**
- Enregistrer tous les éléments visuels avec leurs bounding boxes
- Détecter les collisions potentielles entre éléments
- Résoudre conflits spatiaux via repositionnement intelligent
- Suggérer positions alternatives pour éléments mobiles
- Gérer priorités (éléments fixes vs mobiles)

**Types d'éléments gérés :**
- `chord` : symboles d'accords
- `time-signature` : indications de mesure
- `note` : têtes de notes
- `stem` : hampes
- `beam` : barres de ligature
- `tie` : liaisons
- `tuplet-bracket` : crochets de tuplets
- `tuplet-number` : numéros/ratios de tuplets
- `rest` : silences
- `barline` : barres de mesure
- `staff-line` : lignes de portée
- `dot` : points de notes pointées (v2.1.0)

**Algorithmes de résolution :**
- `hasCollision()` : détection AABB (Axis-Aligned Bounding Box) avec marges configurables
- `findFreePosition()` : recherche en spirale pour position libre
  - Directions : vertical, horizontal, both
  - Tentatives max : 20 par défaut
  - Step : `minSpacing + 2`
- `suggestVerticalOffset()` : ajustement vertical spécifique par paire de types
- Système de priorités : 0 = fixe (ne bouge pas), 10 = mobile (peut être déplacé)

**Cas d'usage spécifiques (v2.1.0) :**
- Signature rythmique vs première mesure : padding gauche ajusté automatiquement
- Numéros de tuplets vs accords : décalage vertical via `findFreePosition`
- Points de notes pointées vs courbes de liaison : courbe relevée (controlY ajusté)

### MeasureRenderer

**Responsabilités :**
- Dessiner barres de mesure (simple, double, reprises)
- Dessiner ligne de portée
- Positionner les accords avec évitement de collision
- Répartir l'espace entre beats
- Gérer séparations visuelles entre segments
- Enregistrer tous éléments visuels dans CollisionManager (v2.1.0)

**Éléments enregistrés dans CollisionManager :**
- Symboles d'accords avec bbox calculé selon longueur texte
- Têtes de notes (noteheads)
- Hampes (stems) avec direction (up/down)
- Barres de ligature (beams) multi-notes
- Crochets et numéros de tuplets
- Silences de toutes durées
- Points de notes pointées (4x4px, priorité 9, v2.1.0)

**Positionnement des accords :**
- Position initiale : (measureX + noteX, staffY - 30)
- Si collision détectée : `CollisionManager.findFreePosition('vertical')` appliqué
- Position finale ajustée pour éviter overlap

**Algorithme de layout :**
1. Calculer espace disponible (en soustrayant `extraLeftPadding` pour barlines de reprise)
2. Allouer espace proportionnellement aux beats
3. Insérer séparateurs pour changements d'accords
4. Rendre chaque segment avec NoteRenderer
5. Enregistrer éléments dans CollisionManager au fur et à mesure

**Gestion de l'espace pour barlines de reprise (v2.2.1) :**
- `extraLeftPadding` est calculé pour barlines `||:` (8px: 3px + 6px + 1.5px - 2.5px)
- Cet espace est soustrait de `availableForBeatCells` pour éviter débordement des notes
- Garantit que les notes restent dans les limites de la mesure même avec layouts compressés (`measures-per-line`)

### NoteRenderer

**Responsabilités :**
- Dessiner têtes de notes (slash notation)
- Dessiner hampes (stems)
- Dessiner crochets individuels (flags)
- Dessiner ligatures multi-niveaux (beams)
- Gérer notes pointées

**Niveaux de ligature :**
- Croche (8) : 1 niveau
- Double-croche (16) : 2 niveaux
- Triple-croche (32) : 3 niveaux
- Quadruple-croche (64) : 4 niveaux

### RestRenderer

**Responsabilités :**
- Dessiner tous types de silences
- Gérer silences pointés
- Enregistrer bounding boxes dans CollisionManager (v2.1.0)

**Types de silences :**
- Pause (1) : rectangle suspendu
- Demi-pause (2) : rectangle posé
- Soupir (4) : forme Z stylisée
- Demi-soupir (8) : crochet simple
- Quart de soupir (16) : double crochet
- Etc.

**Enregistrement collision (v2.1.0) :**
- Chaque silence enregistré avec bbox approprié
- Permet évitement par autres éléments (accords, tuplets, liaisons)

### TieManager

**Responsabilités :**
- Gérer liaisons traversant limites de rendu
- Stocker liaisons "en attente" (pending)
- Résoudre liaisons cross-ligne
- Coordonner avec CollisionManager pour évitement (v2.1.0)

**Workflow :**
1. Note avec `tieToVoid` → `addPendingTie()`
2. Rendu ligne suivante
3. Note avec `tieFromVoid` → `resolvePendingFor()`
4. Dessiner courbe de liaison entre les positions
5. Ajuster controlY si collision détectée avec points de notes pointées (v2.1.0)

**Détection et évitement de collision (v2.1.0) :**
- Avant dessin, vérifier collision entre bbox de liaison et points de notes pointées
- Si collision détectée : relever courbe (augmenter controlY)
- Algorithme : `controlY_new = baseY - max(6, baseAmplitude * 0.6)`
- Enregistrer bbox de liaison dans CollisionManager après ajustement

## Validation et erreurs

### ValidationError

Structure d'erreur générée lors de la validation des mesures :
- `measureIndex` : position de la mesure (0-based)
- `expectedQuarterNotes` : durée attendue selon signature temporelle
- `foundQuarterNotes` : durée réelle trouvée
- `message` : description de l'erreur

### Calcul de durée attendue

```typescript
expectedQuarterNotes = numerator * (4 / denominator)
```

Exemples :
- 4/4 → 4 * (4/4) = 4 quarter-notes
- 3/4 → 3 * (4/4) = 3 quarter-notes
- 6/8 → 6 * (4/8) = 3 quarter-notes
- 12/8 → 12 * (4/8) = 6 quarter-notes

## Gestion des espaces

Les espaces dans la notation source ont une signification :

### Dans les groupes rythmiques
```
[88 4 4]    // 2 beats : [88] et [4 4]
[8888]      // 1 beat : [8888]
```

### Entre accords
```
Am[88 4] G[4 88]    // Pas de séparation visuelle
Am[88 4] G[4 88]   // Séparation visuelle (espace avant G)
```

## Patterns de conception

### Factory Pattern
Les modèles (Note, Beat, Measure) acceptent des données partielles et initialisent avec des valeurs par défaut.

### Builder Pattern
Le parser construit progressivement la structure ChordGrid en accumulant les mesures.

### Strategy Pattern
Différents renderers (NoteRenderer, RestRenderer) pour différents types d'éléments; Analyzer interchangeable sous forme de service.

### Observer Pattern
Le TieManager observe les notes avec liaisons et résout les références cross-mesure.

## Extension future

### Points d'extension possibles :
1. **Nouveaux types de notation** : ajouter des handlers dans ChordGridParser
2. **Styles de rendu alternatifs** : créer des renderers alternatifs implémentant l'interface commune
3. **Export** : ajouter des méthodes dans les renderers pour export PNG/PDF/MIDI
4. **Audio** : intégrer un moteur audio pour lecture des grilles
5. **Édition interactive** : ajouter des handlers d'événements sur les éléments SVG

### Ajout d'un nouveau type de note :

1. Ajouter la valeur dans `NoteValue` type (type.ts)
2. Implémenter le rendu dans `NoteRenderer` ou `RestRenderer`
3. Mettre à jour `getBeamCount()` si nécessaire
4. Ajouter tests dans `beam_parse.spec.ts`

### Ajout d'un nouveau type de barre :

1. Ajouter l'entrée dans `BarlineType` enum (type.ts)
2. Mettre à jour la regex de tokenisation dans `ChordGridParser`
3. Implémenter le rendu dans `MeasureRenderer.drawBar()`

## Tests

Les tests sont organisés par fonctionnalité :
- `parse.spec.ts` : tests de parsing général
- `beam_parse.spec.ts` : tests de ligatures
- `beam_render.test.ts` : tests de rendu de ligatures
- `debug_*.ts` : scripts de débogage

### Lancer les tests :
```bash
npm test
```

Scripts supplémentaires :
```bash
ts-node ./test/run_analyzer_tests.ts
ts-node ./test/run_integration_analyzer.ts
```

## Performance

### Optimisations actuelles :
- Calcul de durée en cache dans les modèles
- Création d'éléments SVG natives (pas de bibliothèque)
- Regroupement de mesures pour réduire les calculs de layout

### Métriques cibles :
- Parse < 10ms pour grille de 16 mesures
- Rendu < 50ms pour grille de 16 mesures
- Mémoire < 5MB pour grille complète en mémoire

## Dépendances

- **Obsidian API** : intégration avec Obsidian
- **TypeScript** : typage statique
- **ESBuild** : compilation rapide
- Aucune dépendance externe pour le rendu (SVG natif)

## Contribution

Pour contribuer au projet :
1. Consulter cette documentation
2. Lire les commentaires JSDoc dans le code
3. Ajouter des tests pour nouvelles fonctionnalités
4. Maintenir la cohérence de style (voir conventions ci-dessous)

### Conventions de code :
- Classes en PascalCase
- Méthodes/propriétés en camelCase
- Constantes en UPPER_SNAKE_CASE
- Interfaces préfixées avec `I` si nécessaire
- Documentation JSDoc pour toutes les API publiques

---

**Dernière mise à jour** : 11 novembre 2025  
**Version** : 1.1.0  
**Auteur** : MathieuCGit
