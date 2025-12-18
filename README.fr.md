# 🎵 Chord Grid pour Obsidian

[![Version](https://img.shields.io/badge/version-2.2.0-blue.svg)](https://github.com/MathieuCGit/ChordGrid_for_Obsidian/releases)
[![License](https://img.shields.io/badge/license-GPL--3.0-green.svg)](./LICENSE)
[![Tests](https://img.shields.io/badge/tests-429%20passing-brightgreen.svg)](#)

> **Transformez une simple notation textuelle en magnifiques grilles d'accords professionnelles avec notation rythmique—directement dans vos notes Obsidian.**

[🇬🇧 English version](./README.md) | [📖 Documentation complète](./documentation/) | [🐛 Signaler un bug](https://github.com/MathieuCGit/ChordGrid_for_Obsidian/issues)

**Pour cette entrée**
````markdown
```chordgrid
show% measure-num count pick
4/4 
| Em[4 88 4 88] | D[%] | % | Em[%] 
| Em[4 88] G[4 88] | C[4 88] G[4 88] | G[4 88 4 88] | C[4 88] G[4 88]
|2/4 G[4 -4] | 4/4 C[4 88 4 88] | % | G[%] 
| G[4 88] Em[4 88] | 2/4 G[4 88] | 4/4 D[4 88 88 88] | Em[%]
```
````
**Obtenez ce résultat**

<img width="778" height="462" alt="image" src="https://github.com/user-attachments/assets/f1af29a3-db21-4969-a855-e4a22e892394" />

---

## Qu'est-ce que Chord Grid ?

**Le problème :** Les musiciens ont besoin de partager des grilles d'accords avec des informations rythmiques précises, mais les logiciels de notation traditionnels sont lourds, rigides et ne s'intègrent pas aux flux de travail de prise de notes.

**La solution :** Chord Grid vous permet d'écrire des progressions d'accords dans un format textuel simple et intuitif qui se transforme instantanément en diagrammes SVG propres et évolutifs. Parfait pour les compositeurs, enseignants, étudiants et tous ceux qui documentent de la musique dans Obsidian.

**Conçu pour les musiciens** qui veulent la précision de la notation musicale avec la simplicité du texte brut.

---

## ✨ Fonctionnalités Clés

- 🎼 **Notation professionnelle** - Ligatures automatiques, liaisons, triolets et notes pointées
- ⚡ **Ultra rapide** - Écrivez les accords en texte, voyez les résultats instantanément
- 🎯 **Rythme précis** - Support des signatures rythmiques complexes (4/4, 6/8, 5/8, 7/8, 12/8...)
- 🔄 **Notation de répétition** - Signes de reprise, crochets de volta, symboles de mesures (%)
- ✨ **Outil de transposition** - Transposez rapidement la grille d'accords avec transpose:+/-
- 📚 **Outils pédagogiques** - Chiffres de comptage optionnels pour l'apprentissage du rythme
- 🎸 **Adapté guitare/basse** - Coups de médiator (↓↑) et motifs de doigts (Pouce, Main)
- 📐 **Mise en page intelligente** - Détection automatique des collisions et positionnement des éléments
- 📱 **Responsive** - S'adapte magnifiquement à toutes les tailles d'écran

---

## 🚀 Démarrage Rapide

### Installation

1. Ouvrez **Obsidian → Paramètres → Plugins communautaires**
2. Désactivez le **Mode sans échec**
3. Cliquez sur **Parcourir** et recherchez **"Chord Grid"**
4. Cliquez sur **Installer**, puis **Activer**

### Votre Première Grille d'Accords Sans Rythme

Créez un bloc de code avec le langage `chordgrid` :

````markdown
```chordgrid
4/4 | C | G | Am | F / G |
```
````
<img width="781" height="110" alt="image" src="https://github.com/user-attachments/assets/b7185c58-4b49-43ab-a70f-63e9ae53caa3" />

C'est tout ! Vous venez de créer votre première grille d'accords.

---
Vous voulez ajouter une barre de répétition ? Pas de problème !
````markdown
```chordgrid
4/4 ||: C | G | Am | F / G :||
```
````
<img width="780" height="112" alt="image" src="https://github.com/user-attachments/assets/ef3c8586-329e-45e1-b3c0-be580f7a88c3" />

---

Maintenant, disons que nous devons changer la dernière mesure pour un accord différent tout en gardant les précédentes :

````markdown
```chordgrid
4/4 ||: C | G | Am |.1-3 F / G :||.4 Bb |
```
````

<img width="772" height="108" alt="image" src="https://github.com/user-attachments/assets/d3ac34af-edbd-48a5-a92b-827eb2e1d9ee" />

---

Maintenant, ajoutons ce super motif rythmique pour ne pas l'oublier !
````markdown
```chordgrid
4/4 ||: C[8.16 88 4 168.] | G | Am |.1-3 F / G :||.4 Bb |
```
````
<img width="781" height="216" alt="image" src="https://github.com/user-attachments/assets/84d62d3e-92e3-48d3-92c0-198f7efccfda" />

---

OK, pas mal, mais j'aimerais vraiment avoir tous les accords sur la même ligne ! Vous pouvez utiliser `measures-per-line:` pour spécifier le nombre de mesures par ligne
````markdown
```chordgrid
measures-per-line:5
4/4 ||: C[8.16 88 4 168.] | G | Am |.1-3 F / G :||.4 Bb |
```
````
<img width="779" height="125" alt="image" src="https://github.com/user-attachments/assets/e43e80a0-70fd-4695-a274-a898f4d08564" />

---

Ah oui ! C'est mieux, mais en tant que guitariste, j'aimerais voir les coups de médiator. Je peux ? **Bien sûr !** Utilisez simplement le mot-clé `pick`
````markdown
```chordgrid
measures-per-line:5 pick
4/4 ||: C[8.16 88 4 168.] | G | Am |.1-3 F / G :||.4 Bb |
```
````
<img width="774" height="131" alt="image" src="https://github.com/user-attachments/assets/2fbb51b9-00e0-4912-ba97-66c9e8511902" />

---

Super ! Maintenant j'aimerais appliquer ce motif rythmique aux mesures suivantes. Je pourrais copier/coller le motif rythmique... ou ?

````markdown
```chordgrid
measures-per-line:5 pick
4/4 ||: C[8.16 88 4 168.] | G[%] | Am[%] |.1-3 F / G :||.4 Bb[8.16 88 4 168.] |
```
````
<img width="774" height="131" alt="image" src="https://github.com/user-attachments/assets/7e251cda-acf8-4c39-8833-dee4d0a26df3" />

---

Wow ! Génial ! Mais maintenant il y a trop d'informations dans chaque mesure. Je peux rendre ça plus propre ? Oui, utilisez `show%`

````markdown
```chordgrid
measures-per-line:5 pick show%
4/4 ||: C[8.16 88 4 168.] | G[%] | Am[%] |.1-3 F / G :||.4 Bb[8.16 88 4 168.] |
```
````
<img width="780" height="133" alt="image" src="https://github.com/user-attachments/assets/fcf26a64-60c9-4860-832a-cac612802d91" />

---

Enfin, je pense que je vais jouer ce rythme aux doigts plutôt qu'au médiator. Je peux ? **Bien sûr !** Utilisez `finger` voire `finger:fr` pour la version francisée au lieu de `pick`
````markdown
```chordgrid
measures-per-line:5 finger:fr show%
4/4 ||: C[8.16 88 4 168.] | G[%] | Am[%] |.1-3 F / G :||.4 Bb[8.16 88 4 168.] |
```
````
<img width="784" height="133" alt="image" src="https://github.com/user-attachments/assets/b2bf0bde-b5f8-48d1-8736-a0862f7794cf" />


## 🎓 Fonctionnalités Avancées

Besoin de plus de puissance ? ChordGrid supporte la notation avancée :

- **🔢 Comptage pédagogique** - Ajoutez la directive `count` pour les chiffres d'apprentissage du rythme
- **🎯 Motifs médiator/doigts** - Notation détaillée des coups (directives `pick`/`finger`)
- **🎭 Triolets** - Triolets `{8 8 8}3:2`, quintolets `{16 16 16 16 16}5:4`
- **🔄 Crochets de volta** - Première/deuxième fois `1.|2.`
- **📐 Mises en page personnalisées** - Contrôlez les mesures par ligne avec `measures-per-line:N`
- **🎨 Direction des hampes** - `stems-up` (par défaut) ou `stems-down`
- **🎼 Métriques complexes** - Support pour 5/8, 7/8, 11/8 et signatures rythmiques personnalisées
- **📏 Mesures vides** - Symboles de répétition `%` pour notation rapide

---

## 📖 Syntaxe Complète

### Signature Rythmique

`4/4`, `3/4`, `6/8`, `12/8`, etc.

### Accords
Notation standard (ex : `Am`, `C`, `Gmaj7`, `Dm`, `F#m`, `Bb7`, `C/E`).

### Rythme entre crochets (valeurs de notes)
- `1` = Ronde (whole note)
- `2` = Blanche (half note)
- `4` = Noire (quarter note)
- `8` = Croche (eighth note)
- `16` = Double-croche (sixteenth note)
- `32` = Triple-croche (thirty-second note)
- `64` = Quadruple-croche (sixty-fourth note)

### Silences
Ajoutez un préfixe `-` avant toute valeur de note pour créer un silence :
- `-1` = Pause (whole rest)
- `-2` = Demi-pause (half rest)
- `-4` = Soupir (quarter rest)
- `-8` = Demi-soupir (eighth rest)
- `-16` = Quart de soupir (sixteenth rest)
- `-32` = Silence de triple-croche (thirty-second rest)
- `-64` = Silence de quadruple-croche (sixty-fourth rest)

````markdown
  ````chordgrid
  C[4 -4 88_ 16-161616]
  ```
````
<img width="328" height="96" alt="image" src="https://github.com/user-attachments/assets/98ce95eb-97ed-47bd-9086-e5b1f063adc8" />

#### ATTENTION
:warning: **Si vous voulez garder les ligatures groupées par temps, <ins>faites attention au placement des espaces</ins>. Par exemple :**:warning:
````markdown
  ```chordgrid
  C[4 88_] G[_88 4]
  ```
````
<img width="420" height="139" alt="image" src="https://github.com/user-attachments/assets/41c47045-f34d-488c-a217-01f60b0e96bc" />

est différent de
````markdown
  ```chordgrid
  C[4 88_]G[_88 4]
  ```
````
<img width="422" height="146" alt="image" src="https://github.com/user-attachments/assets/73bf71b5-7b61-4233-b2b1-a474f49fab1c" />


### Liaisons
- Utilisez le trait de soulignement `_` pour créer des liaisons entre les notes
- `_` **après** une note = la note commence une liaison (envoie/émet)
- `_` **avant** une note = la note reçoit une liaison (reçoit/termine)
- Exemples :
  - `[88_ 4]` = liaison entre la dernière croche et la noire
  - `[2 4_88_]` = liaison de la noire vers deux croches
  - `C[2 4_88_] | [_8]` = liaison traversant la barre de mesure (dernière croche de la mesure 1 liée à la première croche de la mesure 2)
  - `{8_ 8_ 8}3` = les trois notes du triolet liées ensemble
  - `4_{8 8 8}3` = noire liée à la première note du triolet
  - `{8 8 8_}3 4` = dernière note du triolet liée à la noire suivante
  - `| 4_ | {_8 8 8}3 |` = liaison inter-mesures vers un triolet


### Direction des Hampes
Contrôlez la direction des hampes selon les standards de notation musicale
- `stems-up` ou `stem-up` (par défaut) - Vous n'aurez probablement jamais besoin d'utiliser ceci.
- `stems-down` ou `stem-down` - Les hampes pointent vers le bas

- Exemple :
````markdown
  ```chordgrid
  stems-down
  4/4 | C[88 4 4 4] | G[4 4 2] |
  ```
````
<img width="780" height="148" alt="image" src="https://github.com/user-attachments/assets/2c6a243d-efc2-499c-bdbf-f04a0289b550" />

### Marqueurs de Coups de Médiator
Affichez les coups de médiator alternés bas/haut au-dessus ou en-dessous des notes pour la pratique des subdivisions rythmiques.
Vous pouvez utiliser soit `pick`, soit `picks`, soit `picks-auto`
````markdown
  ```chordgrid
  pick
  4/4 | C[88 4 4 4] | G[4 4 2] |
  ```
````
<img width="772" height="156" alt="image" src="https://github.com/user-attachments/assets/ddf57484-584e-46a9-ade1-201d0179e65a" />

### Répétition du contenu des mesures
Affichez le contenu répété des mesures en utilisant des raccourcis de notation
- `%` - Raccourci pour répéter le rythme de la mesure précédente avec les mêmes accords
- `Accord[%]` - Répète le rythme précédent avec un nouvel accord

````markdown
  ```chordgrid
  4/4 | Am[88 4 88 4] | % | Dm[%] | G[%]
  ```
````
  <img width="776" height="112" alt="image" src="https://github.com/user-attachments/assets/2b6bf698-c524-4dc8-977e-a8173e6fa3d1" />

Vous pouvez raccourcir encore plus le contenu répété en utilisant la directive `show%`. Elle affiche un symbole de répétition visuel (%) au lieu de rendre le rythme complet

````markdown
  ```chordgrid
  show%
  4/4 | Am[88 4 88 4] | % | Dm[%] | G[%]
  ```
````
<img width="781" height="114" alt="image" src="https://github.com/user-attachments/assets/95a7cd8a-896f-44aa-8709-4b018561d617" />

### Crochets de volta
Créez des première/deuxième fois pour les sections répétées
- `|.1-3` : Commence un crochet de volta pour les répétitions 1, 2 et 3
- `|.4` : Commence un crochet de volta pour la répétition 4 (ou tout nombre unique)
- `|.1,2,3` : Syntaxe alternative utilisant des virgules
- `|.` : Marque explicitement la fin d'un crochet de volta (optionnel)
- Les crochets de volta s'étendent automatiquement jusqu'à :
  - Le début du prochain volta (ex : `|.1-3 ... :||.4`)
  - Un marqueur de début de répétition `||:` est rencontré
  - Un marqueur de fin explicite `|.` est placé
- Apparence visuelle :
  - Crochets fermés (avant `:||`) : crochet avec crochets aux deux extrémités
  - Crochets ouverts (après `:||`) : crochet avec crochet à gauche seulement (fin/coda)

Premier exemple : volta 1-3 couvre une mesure, volta 4 couvre une mesure
  ````markdown
  ```chordgrid
  4/4 ||: C[4 4 4 4] |.1-3 G[4 4 4 4] :||.4 Am[4 4 4 4] ||
  ```
  ````
  <img width="785" height="118" alt="image" src="https://github.com/user-attachments/assets/0be7d119-4a4d-43f8-a2b3-de3a5ef58310" />

Deuxième exemple : volta 1-3 couvre deux mesures avant `:||`, volta 4 s'étend jusqu'à Am en utilisant le marqueur `|.`
  ````markdown
  ```chordgrid
  4/4 ||: C[4 88_ 4 4] | % |.1-3 G[%] | % :||.4 G[4 4 4 4] |. Am[16168 81616 4 88] ||
  ```
  ````
  <img width="773" height="211" alt="image" src="https://github.com/user-attachments/assets/51136327-2286-4381-84e4-08bb64d40e10" />

#### Exemples de Syntaxe Avancée
| Motif | Effet |
|---------|-------|
| `88` | Deux croches ligaturées (même temps) |
| `8 8` | Deux croches séparées (l'espace coupe les ligatures) |
| `4.` | Noire pointée ( = noire + croche ) |
| `16.32` | Direction de la crochette s'adapte (chemin analyseur) |
| `4_ 88_ \| [_8]` | Liaison traversant la barre de mesure |
| `C[8]G[8]` | Ligature inter-segments si pas d'espace (analyseur) |
| `C[8] G[8]` | L'espace bloque la ligature |
| `%` | Répète le rythme de la mesure précédente |
| `Accord[%]` | Répète le rythme avec un nouvel accord |
| `show%` | Affiche un symbole de répétition visuel au lieu du rythme complet |
| `picks` | Active le rendu des coups de médiator avec subdivision automatique ou forcée |
| `{888}3` | Triolet de croches (entièrement ligaturé) |
| `{8 8 8}3` | Triolet de croches (crochets séparés) |
| `{161616 161616}6` | Sextolet avec ligature multi-niveaux (2×3) |
| `{8_ 8_ 8}3` | Triolet avec toutes les notes liées ensemble mais ligature brisée (présence d'espaces) |
| `4_{8 8 8}3` | Noire liée à la première note du triolet |
| `{8 8 8_}3 4` | Dernière note du triolet liée à la noire |
| `\| 4_ \| {_8 8 8}3 \|` | Liaison inter-mesures vers un triolet |
| `\|.1-3` | Commence un crochet de volta pour les fins 1, 2, 3 |
| `\|.` | Marque explicitement la fin d'un crochet de volta |
| `\|.1,2,3` | Syntaxe alternative avec virgules pour volta |

## 🛠️ Développement

### Compiler depuis les Sources

```bash
# Cloner le dépôt
git clone https://github.com/MathieuCGit/ChordGrid_for_Obsidian.git
cd ChordGrid_for_Obsidian

# Installer les dépendances
npm install

# Compiler le plugin
npm run build

# Lancer les tests
npm test
```

### Structure du Projet

```
ChordGrid_for_Obsidian/
├── src/
│   ├── parser/          # Analyse syntaxique
│   ├── analyzer/        # Analyse musicale (ligatures, comptage)
│   ├── renderer/        # Rendu SVG
│   └── models/          # Structures de données
├── test/                # 46 suites de tests (315 tests)
├── documentation/       # Documentation technique
└── README.md           # Vous êtes ici !
```

---

## 🤝 Contribuer

Les contributions sont les bienvenues ! Que vous corrigiez des bugs, ajoutiez des fonctionnalités ou amélioriez la documentation :

1. 📖 Lisez le [Guide de Contribution](./documentation/CONTRIBUTING.md)
2. 🏗️ Consultez la [Documentation d'Architecture](./documentation/ARCHITECTURE.md)
3. 🐛 Parcourez les [problèmes existants](https://github.com/MathieuCGit/ChordGrid_for_Obsidian/issues)
4. 💬 Démarrez une [discussion](https://github.com/MathieuCGit/ChordGrid_for_Obsidian/discussions)

---

## 📝 Licence

Ce plugin est publié sous la **Licence GPL-3.0**. Voir [LICENSE](./LICENSE) pour plus de détails.

---

## 🙏 Remerciements

Construit avec passion pour les communautés musicales et Obsidian.

**Auteur :** [Mathieu CONAN](https://github.com/MathieuCGit)

---

**Vous appréciez Chord Grid ?** ⭐ Mettez une étoile au dépôt pour montrer votre soutien !
