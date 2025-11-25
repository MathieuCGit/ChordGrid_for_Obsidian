# Test Visuel : Chord-Only avec %

## Test 1 : Simple chord-only avec %

```chordgrid
| Dm | % | E | % | Am | E | Am | E |
```

**Attendu** : Aucune ligne de portée ne doit apparaître. Seulement les noms d'accords et les barres de mesure.

---

## Test 2 : Mix chord-only et rythme

```chordgrid
| Dm | % | E[4 4 4 4] | % | Am |
```

**Attendu** :
- Mesures 1-2 : Pas de ligne de portée (chord-only)
- Mesures 3-4 : Ligne de portée avec rythme
- Mesure 5 : Pas de ligne de portée (chord-only)

---

## Test 3 : Multiples accords par mesure

```chordgrid
| Dm / F | % | Am / C | % |
```

**Attendu** : Pas de ligne de portée, séparateurs slash entre accords.

---

## Test 4 : Cascade de %

```chordgrid
| Dm | % | % | % | E | % |
```

**Attendu** : Toutes les mesures en chord-only, pas de ligne de portée.

---

## Test 5 : Avec notation Chord[%]

```chordgrid
| C[4 4 4 4] | D[%] | E | F[%] |
```

**Attendu** :
- Mesure 1 : Ligne de portée avec rythme (C)
- Mesure 2 : Ligne de portée avec rythme (D copie le rythme de C)
- Mesure 3 : Pas de ligne de portée (E chord-only)
- Mesure 4 : Pas de ligne de portée (F chord-only, car copie E qui n'a pas de rythme)

---

## Vérification Technique

Pour chaque mesure chord-only (avec ou sans %), le renderer doit :
1. ✅ Appeler `drawChordOnlyMeasure()` au lieu du rendu normal
2. ✅ Ne PAS dessiner de ligne de portée (staff line)
3. ✅ Dessiner les barres de mesure (gauche/droite)
4. ✅ Dessiner les séparateurs slash si plusieurs accords
5. ✅ Les accords seront rendus par ChordRenderer

**Flag technique** : `(measure as any).__isChordOnlyMode === true`
