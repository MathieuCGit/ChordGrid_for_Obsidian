# Test Finger Pattern Debug

## Test 1: 4/4 avec croches (8) - Simple
```chordgrid
finger:fr
4/4 | C[8 8 8 8 8 8 8 8] |
```

**Attendu**: pd pu md pu pd pu md pu

---

## Test 2: 4/4 avec doubles croches (16)
```chordgrid
finger:fr
4/4 | C[16 16 16 16 16 16 16 16 16 16 16 16 16 16 16 16] |
```

**Attendu**: 
- Beat 1 (0-3): pd pu pd pu
- Beat 2 (4-7): md pu md pu
- Beat 3 (8-11): pd pu pd pu
- Beat 4 (12-15): md pu md pu

---

## Test 3: 4/4 avec triples croches (32) - Ton cas
```chordgrid
finger:fr
4/4 | C[4 4 4 323216323216] |
```

**Attendu pour les 3 noires**:
- Note 1 (position 0): pd
- Note 2 (position 32): md
- Note 3 (position 64): pd

**Attendu pour les 32 (positions 96-107)**:
- Toutes les notes tombent dans la zone 'h' (md) ou 'tu' (pu)

---

## Test 4: 4/4 mixte croches + doubles croches
```chordgrid
finger:fr
4/4 | Am[88 4] G[4 88] |
```

**Mesure 1 - Am[88 4]**:
- Note 1 (8 à position 0): pd
- Note 2 (8 à position 2): md
- Note 3 (4 à position 4): md

**Mesure 2 - G[4 88]**:
- Note 1 (4 à position 0): pd
- Note 2 (8 à position 2): md
- Note 3 (8 à position 3): pu

---

## Test 5: 4/4 avec toutes les valeurs
```chordgrid
finger:fr
4/4 | C[1] | C[2 2] | C[4 4 4 4] | C[8 8 8 8 8 8 8 8] |
```

**Mesure 1**: pd
**Mesure 2**: pd md
**Mesure 3**: pd md pd md
**Mesure 4**: pd pu md pu pd pu md pu

---

## Test 6: Pattern complet 4 mesures
```chordgrid
finger:fr
4/4 | C[8 8 8 8 8 8 8 8] | D[8 8 8 8 8 8 8 8] | Em[8 8 8 8 8 8 8 8] | F[8 8 8 8 8 8 8 8] |
```

**Chaque mesure devrait avoir**: pd pu md pu pd pu md pu

---

## Test 7: 3/4 avec croches
```chordgrid
finger:fr
3/4 | C[8 8 8 8 8 8] |
```

**Attendu**: pd pu md pu md pu

---

## Test 8: Triples croches isolées
```chordgrid
finger:fr
4/4 | C[32 32 32 32 4 4 4] |
```

**Attendu**:
- Les 4 premières 32: Doivent être dans le pattern
- Les 3 noires: pd md pd

---

## Test 9: Pattern répété sur 2 mesures
```chordgrid
finger:fr
4/4 | C[4 4 4 4] | C[4 4 4 4] |
```

**Attendu**:
- Mesure 1: pd md pd md
- Mesure 2: pd md pd md (identique)

---

## Test 10: Version English
```chordgrid
finger
4/4 | C[8 8 8 8 8 8 8 8] |
```

**Attendu**: td tu hd tu td tu hd tu

---

## Instructions

1. Ouvre la **Console DevTools** (Ctrl+Shift+I)
2. Teste chaque exemple un par un
3. Vérifie les logs `[StrumPattern DEBUG]`:
   - Time signature
   - Detected step
   - Pattern length et beats
   - Subdivisions per beat
   - Chaque slot de la timeline
   - Chaque note avec son symbole assigné
4. Compare le résultat visuel avec l'attendu
5. Note les erreurs trouvées

## Debug checklist

- [ ] Le pattern est-il chargé correctement ?
- [ ] Le step est-il détecté correctement (8, 16, 32, etc.) ?
- [ ] Les subdivisions per beat sont-elles correctes ?
- [ ] Le calcul de `subdivPerPatternElement` est-il correct ?
- [ ] Le `patternIndex` est-il calculé correctement pour chaque position ?
- [ ] La normalisation EN→FR fonctionne-t-elle ?
- [ ] Les symboles rendus correspondent-ils au pattern ?
