# Chord Grid Plugin Architecture

## Overview

This Obsidian plugin renders chord grids with rhythmic notation in SVG format. It follows a clean three-stage pipeline: **Parser → Analyzer → Renderer**, backed by shared **Models**, **Utilities**, and an intelligent **PlaceAndSizeManager** system. The v2.2.0 release includes **VoltaManager** for multi-line volta brackets, **empty measure support**, and enhanced **repeat notation** with full tuplet support, complex time signatures (12+), and professional collision avoidance integrated.

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
│   ├── analyzer/                    # Musical analysis (beams across segments, levels)
│   │   ├── analyzer-types.ts        # BeamGroup, NoteReference, etc.
│   │   └── MusicAnalyzer.ts         # Analyzer implementation
│   ├── models/                      # Data models
│   │   ├── Beat.ts                  # Beat model
│   │   ├── Measure.ts               # Measure model
│   │   ├── Note.ts                  # Note model
│   │   └── TimeSignature.ts         # TimeSignature model
│   ├── parser/                      # Parsing (syntax only)
│   │   ├── ChordGridParser.ts       # Main parser (includes tie & tuplet parsing)
│   │   └── type.ts                  # Type definitions
│   ├── renderer/                    # SVG rendering
│   │   ├── BeamRenderer.ts          # Beam rendering
│   │   ├── ChordRenderer.ts         # Chord symbol rendering
│   │   ├── constants.ts             # Centralized rendering constants (v3 preparation)
│   │   ├── MeasureRenderer.ts       # Measure rendering
│   │   ├── NoteRenderer.ts          # Note rendering
│   │   ├── PlaceAndSizeManager.ts   # Placement & collision management
│   │   ├── RestRenderer.ts          # Rest rendering
│   │   ├── SVGRenderer.ts           # Main renderer (orchestration)
│   │   └── TimeSignatureRenderer.ts # Time signature rendering
│   └── utils/
│       ├── DebugLogger.ts           # Debug logging system
│       ├── TieManager.ts            # Cross-measure tie management
│       └── VoltaManager.ts          # Multi-line volta bracket management
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
   PlaceAndSizeManager — element registration (chords, notes, stems, tuplets, ties, dots)
     ↓
   Renderer (SVGRenderer + Measure/Note/Rest) — with collision-aware positioning
     ↓
   PlaceAndSizeManager — resolution & adjustments (tie curves, tuplet numbers)
     ↓
   SVG Element (output)
```

### Mermaid Diagram

```mermaid
flowchart LR
    A[Raw chordgrid text\n(code block)] --> B[Parser\nChordGridParser]
    B -->|Measures + Segments + Rhythm + Tuplets| C[Analyzer\nMusicAnalyzer]
    C -->|BeamGroups + NoteRefs| D[PlaceAndSizeManager\nElement Registration]
    D --> E[Renderer Orchestrator\nSVGRenderer]
    E --> F[MeasureRenderer]
    E --> G[NoteRenderer]
    E --> H[RestRenderer]
    E --> I[TieManager]
    E --> K[VoltaManager]
    C --> J[AnalyzerBeamOverlay]
    J --> E
    I --> E
    D --> L[Collision Resolution\nAdjustments]
    L --> E
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
PlaceAndSizeManager (element tracking & resolution)
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
- Initialiser PlaceAndSizeManager, TieManager, et VoltaManager (v2.2.0)
- Calculer largeur dynamique de la signature rythmique
- Dessiner les liaisons entre mesures avec évitement de collision
- Coordonner rendu des voltas multi-lignes avec VoltaManager (v2.2.0)
- Appliquer ajustements de collision (courbes de liaison, numéros de tuplets)

**Paramètres de layout :**
- `measuresPerLine` : 4 (défaut)
- `baseMeasureWidth` : 240px (minimum, ajusté dynamiquement selon densité rythmique)
- `measureHeight` : 120px
- Espacement entre lignes : 20px
- Padding gauche dynamique : calculé selon largeur signature rythmique
- Facteur espacement signature : 0.53 (v2.1.0, optimisé)
- Marge signature : 4px (v2.1.0, optimisé)

### PlaceAndSizeManager

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
- Enregistrer tous éléments visuels dans PlaceAndSizeManager (v2.1.0)

**Éléments enregistrés dans PlaceAndSizeManager :**
- Symboles d'accords avec bbox calculé selon longueur texte
- Têtes de notes (noteheads)
- Hampes (stems) avec direction (up/down)
- Barres de ligature (beams) multi-notes
- Crochets et numéros de tuplets
- Silences de toutes durées
- Points de notes pointées (4x4px, priorité 9, v2.1.0)

