# Test d'affichage du ratio dans les brackets de tuplets

## Comportement attendu

Lorsqu'un ratio explicite (N:M) est fourni dans la notation, il doit apparaître au-dessus du bracket du tuplet au lieu du simple count.

## Test 1 : Triplet avec ratio explicite 3:2

```chordgrid
C | [{8 8 8}3:2 4] |
```

**Attendu :** Le bracket affiche "**3:2**" au-dessus

---

## Test 2 : Tuplet mixte avec ratio 5:4

```chordgrid
4/4 | [{816-16 1616 8 8}5:4 2] |
```

**Attendu :** Le bracket affiche "**5:4**" au-dessus

---

## Test 3 : Tuplet sans ratio explicite (auto-détection)

```chordgrid
Am | [{8 8 8}3 4] |
```

**Attendu :** Le bracket affiche simplement "**3**" (comportement par défaut)

---

## Test 4 : Quintuplet avec ratio 5:8

```chordgrid
4/4 | [{8 8 8 8 8}5:8 4 4] |
```

**Attendu :** Le bracket affiche "**5:8**" au-dessus

---

## Test 5 : Septuplet avec ratio 7:4

```chordgrid
4/4 | [{16 16 16 16 16 16 16}7:4 4 4] |
```

**Attendu :** Le bracket affiche "**7:4**" au-dessus

---

## Test 6 : Comparaison côte à côte

```chordgrid
4/4 | [{8 8 8}3 {8 8 8}3:2 4 4] |
```

**Attendu :** 
- Premier tuplet : affiche "**3**" (sans ratio)
- Deuxième tuplet : affiche "**3:2**" (avec ratio explicite)

---

## Notes

L'affichage du ratio N:M aide à comprendre :
- **N** = durée cumulative en unités de baseLen (ce qui est écrit)
- **M** = durée cible (le temps qu'on veut occuper)

Exemples :
- `3:2` = "3 notes dans le temps de 2"
- `5:4` = "5 croches dans le temps de 4 croches"
- `7:8` = "7 notes dans le temps de 8 notes"

Cette notation suit la convention de **MuseScore** et facilite la compréhension des tuplets avec valeurs rythmiques mixtes.
