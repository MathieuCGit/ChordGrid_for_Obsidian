# Test: show% pour mesures chord-only

Ce test vérifie que la directive `show%` fonctionne correctement pour les mesures chord-only (sans rythme).

## Test 1: Chord-only avec show%

```chordgrid
show%
| Dm | % | E | % |
```

**Attendu**: 
- Mesure 1 : Dm visible
- Mesure 2 : symbole % visible, SANS ligne de portée
- Mesure 3 : E visible
- Mesure 4 : symbole % visible, SANS ligne de portée

## Test 2: Rythme avec show%

```chordgrid
show%
| C[4 4 4 4] | % | G[4 4 4 4] | % |
```

**Attendu**:
- Mesure 1 : C avec 4 noires
- Mesure 2 : symbole % visible, AVEC ligne de portée
- Mesure 3 : G avec 4 noires
- Mesure 4 : symbole % visible, AVEC ligne de portée

## Test 3: Mixte chord-only et rythme avec show%

```chordgrid
show%
| Dm | % |
| C[4 4 4 4] | % |
```

**Attendu**:
- Ligne 1, mesure 1 : Dm visible
- Ligne 1, mesure 2 : symbole % visible, SANS ligne de portée
- Ligne 2, mesure 1 : C avec 4 noires
- Ligne 2, mesure 2 : symbole % visible, AVEC ligne de portée

## Test 4: Sans show% (comportement par défaut)

```chordgrid
| Dm | % | E | % |
```

**Attendu**:
- Mesure 1 : Dm visible
- Mesure 2 : Dm visible (répété, pas de % affiché)
- Mesure 3 : E visible
- Mesure 4 : E visible (répété, pas de % affiché)

## Test 5: show% avec crochet de reprise

```chordgrid
show%
|: Dm | % | E | % :|
```

**Attendu**:
- Crochets de reprise visibles
- Mesures 2 et 4 : symbole % visible, SANS ligne de portée

## Test 6: Longue séquence de répétitions chord-only

```chordgrid
show%
| Dm | % | % | % | E |
```

**Attendu**:
- Mesure 1 : Dm visible
- Mesures 2, 3, 4 : symbole % visible, SANS ligne de portée
- Mesure 5 : E visible