**Positionnement des accords :**
- Position initiale : (measureX + noteX, staffY - 30)
- Si collision détectée : `PlaceAndSizeManager.findFreePosition('vertical')` appliqué
- Position finale ajustée pour éviter overlap

**Algorithme de layout :**
1. Calculer espace disponible (en soustrayant `extraLeftPadding` pour barlines de reprise)
2. Allouer espace proportionnellement aux beats
3. Insérer séparateurs pour changements d'accords
4. Rendre chaque segment avec NoteRenderer
5. Enregistrer éléments dans PlaceAndSizeManager au fur et à mesure

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
- Enregistrer bounding boxes dans PlaceAndSizeManager (v2.1.0)

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
- Coordonner avec PlaceAndSizeManager pour évitement (v2.1.0)

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
- Enregistrer bbox de liaison dans PlaceAndSizeManager après ajustement

### VoltaManager

**Responsabilités (v2.2.0) :**
- Gérer crochets de volta traversant plusieurs lignes de rendu
- Stocker positions de mesures durant rendu multi-ligne
- Stocker informations barlines avant nettoyage de PlaceAndSizeManager
- Rendre toutes les voltas avec contexte global après rendu de toutes les lignes
- Coordonner avec PlaceAndSizeManager pour récupération de métadonnées de voltas

**Architecture Pattern :**
Suit le même pattern que TieManager : **accumulate → execute**
- Phase 1 (accumulation) : collecter données durant rendu ligne par ligne
- Phase 2 (execution) : rendre toutes les voltas avec contexte global complet

**Workflow :**
1. Pendant rendu de chaque ligne :
   - `addMeasurePosition(mp)` pour chaque mesure
   - `addBarlines(barlines)` pour stocker barlines filtrées (avant clearAll())
2. Après rendu de toutes les lignes :
   - `renderVoltas(svg, placeAndSizeManager)` dessine tous les crochets de volta
3. Entre rendus : `clear()` pour réinitialiser l'état

**Méthodes clés :**
- `addMeasurePosition(mp: MeasurePosition)` : enregistrer position d'une mesure
  - `MeasurePosition` contient : x, y, width, measureIndex, lineIndex, measure (référence)
- `addBarlines(barlines: BarlineInfo[])` : sauvegarder barlines avec volta metadata
  - Appelé **avant** `PlaceAndSizeManager.clearAll()` pour conserver données
  - Filtre barlines avec `measureIndex !== undefined` pour éviter erreurs
- `renderVoltas(svg, placeAndSizeManager)` : rendu de tous les crochets de volta
  - Récupère volta metadata via `placeAndSizeManager.getVoltaBrackets()`
  - Dessine crochets spanning multiples lignes si nécessaire
  - Gère voltas multi-lignes avec continuité visuelle
- `clear()` : réinitialiser état entre rendus

**Gestion des voltas multi-lignes (v2.2.0) :**
- Détection automatique de voltas spanning plusieurs lignes de rendu
- Calcul de positions start/end pour chaque ligne traversée
- Rendu avec continuité visuelle (pas de vertical bar au début/fin si continue)
- Positionnement label uniquement au début de la volta (première ligne)

**Cas d'usage spécifiques :**
- Volta 1.|2. spanning 2 lignes : crochet continu avec label "1." sur première ligne
- Voltas avec barlines de différentes mesures sur différentes lignes
- Coordination avec PlaceAndSizeManager pour métadonnées persistantes

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
Le TieManager et VoltaManager (v2.2.0) observent les notes avec liaisons / mesures avec voltas et résolvent les références cross-mesure / cross-ligne.

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

For contributing to the project:
1. Consult this documentation
2. Read JSDoc comments in code
3. Add tests for new features
4. Maintain style consistency (see conventions below)

### Code conventions:
- Classes in PascalCase
- Methods/properties in camelCase
- Constants in UPPER_SNAKE_CASE
- Interfaces prefixed with `I` if needed
- JSDoc documentation for all public APIs

---

## Constants System (v2.2+)

### Overview

Version 2.2 introduces a centralized constants system in `src/renderer/constants.ts` to prepare for v3.0 user-configurable options. All hardcoded rendering values have been extracted and organized into thematic categories.

### Constant Categories

