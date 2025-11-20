# Plugin Chord Grid pour Obsidian

[English](./README.md)

> Affiche des grilles d'accords avec une notation rythmique précise, rendue en SVG net et scalable dans vos notes Obsidian.

**Version :** 2.2.0 · **Licence :** GPL-3.0 · **Statut :** Stable

**Dernière version :** [v2.2.0](https://github.com/MathieuCGit/ChordGrid_for_Obsidian/releases/tag/v2.2.0) - **NOUVEAU : Contrôle de la direction des hampes & rendu SVG responsive**

Ce plugin analyse une syntaxe textuelle légère et la transforme en mesures musicales structurées (accords, groupes rythmiques, liaisons, silences), puis les rend avec une logique de ligature automatique via une architecture propre en 3 étapes : **Parser → Analyseur → Rendu**.

## Installation

1. Créez un dossier `chord-grid` dans `.obsidian/plugins/`
2. Copiez les fichiers suivants dans ce dossier :
   - `main.ts` (code du plugin)
   - `manifest.json`
3. Compilez le TypeScript : `npm run build` (voir section Développement)
4. Activez le plugin dans Obsidian : Réglages → Plugins communautaires

## Utilisation

Dans vos notes Obsidian, créez un bloc de code avec la langue `chordgrid` :

````markdown
```chordgrid
4/4 ||: Am[88 4 4 88] | C[88 4 4 88] :||
```
````
<img width="592" height="173" alt="image" src="https://github.com/user-attachments/assets/c876d0c9-e121-44d9-92e0-6baddd0433c5" />

### Syntaxe

**Indication de mesure :** `4/4`, `3/4`, `6/8`, `12/8`, etc.

**Direction des hampes (v2.2+) :** Contrôle la direction des hampes selon les standards de notation musicale
- `stems-up` (par défaut) - Hampes vers le haut (à droite de la tête de note, ligatures au-dessus, liaisons en-dessous) - standard pour clé de sol/notation solo
- `stems-down` - Hampes vers le bas (à gauche de la tête de note, ligatures en-dessous, liaisons au-dessus) - standard pour clé de fa/voix inférieure
- Placement du mot-clé :
  - Ligne séparée avant l'indication de mesure : `stems-down\n4/4`
  - Même ligne que l'indication de mesure : `stems-down 4/4`
- Exemples :
  ```chordgrid
  stems-down
  4/4 | C[88 4 4] | G[4 4 2] |
  ```
  ou
  ```chordgrid
  stems-down 4/4 | C[88 4 4] | G[4 4 2] |
  ```

**SVG responsive (v2.2+) :** Toutes les grilles d'accords sont maintenant rendues avec un SVG responsive qui s'adapte automatiquement à la largeur du conteneur tout en préservant le ratio d'aspect.

**Mesures répétées (v2.2+) :** Affichage des mesures répétées avec des raccourcis de notation
- `%` - Raccourci pour répéter le rythme de la mesure précédente
- `Accord[%]` - Répéter le rythme précédent avec un nouvel accord
- Directive `show%` - Afficher un symbole de répétition visuel (%) au lieu du rythme complet
  - Placement : ligne séparée avant l'indication de mesure ou même ligne
  - Comportement par défaut (sans `show%`) : le rythme est entièrement rendu même pour les mesures répétées
  - Avec `show%` : affiche le symbole classique de répétition de mesure centré dans la mesure
- Exemples :
  ```chordgrid
  show% 4/4 | C[4 4 4 4] | % | G[%] |
  ```
  ou
  ```chordgrid
  show%
  4/4 | Am[88 4 4] | % | Dm[%] |
  ```
  Visuel : le nom d'accord apparaît au début de la mesure, symbole de répétition centré sur la portée

**Modes de groupement (v2.1+) :** Contrôle le comportement automatique de ligature des croches
- `4/4 binary` - Force le groupement par 2 croches (tous les 1.0 temps de noire)
- `6/8 ternary` - Force le groupement par 3 croches (tous les 1.5 temps de noire)
- `4/4 noauto` - Désactive complètement l'auto-groupement ; contrôle utilisateur via espaces
- Par défaut (sans mot-clé) - Détection automatique selon la métrique :
  - Binaire : dénominateurs ≤ 4 (2/4, 3/4, 4/4, 5/4, etc.)
  - Ternaire : dénominateurs ≥ 8 avec numérateurs 3, 6, 9 ou 12 (6/8, 9/8, 12/8)
  - Irrégulier : autres métriques (5/8, 7/8, 11/8) - pas d'auto-groupement, contrôlé par espaces

**Barres de mesure :**
- `|` : barre simple
- `||` : double barre fin de grille
- `||:` : début de reprise
- `:||` : fin de reprise

**Accords :** Notation standard (`Am`, `C`, `Gmaj7`, `Dm`, `F#m`, `Bb7`, `C/E` ...)

**Rythme entre crochets (valeurs de notes) :**
- `1` = ronde
- `2` = blanche
- `4` = noire
- `8` = croche
- `16` = double-croche
- `32` = triple-croche
- `64` = quadruple-croche

**Silences :** Préfixer par `-` :
- `-1` = pause
- `-2` = demi-pause
- `-4` = soupir
- `-8` = demi-soupir
- `-16` = quart de soupir
- `-32` = trente-deuxième de soupir
- `-64` = soixante-quatrième de soupir

Exemple : `C[4 -4 88_4]` = noire, soupir de noire, deux croches avec la dernière croche liée à la dernière noire.

<img width="283" height="153" alt="image" src="https://github.com/user-attachments/assets/37859674-5513-4d12-a3de-e601843c7a22" />


> Les silences coupent les groupes de ligatures. Exemple : `[88-88]` produit deux groupes distincts.

**Groupement rythmique :**
- Les nombres collés décrivent un battement groupé (ex: `88` = 2 croches liées)
- Les espaces séparent les groupes de ligature
- Le point `.` crée une note pointée (`4.` noire pointée, `8.` croche pointée)

**Liaisons (Ties) :**
- Utilisez le tiret bas `_` pour créer des liaisons entre notes
- `_` **après** une note = la note démarre une liaison (émet)
- `_` **avant** une note = la note reçoit une liaison (termine)
- Exemples :
  - `[88_4]` = liaison entre la dernière croche et la noire
  - `[2 4_88_]` = liaison de la noire vers les deux croches
  - `C[2 4_88_] | [_8]` = liaison à travers la barre de mesure (dernière croche de la mesure 1 liée à la première croche de la mesure 2)
  - `{8_8_8}3` = les trois notes du triolet liées ensemble
  - `4_{8 8 8}3` = noire liée à la première note du triolet
  - `{8 8 8_}3 4` = dernière note du triolet liée à la noire suivante
  - `| 4_ | {_8 8 8}3 |` = liaison cross-mesure vers un tuplet

**Triolets et tuplets (v2.1+) :**
Les tuplets permettent de grouper des notes pour jouer N notes dans le temps normalement occupé par un nombre différent. Syntaxe : `{notes}N` où N est le nombre du tuplet.

- **Notation compacte** (notes collées) : `{888}3` = triolet avec toutes les notes liées par une ligature
- **Notation espacée** (notes séparées) : `{8 8 8}3` = triolet avec crochets indépendants
- **Ligatures multi-niveaux** : `{161616 161616}6` = 6 doubles-croches groupées en 2×3, avec ligature niveau 1 reliant les 6 notes et ligatures niveau 2 en deux segments
- **Liaisons dans les tuplets** : `{8_8_8}3` = triolet avec toutes les notes liées
- **Liaisons traversant les tuplets** :
  - `4_{8 8 8}3` = noire liée au début du triolet
  - `{8 8 8_}3 4` = triolet lié à la note suivante
  - `| 4_ | {_8 8 8}3 |` = liaison cross-mesure vers un tuplet
- **Patterns de liaisons complexes** : `4_{8_8_8}3_4` = liaison continue à travers tout le tuplet

Exemples :
- `{888}3` = triolet de croches (ligature complète)
- `{8 8 8}3` = triolet de croches (crochets séparés)
- `{444}3` = triolet de noires
- `{8 -8 8}3` = triolet avec silence au milieu
- `{161616}3` = triolet de doubles-croches
- `{161616 161616}6` = sextolet avec ligatures multi-niveaux avancées
- `{8_8_8}3` = triolet avec toutes les notes liées (legato)
- `{8_8 8}3` = triolet avec les deux premières notes liées
- Mesure complète en 4/4 : `| [{888}3 {888}3 {888}3 {888}3] |`

Rappel :
- `_` en fin ou début de groupe permet de lier vers/depuis la mesure suivante
- Un espace entre deux segments d'accord coupe une ligature, même sans changement d'accord
- Les notes pointées influencent la direction des beamlets (demi-ligatures)

#### Glossaire (référence rapide)
| Terme | Signification |
|------|----------------|
| Battement (Beat) | Unité de pulsation logique dans la mesure |
| Ligature (Beam) | Barre horizontale reliant des hampes de notes courtes (≥ croches) |
| Demi-ligature (Beamlet) | Petit tronçon de ligature pour notes isolées |
| Liaison (Tie) | Courbe prolongeant la durée sur la note suivante |
| Silence (Rest) | Durée sans son |
| Segment | Portion de mesure associée à un accord |
| Note pointée | Note avec `.` augmentant la durée de 50% |

#### Points de syntaxe avancés
| Modèle | Effet |
|--------|-------|
| `88` | Deux croches liées (même battement) |
| `8 8` | Deux croches séparées (espace coupe la ligature) |
| `4.` | Noire pointée (= noire + croche) |
| `16.32` | Direction des demi-ligatures adaptée (chemin analyseur) |
| `4_88_ | [_8]` | Liaison à travers la barre de mesure |
| `C[8]G[8]` | Ligature inter-segments si aucun espace (analyseur) |
| `C[8] G[8]` | Espace = ligature cassée |
| `%` | Répéter le rythme de la mesure précédente |
| `Accord[%]` | Répéter le rythme avec un nouvel accord |
| `show%` | Afficher le symbole de répétition visuel au lieu du rythme complet |
| `{888}3` | Triolet de croches (ligature complète) |
| `{8 8 8}3` | Triolet de croches (crochets séparés) |
| `{161616 161616}6` | Sextolet avec ligatures multi-niveaux (2×3) |
| `{8_8_8}3` | Triolet avec toutes les notes liées |
| `4_{8 8 8}3` | Noire liée à la première note du triolet |
| `{8 8 8_}3 4` | Dernière note du triolet liée à la noire |
| `| 4_ | {_8 8 8}3 |` | Liaison cross-mesure vers un tuplet |

### Exemples

**Mesure simple 4/4 :**
```chordgrid
4/4 | G[4 4 4 4] |
```

**Grille avec reprises :**
```chordgrid
4/4 ||: Am[88 4 4 88] | Dm[2 4 4] | G[4 4 2] | C[1] :||
```

**Mesures répétées avec symbole visuel (v2.2+) :**
```chordgrid
show% 4/4 | C[4 4 4 4] | % | G[%] | Am[88 88] |
```

**Rythmes variés :**
```chordgrid
4/4 | C[8888 4 4] | G[4 88 4 8] |
```

**Lignes multiples :**
```chordgrid
4/4 ||: C[4 4 4 4] | F[4 4 4 4] | G[4 4 4 4] | C[2 2] |
    Am[88 88 4 4] | Dm[4 4 2] | G7[16161616 4 4] | C[1] :||
```

**Notes pointées :**
```chordgrid
4/4 | C[4. 8 4 4] | D[8.16 88 4. 8] | Em[168. 4 4 88] | C[16816 4 16168 81616] |
```

**Silences :**
```chordgrid
4/4 | C[4 -4 4 4] | G[-2 4 4] | Am[88 -8 8 4] | F[4 4 -2] |
```

**Liaisons (ties) :**
```chordgrid
4/4 | C[2 4_88_] | [_8] G[8 4 4 4] | Am[88_4 4 88_] | [_4] Dm[2.] | C[4 4 4_88_] | [_88 4] D[4 4] |
```

**Triolets et tuplets (v2.1+) :**
```chordgrid
4/4 | C[{888}3 4] | G[{161616}3 {161616}3] | Am[{444}3] | F[{888}3 {888}3 {888}3] |
```

**Tuplets avec liaisons (v2.1+) :**
```chordgrid
4/4 | C[{8_8_8}3] | G[4_{8 8 8}3] | Am[{8 8 8_}3 4] |
```

**Liaisons cross-mesure avec tuplets (v2.1+) :**
```chordgrid
4/4 | C[4 4 4 4_] | D[{_8 8 8_}3 _4 4 4] |
```

**Attention aux espaces avant un accord :**
```chordgrid
[_8] G[8 4 4 4]
```
Différent de :
```chordgrid
[_8]G[8 4 4 4]
```
L'espace avant `G` casse la ligature.

### Dépannage
| Symptôme | Cause possible | Correctif |
|---------|-----------------|-----------|
| Mesure invalide | Somme ≠ signature rythmique | Recompter; une note pointée ajoute 50% |
| Ligature coupée | Présence d'un espace ou d'un silence | Retirer l'espace / vérifier absence de `-` |
| Liaison absente entre lignes | Résolution en attente dans TieManager | Mettre `_` en fin et début de groupe |
| Pas de panneau Debug | Plugin désactivé ou logger masqué | Réactiver le plugin; vérifier paramètres |

### Fonctionnalités

- ✅ Rendu SVG vectoriel
- ✅ Grilles d'accords avec notation rythmique
- ✅ **Contrôle de la direction des hampes** (v2.2.0) – mots-clés stems-up/stems-down respectant les standards de notation musicale
- ✅ **Rendu SVG responsive** (v2.2.0) – adaptation automatique à la largeur du conteneur avec ratio d'aspect préservé
- ✅ **Système CollisionManager** (v2.1.0) – placement intelligent des éléments évitant les chevauchements
- ✅ **Espacement dynamique des signatures rythmiques** (v2.1.0) – calcul automatique de largeur et padding adaptatif
- ✅ **Évitement de collision pour notes pointées** (v2.1.0) – courbes de liaison relevées automatiquement
- ✅ Groupement automatique des croches par battement (basé sur analyseur)
- ✅ **Ligatures inter-segments via analyseur** (v2.0.0) – ligatures continues au-delà des frontières d'accords
- ✅ **Tuplets & signatures rythmiques complexes** (v2.1.0) – triolets, quintolets, ratios personnalisables
- ✅ Barres de reprise & types de barres
- ✅ Support de signatures rythmiques (12+ signatures : 2/4, 3/4, 4/4, 5/4, 7/4, 5/8, 6/8, 7/8, 9/8, 11/8, 12/8, 15/16)
- ✅ 4 mesures par ligne (automatique, avec sauts de ligne manuels)
- ✅ Largeur de mesure dynamique basée sur la densité rythmique
- ✅ Notes pointées, liaisons, silences
- ✅ **Logger de debug inline** (v1.1.0) – panneau de debug pliable
- ✅ **Rendu amélioré des ligatures** pour motifs rythmiques complexes avec support multi-niveaux
- 🚧 Prévu : appoggiatures, articulations, dynamiques, formats d'export

### Limitations actuelles

- Pas encore de dynamiques, articulations, appoggiatures
- Pas d'export (PDF/PNG/MIDI) pour le moment

### Feuille de route (haut niveau)
| Jalon | Contenu |
|-------|---------|
| v1.x Maintenance | Stabilité, corrections, polissage de la doc |
| v2.0 Analyseur | ✅ Séparation Parser → Analyzer → Renderer, beaming unifié |
| v2.1 Tuplets & gestion des collisions | ✅ Implémentation complète des tuplets (triolets, quintolets, ratios personnalisables), signatures temporelles complexes (12+), système intelligent d'évitement de collisions |
| v2.2 Direction des hampes & SVG responsive | ✅ Standards de notation musicale (stems-up/stems-down), rendu SVG responsive |
| v2.3 Appoggiatures & ornements | Extension du modèle pour les notes d'agrément |
| v2.4 Dynamiques & articulations | Calque de symboles, décorateurs de rendu |
| v2.5 Export | Export PNG / SVG propre + POC MIDI |
| v3.0 Édition | Édition interactive dans la note |

## Architecture (v2.2 – ✅ Terminée avec contrôle de la direction des hampes)

Le pipeline de rendu utilise une architecture propre en 3 étapes avec détection intelligente des collisions et respect des standards de notation musicale :

Pipeline de rendu en 3 couches avec détection intelligente des collisions :

1. **Parseur** (`ChordGridParser`) – Analyse syntaxique de la grille en mesures et segments structurés (tokens, groupes rythmiques, liaisons, silences, reconnaissance des espaces, tuplets).
2. **Analyseur** (`MusicAnalyzer`) – Calcul de la sémantique musicale, en particulier les groupes de ligatures pouvant traverser les frontières de segments d'accords. Produit des `BeamGroup[]` avec des `NoteReference` pointant vers les notes analysées.
3. **Renderer** (`SVGRenderer` + sous-renderers) – Dessine notes/hampes/liaisons et utilise les ligatures pilotées par l'analyseur pour un beaming inter-segments correct. **CollisionManager** assure un placement intelligent des éléments.

#### Composants clés (v2.1)

**CollisionManager** : Système central gérant les conflits spatiaux entre éléments rendus
- Suivi des boîtes englobantes pour tous les éléments visuels (accords, notes, hampes, tuplets, silences, signatures rythmiques, points, liaisons)
- Résolution basée sur les priorités (éléments fixes vs éléments mobiles)
- Détection de collision via boîtes englobantes alignées sur les axes (AABB) avec marges configurables
- Algorithme `findFreePosition()` avec recherche en spirale
- Positionnement intelligent pour numéros de tuplets, symboles d'accords et courbes de liaison
- Ajustement automatique : courbes de liaison relevées en cas de chevauchement avec les points de notes pointées

**Espacement dynamique** : Système de mise en page adaptative
- Largeur de signature rythmique calculée selon le contenu (longueur numérateur/dénominateur)
- Padding gauche réactif prévenant le chevauchement avec la première mesure
- Largeurs de mesure calculées à partir de la densité rythmique (plus de notes = mesure plus large)
- Espacement plus serré et professionnel (facteur 0.53, marge 4px)

#### Schéma Mermaid

```mermaid
flowchart TD
    A[Notation chordgrid] --> B[Parseur\nChordGridParser]
    B --> C[Analyseur\nMusicAnalyzer]
    C --> D[Gestionnaire de collisions\nEnregistrement des éléments]
    D --> E[Overlay des ligatures\nAnalyzerBeamOverlay]
    E --> F[Renderer\nSVGRenderer + Measure/Note/Rest]
    F --> G[Résolution des collisions\nAjustements]
    G --> H[Sortie SVG]
```

**Pourquoi un analyseur ?**
Pour autoriser des ligatures cohérentes à travers des frontières d'accord sans espace et gérer la direction des beamlets avec des notes pointées.

**Pourquoi le CollisionManager ?**
La notation musicale professionnelle nécessite un espacement précis pour éviter les conflits visuels. Le CollisionManager :
- Empêche les signatures rythmiques de chevaucher la première mesure
- Positionne les numéros de tuplets au-dessus des symboles d'accords automatiquement
- Ajuste les courbes de liaison pour éviter les points de notes pointées
- Maintient des mises en page propres et lisibles quelle que soit la densité rythmique
- Permet les améliorations futures (dynamiques, articulations) sans espacement manuel

### Exemple de ligature inter-segments
```chordgrid
4/4 | C[8]G[8] Am[88 4 4] |
```
Sans espace entre `]G[`, les deux croches peuvent se relier.

Avec espace :
```chordgrid
4/4 | C[8] G[8] Am[88 4 4] |
```
Ligature cassée.

### Étapes prochaines
- Documentation complète de l'API CollisionManager
- Profilage des performances pour grandes grilles (100+ mesures)
- Extension du système de collision pour dynamiques et articulations
- Appoggiatures avec extension du modèle de durée
- Tests de snapshot pour cohérence du rendu SVG
- Points d'accroche pour export (PNG/PDF/MIDI)

## Développement

### Pré-requis
- Node.js (LTS recommandé)
- npm

### Installation
```bash
npm install
npm run dev   # build avec watch (esbuild)
npm run build # build production (type-check + bundle)
```

### Tests
Tests principaux (parseur) :
```bash
npm test
```
Scripts supplémentaires (analyseur / intégration) :
```bash
ts-node ./test/run_analyzer_tests.ts
ts-node ./test/run_integration_analyzer.ts
```

### Contribuer (résumé)
Voir `CONTRIBUTING.md` pour les règles complètes (style, branches, ajout de fonctionnalités, exigences de test).

## Débogage

Un logger visuel affiche : parsing, layout, détection des ligatures, des liaisons et positions des notes. Cliquez sur "🐛 Debug Logs" au-dessus d'une grille.

## Licence

Sous licence **GNU GPL-3.0**. Voir `LICENSE` pour le texte intégral.
