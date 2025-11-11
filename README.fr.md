# Plugin Chord Grid pour Obsidian

Un plugin qui affiche des grilles d'accords avec une notation rythmique en SVG.

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

### Syntaxe

**Indication de mesure :** `4/4`, `3/4`, `6/8`, etc.

**Barres de mesure :**
- `|` : barre simple
- `||` : double barre fin de grille
- `||:` : début de reprise
- `:||` : fin de reprise

**Accords :** Notation standard (`Am`, `C`, `Gmaj7`, `Dm`, `F#m`, `Bb7` ...)

**Rythme entre crochets :**
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

Exemple : `C[4 -4 8 8]` = noire, soupir de noire, deux croches

> Les silences coupent les groupes de ligatures. Exemple : `[88-88]` produit deux groupes distincts.

**Groupement rythmique :**
- Les nombres collés décrivent un battement groupé (ex: `88` = 2 croches liées)
- Les espaces séparent les groupes de ligature
- Le point `.` crée une note pointée (`4.` noire pointée, `8.` croche pointée)
- Le `_` crée une liaison (tie). Exemple : `[88_4]` lie la dernière croche au début de la noire suivante
- On peut lier à travers une barre de mesure : `C[2 4_88_] | [_8]`

Rappel :
- `_` en fin ou début de groupe permet de lier vers/depuis la mesure suivante
- Un espace entre deux segments d'accord coupe une ligature, même sans changement d'accord
- Les notes pointées influencent la direction des beamlets (demi-ligatures)

### Exemples

**Mesure simple 4/4 :**
```chordgrid
4/4 | G[4 4 4 4] |
```

**Grille avec reprises :**
```chordgrid
4/4 ||: Am[88 4 4 88] | Dm[2 4 4] | G[4 4 2] | C[1] :||
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

**Attention aux espaces avant un accord :**
```chordgrid
[_8] G[8 4 4 4]
```
Différent de :
```chordgrid
[_8]G[8 4 4 4]
```
L'espace avant `G` casse la ligature.

### Fonctionnalités

- ✅ Rendu SVG vectoriel
- ✅ Grilles d'accords avec notation rythmique
- ✅ Groupement automatique des croches par battement
- ✅ Barres de reprise
- ✅ Signatures rythmiques
- ✅ 4 mesures par ligne (auto)
- ✅ Largeur de mesure dynamique
- ✅ **Logger de debug inline** (v1.1.0)
- ✅ **Rendu amélioré des ligatures complexes** (notes pointées)
- 🚧 **Ligatures inter-segments via analyseur** (v2.0.0 en cours) – possibilité de relier `[8]G[8]` s'il n'y a pas d'espace
- 🚧 **Overlay de ligature basé sur l'analyse** (flag expérimental)

### Limitations actuelles

- Overlay d'analyse expérimental (fallback sur l'ancien système)
- Pas de dynamiques ni articulations
- Pas d'export
- Tuplets, appoggiatures (grace notes), dynamiques, articulations : à venir

## Architecture (refonte v2.0 en cours)

Pipeline en 3 couches :
1. Parseur – Extraction purement syntaxique (mesures, segments, groupes rythmiques, espaces, ties)
2. Analyseur – Détermination des groupes de ligatures multi-niveaux (8/16/32/64), franchissant les segments d'accords
3. Renderer – Dessin des éléments graphiques; overlay des beams de l'analyseur (flag) avant remplacement complet de l'ancien système

**Pourquoi un analyseur ?**
Pour autoriser des ligatures cohérentes à travers des frontières d'accord sans espace et gérer la direction des beamlets avec des notes pointées.

### Activation du flag
Modifiez `src/renderer/constants.ts` :
```ts
export const USE_ANALYZER_BEAMS = true;
```

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
- Remplacer complètement l'ancien beaming par la sortie de l'analyseur
- Support des tuplets & grace notes
- Tests de rendu (snapshots) pour SVG
- Documentation avancée (cas limites, ties complexes)

## Développement

### Pré-requis
- Node.js
- npm

### Installation
```bash
npm install
npm run dev
npm run build
```

## Débogage

Un logger visuel affiche : parsing, layout, détection des ligatures, des liaisons et positions des notes. Cliquez sur "🐛 Debug Logs" au-dessus d'une grille.

## Licence

GPL v3
