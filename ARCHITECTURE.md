# Chord Grid Plugin Architecture

## Overview

This Obsidian plugin renders chord grids with rhythmic notation in SVG format. It now follows a three-stage pipeline: **Parser → Analyzer → Renderer**, backed by shared **Models** and **Utilities**. During v2.0.0, an analyzer overlay coexists with the legacy beaming path for stability.

## Project Structure

```
chord-grid/
├── main.ts                          # Obsidian plugin entry point
├── src/
│   ├── parser/                      # Parsing (syntax only)
│   │   ├── ChordGridParser.ts       # Main parser
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
│   │   ├── AnalyzerBeamOverlay.ts   # Draw beams from analyzer (feature-flagged)
│   │   ├── BeamAndTieAnalyzer.ts    # Legacy per-segment beaming (temporary)
│   │   └── constants.ts             # SVG/layout constants
│   └── utils/
│       ├── TieManager.ts            # Cross-measure tie management
│       └── DebugLogger.ts           # Debug logging system
└── test/
  ├── *.spec.ts / *.test.ts        # Unit tests (parser / render)
  ├── run_analyzer_tests.ts        # Analyzer tests
  └── run_integration_analyzer.ts  # Parser→Analyzer integration

```

## Data Flow

```
Text input (chordgrid notation)
     ↓
   Parser (ChordGridParser) — syntax only
     ↓
   Analyzer (MusicAnalyzer) — musical semantics
     ↓
   Renderer (SVGRenderer + Measure/Note/Rest)
     ↓
   SVG Element (output)
```

### Mermaid Diagram

```mermaid
flowchart LR
    A[Raw chordgrid text\n(code block)] --> B[Parser\nChordGridParser]
    B -->|Measures + Segments + Rhythm Tokens| C[Analyzer\nMusicAnalyzer]
    C -->|BeamGroups + NoteRefs| D[Renderer Orchestrator\nSVGRenderer]
    D --> E[MeasureRenderer]
    D --> F[NoteRenderer]
    D --> G[RestRenderer]
    D --> H[TieManager]
    C -->|Optional overlay| I[AnalyzerBeamOverlay]
    subgraph Legacy Path (temporary)
    J[BeamAndTieAnalyzer]
    end
    B --> J
    J --> D
    H --> D
    D --> Z[SVG Output]

    classDef parser fill:#2b6cb0,stroke:#1a4568,stroke-width:1,color:#fff;
    classDef analyzer fill:#805ad5,stroke:#553c9a,color:#fff;
    classDef renderer fill:#38a169,stroke:#276749,color:#fff;
    classDef util fill:#718096,stroke:#4a5568,color:#fff;
    class B parser;
    class C,I analyzer;
    class D,E,F,G,Z renderer;
    class H util;
    class J util;
```

## Parser Module

### ChordGridParser

**Responsibilities:**
- Parse textual notation into typed structures (measures, segments, rhythm groups)
- Validate measure durations against time signature
- Detect ties markers (`_`) and rests (`-`) in syntax (without computing geometry)
- Preserve whitespace significance (segment-leading space breaks beams)
- Handle line breaks and measure grouping

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
MeasureRenderer (par mesure)
    ↓
NoteRenderer / RestRenderer (par note)
```

### SVGRenderer

**Responsabilités :**
- Calculer la taille globale du SVG
- Positionner les mesures sur la grille (4 par ligne)
- Gérer les sauts de ligne
- Initialiser le TieManager
- Dessiner les liaisons entre mesures

**Paramètres de layout :**
- `measuresPerLine` : 4 (défaut)
- `measureWidth` : 200px
- `measureHeight` : 120px
- Espacement entre lignes : 20px

### MeasureRenderer

**Responsabilités :**
- Dessiner barres de mesure (simple, double, reprises)
- Dessiner ligne de portée
- Positionner les accords
- Répartir l'espace entre beats
- Gérer séparations visuelles entre segments

**Algorithme de layout :**
1. Calculer espace disponible
2. Allouer espace proportionnellement aux beats
3. Insérer séparateurs pour changements d'accords
4. Rendre chaque segment avec NoteRenderer

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

**Types de silences :**
- Pause (1) : rectangle suspendu
- Demi-pause (2) : rectangle posé
- Soupir (4) : forme Z stylisée
- Demi-soupir (8) : crochet simple
- Quart de soupir (16) : double crochet
- Etc.

### TieManager

**Responsabilités :**
- Gérer liaisons traversant limites de rendu
- Stocker liaisons "en attente" (pending)
- Résoudre liaisons cross-ligne

**Workflow :**
1. Note avec `tieToVoid` → `addPendingTie()`
2. Rendu ligne suivante
3. Note avec `tieFromVoid` → `resolvePendingFor()`
4. Dessiner courbe de liaison entre les positions

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
