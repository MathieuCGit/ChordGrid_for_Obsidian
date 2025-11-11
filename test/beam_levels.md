# Test des niveaux de ligatures multiples

## Test 1 : 16-8-16 (double-croche, croche, double-croche)
```chordgrid
4/4 | C[16816 4 16168 81616] |
```

Résultat attendu :
- Niveau 1 (croche) : ligature complète sur les 3 notes
- Niveau 2 (double-croche) : 
  - Petit segment à droite pour la 1ère note (16)
  - Pas de segment pour la 2ème note (8)
  - Petit segment à gauche pour la 3ème note (16)

## Test 2 : Mélange 8-16-8
```chordgrid
4/4 | C[8168 4 4 4] |
```

Résultat attendu :
- Niveau 1 : ligature complète sur les 3 notes
- Niveau 2 : petit segment seulement pour la note centrale (16)

## Test 3 : Triple-croches (32)
```chordgrid
4/4 | C[32832 4 4 4] |
```

Résultat attendu :
- Niveau 1 : ligature complète
- Niveau 2 : ligature complète
- Niveau 3 : segments pour 1ère et 3ème note seulement

## Test 4 : Groupe complexe
```chordgrid
4/4 | C[16168168] | D[32163216] |
```

## Test 5 : Cas d'origine - 4 groupes différents
```chordgrid
4/4 | C[16816 4 16168 81616] |
```
