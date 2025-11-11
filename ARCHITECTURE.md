# Architecture du Plugin Chord Grid

## Vue d'ensemble

Ce plugin Obsidian permet de rendre des grilles d'accords avec notation rythmique en SVG. Il est composé de trois modules principaux : **Parsing**, **Modèles**, et **Rendu**.

## Structure du projet

```
chord-grid/
├── main.ts                    # Point d'entrée du plugin Obsidian
├── src/
│   ├── parser/                # Module de parsing
│   │   ├── ChordGridParser.ts # Parser principal
│   │   └── type.ts            # Définitions de types
│   ├── models/                # Modèles de données
│   │   ├── Beat.ts            # Modèle Beat
│   │   ├── Measure.ts         # Modèle Measure
│   │   ├── Note.ts            # Modèle Note
│   │   └── TimeSignature.ts   # Modèle TimeSignature
│   ├── renderer/              # Module de rendu SVG
│   │   ├── SVGRenderer.ts     # Renderer principal
│   │   ├── MeasureRenderer.ts # Rendu de mesures
│   │   ├── NoteRenderer.ts    # Rendu de notes
│   │   ├── RestRenderer.ts    # Rendu de silences
│   │   ├── BeamAndTieAnalyzer.ts # Analyse ligatures
│   │   └── constants.ts       # Constantes SVG
│   └── utils/                 # Utilitaires
│       └── TieManager.ts      # Gestion liaisons cross-mesure
└── test/                      # Tests unitaires

```

## Flux de données

```
Entrée texte (notation chordgrid)
         ↓
   ChordGridParser
         ↓
    ChordGrid (structure)
         ↓
    SVGRenderer
         ↓
   Élément SVG (sortie)
```

## Module Parser

### ChordGridParser

**Responsabilités :**
- Parse la notation textuelle en structures de données
- Valide la durée des mesures par rapport à la signature temporelle
- Analyse les ligatures et liaisons
- Gère les sauts de ligne et le regroupement des mesures

**Syntaxe supportée :**
- Signatures temporelles : `4/4`, `3/4`, `6/8`, `C`, `C|`
- Barres : `|` (simple), `||` (double), `||:` (reprise début), `:||` (reprise fin)
- Accords : notation standard (Am, C7, Gmaj7, F#m, Bb7, etc.)
- Notes : 1, 2, 4, 8, 16, 32, 64
- Notes pointées : `4.`, `8.`, etc.
- Silences : `-4`, `-8`, etc.
- Liaisons : `_` (ex: `4_88_` ou `[_8]`)
- Ligatures : notes groupées sans espace (ex: `88` = 2 croches liées)

**Algorithme de parsing :**
1. Extraction de la signature temporelle (première ligne)
2. Tokenisation par barres de mesure
3. Parsing de chaque mesure :
   - Extraction des accords et rythmes
   - Création des beats et notes
   - Analyse des ligatures (BeamAndTieAnalyzer)
   - Détection des liaisons
4. Validation des durées
5. Regroupement en lignes de rendu

### BeamAndTieAnalyzer

**Responsabilités :**
- Analyser les groupes rythmiques
- Déterminer les ligatures entre notes
- Gérer les liaisons (ties) entre notes, mesures et lignes

**Règles de ligature :**
- Notes >= 8 (croches) peuvent être liées
- Silences brisent les ligatures
- Espace dans la notation sépare les groupes
- Minimum 2 notes pour former un groupe

**Règles de liaison :**
- `_` marque une liaison
- Liaisons peuvent traverser mesures et lignes
- `tieToVoid` : liaison vers note virtuelle (fin ligne)
- `tieFromVoid` : liaison depuis note virtuelle (début ligne)

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
Différents renderers (NoteRenderer, RestRenderer) pour différents types d'éléments.

### Observer Pattern
Le TieManager observe les notes avec liaisons et résout les références cross-mesure.

## Extension future

### Points d'extension possibles :
1. **Nouveaux types de notation** : ajouter des handlers dans ChordGridParser
2. **Styles de rendu alternatifs** : créer des renderers alternatifs implémentant l'interface commune
3. **Export** : ajouter des méthodes dans les renderers pour export PNG/PDF
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
**Version** : 1.0.0  
**Auteur** : MathieuCGit