**1. LAYOUT** - Spacing, padding, margins
```typescript
LAYOUT.BASE_LEFT_PADDING: 10          // Left padding for segments
LAYOUT.SEPARATOR_WIDTH: 12            // Space between chord segments
LAYOUT.MEASURE_HEIGHT: 120            // Standard measure height
LAYOUT.REPEAT_SYMBOL_HEIGHT: 30       // % symbol height
```

**2. TYPOGRAPHY** - Font sizes, text ratios
```typescript
TYPOGRAPHY.CHORD_FONT_SIZE: 24        // Chord symbol font size
TYPOGRAPHY.CHAR_WIDTH_RATIO: 0.53     // Character width estimation
TYPOGRAPHY.BASS_NOTE_SIZE_RATIO: 0.83 // Bass note relative size
```

**3. VISUAL** - Colors, stroke widths
```typescript
VISUAL.COLOR_BLACK: '#000'            // Standard black
VISUAL.STROKE_WIDTH_THIN: 1           // Thin lines
VISUAL.STROKE_WIDTH_THICK: 3          // Barlines
VISUAL.COLOR_SEPARATOR: '#999'        // Chord-only separators
```

**4. NOTATION** - Musical element dimensions
```typescript
NOTATION.STAFF_LINE_Y_OFFSET: 80      // Staff line position
NOTATION.STEM_HEIGHT: 30              // Note stem height
NOTATION.DIAMOND_SIZE: 6              // Note head radius
NOTATION.REPEAT_DOT_RADIUS: 3         // Repeat dot size
NOTATION.REST_HEIGHT_EIGHTH: 24       // Eighth rest height
```

**5. POSITIONING** - Vertical offsets
```typescript
POSITIONING.CHORD_VERTICAL_OFFSET: 30 // Chord symbol Y offset
POSITIONING.STEM_CLEARANCE: 12        // Stem-to-chord clearance
```

**6. NOTE_SPACING** - Duration-based spacing
```typescript
NOTE_SPACING.SIXTY_FOURTH: 16         // Fastest notes
NOTE_SPACING.EIGHTH: 24               // Eighth notes
NOTE_SPACING.QUARTER_AND_LONGER: 20   // Quarter and longer
```

**7. SEGMENT_WIDTH** - Width calculations
```typescript
SEGMENT_WIDTH.SINGLE_NOTE_BASE: 28    // Single note width
SEGMENT_WIDTH.HEAD_HALF_MAX: 6        // Note head half-width
```

**8. COLLISION** - Collision detection
```typescript
COLLISION.MAX_ATTEMPTS: 100           // Max collision iterations
COLLISION.BASE_PRIORITY: 5            // Default priority
```

**9. SVG_VIEWPORT** - Viewport settings
```typescript
SVG_VIEWPORT.MIN_PADDING_X: 30        // Minimum X padding
SVG_VIEWPORT.MIN_PADDING_Y: 20        // Minimum Y padding
```

### Usage Pattern

All renderer files import constants from `constants.ts`:

```typescript
import { 
    SVG_NS, 
    LAYOUT, 
    NOTATION, 
    VISUAL 
} from './constants';

// Instead of: const staffY = y + 80;
const staffY = y + NOTATION.STAFF_LINE_Y_OFFSET;

// Instead of: fontSize = 24;
fontSize = TYPOGRAPHY.CHORD_FONT_SIZE;
```

### Benefits

- **Centralization**: All rendering values in one place
- **Documentation**: Constants annotated with `@plannedFor v3.0`
- **Type Safety**: TypeScript readonly objects
- **Consistency**: Shared values across renderer files
- **Future-Ready**: Easy migration to user options

### Adding New Constants

When adding hardcoded values:

1. **Identify category**: Which constant group fits?
2. **Choose name**: Descriptive, UPPER_SNAKE_CASE
3. **Add to constants.ts**: With JSDoc comment
4. **Mark for v3**: Add `@plannedFor v3.0` tag
5. **Update imports**: Add to renderer file imports
6. **Replace usage**: Use constant instead of hardcoded value

Example:
```typescript
// In constants.ts
export const NOTATION = {
    // ... existing constants
    
    /** New element height (px) @plannedFor v3.0 */
    NEW_ELEMENT_HEIGHT: 15,
} as const;

// In renderer file
import { NOTATION } from './constants';
const height = NOTATION.NEW_ELEMENT_HEIGHT;
```

---

**Last update**: January 2025  
**Version**: 2.2.0  
**Author**: MathieuCGit
