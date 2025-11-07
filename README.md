# Plugin Chord Grid pour Obsidian

Plugin permettant d'afficher des grilles d'accords avec notation rythmique sous forme de rendu graphique vectoriel (SVG).

## Installation

1. Créez un dossier `chord-grid` dans `.obsidian/plugins/`
2. Copiez les fichiers suivants dans ce dossier :
   - `main.ts` (le code du plugin)
   - `manifest.json`
3. Compilez le TypeScript : `npm run build` (voir section Développement)
4. Activez le plugin dans Obsidian : Paramètres → Plugins communautaires

## Utilisation

Dans vos notes Obsidian, créez un bloc de code avec le langage `chordgrid` :

````markdown
```chordgrid
4/4 ||: Am[88 4 4 88] | C[88 4 4 88] :||
```
````

### Syntaxe

**Signature temporelle :** `4/4`, `3/4`, `6/8`, etc.

**Barres de mesure :**
- `|` : Barre simple
- `||` : Double barre
- `||:` : Début de reprise
- `:||` : Fin de reprise

**Accords :** Notation standard (ex: `Am`, `C`, `Gmaj7`, `Dm`, `F#m`, `Bb7`)

**Rythme entre crochets :**
- `1` = Ronde
- `2` = Blanche
- `4` = Noire
- `8` = Croche
- `16` = Double croche

**Groupement rythmique :**
- Les chiffres collés représentent un temps (ex: `88` = 2 croches dans le même temps, avec hampes liées)
- Les chiffres séparés par des espaces représentent des temps différents

### Exemples

**Mesure simple en 4/4 :**
```chordgrid
4/4 | G[4 4 4 4] |
```

**Grille avec reprises :**
```chordgrid
4/4 ||: Am[88 4 4 88] | Dm[2 4 4] | G[4 4 2] | C[1] :||
```

**Rythme mixte :**
```chordgrid
4/4 | C[8888 4 4] | G[4 88 4 8] |
```

**Plusieurs lignes :**
```chordgrid
4/4 ||: C[4 4 4 4] | F[4 4 4 4] | G[4 4 4 4] | C[2 2] |
    Am[88 88 4 4] | Dm[4 4 2] | G7[16161616 4 4] | C[1] :||
```

## Développement

### Prérequis
- Node.js
- npm

### Configuration
```bash
npm install
npm run dev  # Mode développement avec watch
npm run build  # Compilation production
```

### Structure
```
chord-grid/
├── main.ts          # Code principal du plugin
├── manifest.json    # Métadonnées du plugin
├── package.json     # Dépendances npm
└── tsconfig.json    # Configuration TypeScript
```

## Fonctionnalités

- ✅ Rendu SVG vectoriel
- ✅ Grilles d'accords avec notation rythmique
- ✅ Groupement automatique des croches par temps
- ✅ Barres de reprise
- ✅ Support des signatures temporelles
- ✅ 4 mesures par ligne (automatique)
- ✅ Largeur dynamique des mesures

## Limitations actuelles

- Pas de support pour les silences
- Pas de support pour les nuances ou articulations
- Pas d'export vers d'autres formats

## Licence

MIT