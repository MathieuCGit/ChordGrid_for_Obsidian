# Test ChordRenderer - Alignement Chords-Stems

Ce fichier teste le nouveau système de rendu des accords avec le `ChordRenderer.ts`.

## Test 1: Simple rhythm avec chord
```chordgrid
4/4 ||: C[4 88_4 4] | % | G[%] | % :||
```

**Attendu** :
- Mesure 1 : "C" aligné avec la première hampe (noire)
- Mesure 2 : Symbole "%" centré (si displayRepeatSymbol=true)
- Mesure 3 : "G" aligné avec la première hampe
- Mesure 4 : Symbole "%" centré (si displayRepeatSymbol=true)

## Test 2: Multiple chords per measure
```chordgrid
4/4 | C[4 4] G[4 4] | Am[4 4] F[4 4] |
```

**Attendu** :
- Mesure 1 : "C" aligné avec 1ère hampe, "G" aligné avec 3ème hampe
- Mesure 2 : "Am" aligné avec 1ère hampe, "F" aligné avec 3ème hampe

## Test 3: Mixed rhythms
```chordgrid
4/4 | C[8 8 4 4] | G[4. 8 4] | Am[2 4 4] | Dm[16 16 16 16 4 4] |
```

**Attendu** :
- Chaque accord doit être aligné exactement avec la hampe de sa première note
- Text-anchor='start' (texte commence à la hampe, pas centré)

## Test 4: Stems direction DOWN
```chordgrid
stems-down
4/4 | C[4 4 4 4] | G[8 8 8 8] | Am[2 2] |
```

**Attendu** :
- Même avec hampes vers le bas, les accords doivent s'aligner avec la position de la hampe

## Test 5: Repeat symbols
```chordgrid
show%
4/4 ||: C[4 4 4 4] | % | G[%] | % :||
```

**Attendu** :
- Mesure 1 : "C" affiché normalement
- Mesure 2 : "%" affiché au centre (symbole de répétition)
- Mesure 3 : "G" affiché normalement
- Mesure 4 : "%" affiché au centre

## Test 6: Without show% (default)
```chordgrid
4/4 ||: C[4 4 4 4] | % | G[%] | % :||
```

**Attendu** :
- Mesure 1 : "C" affiché
- Mesure 2 : RIEN (pas de symbole %)
- Mesure 3 : "G" affiché
- Mesure 4 : RIEN (pas de symbole %)

## Vérifications

Pour chaque test, vérifier dans la console développeur :
1. Ouvrir Obsidian Dev Tools (Ctrl+Shift+I / Cmd+Option+I)
2. Chercher dans la console les warnings `[ChordRenderer] No stem found` - il ne devrait PAS y en avoir
3. Vérifier visuellement que chaque accord est bien aligné avec la hampe correspondante

Si warnings présents = bug dans la logique de recherche des stems.
Si alignement incorrect = problème de calcul de position.
