# Tests de Tuplets - Chord Grid v2.1

Tests visuels pour vérifier le rendu des tuplets (triolets, quintolets, etc.)

## Test 1 : Triolet de croches simple

```chordgrid
C | {8 8 8}3 8 |
```

**Résultat attendu :**
- 3 croches rapprochées avec un bracket "3" au-dessus
- 1 croche normale espacée après
- Les 3 croches du triolet doivent être ligatrées ensemble

---

## Test 2 : Triolet de noires

```chordgrid
Am | {4 4 4}3 |
```

**Résultat attendu :**
- 3 noires rapprochées avec bracket "3"
- Pas de ligature (noires n'ont pas de crochets)
- Espacement réduit à 75%

---

## Test 3 : Quintolet de doubles-croches

```chordgrid
G | {16 16 16 16 16}5 |
```

**Résultat attendu :**
- 5 doubles-croches très rapprochées
- Bracket avec chiffre "5" au-dessus
- Toutes les notes ligatrées avec 2 niveaux de beam

---

## Test 4 : Sextolet de croches

```chordgrid
D7 | {8 8 8 8 8 8}6 |
```

**Résultat attendu :**
- 6 croches rapprochées
- Bracket "6"
- 1 niveau de ligature continu

---

## Test 5 : Plusieurs tuplets dans une mesure

```chordgrid
F | {8 8 8}3 {8 8 8}3 |
```

**Résultat attendu :**
- 2 triolets séparés
- Chacun avec son propre bracket "3"
- Espacement normal entre les deux groupes

---

## Test 6 : Tuplet avec silences

```chordgrid
Bb | {8 r8 8}3 8 |
```

**Résultat attendu :**
- Triolet contenant un silence au milieu
- Bracket "3" au-dessus des 3 éléments
- Ligature partielle (notes 1 et 3 non connectées à cause du silence)

---

## Test 7 : Triolet de noires pointées

```chordgrid
Em | {4. 4. 4.}3 |
```

**Résultat attendu :**
- 3 noires pointées rapprochées
- Bracket "3"
- Points visibles après chaque note

---

## Test 8 : Mesure complexe avec tuplets et notes normales

```chordgrid
C | 4 {8 8 8}3 4 |
```

**Résultat attendu :**
- Noire normale
- Triolet de 3 croches avec bracket
- Noire normale
- Espacement correct entre les éléments

---

## Test 9 : Septolet

```chordgrid
A | {16 16 16 16 16 16 16}7 |
```

**Résultat attendu :**
- 7 doubles-croches très serrées
- Bracket "7"
- 2 niveaux de ligature

---

## Test 10 : Tuplet sur plusieurs segments d'accords

```chordgrid
C | {8 8 | G | 8}3 |
```

**Résultat attendu :**
- **Note:** Ce cas devrait probablement être rejeté par le parser
- Les tuplets ne devraient pas traverser les séparateurs d'accords (|)
- Si supporté, bracket et ligature devraient s'arrêter à la barre de mesure
