# Tests des différentes métriques - Ligatures, Liaisons et Tuplets

Ce fichier teste les fonctionnalités de ligatures (beams), liaisons (ties) et tuplets avec différentes signatures temporelles.

## ⚠️ Conventions de notation importantes

### Groupement des croches selon la métrique

**Temps binaire (2/4, 3/4, 4/4, 5/4, etc.)** :
- Les croches sont groupées par **2** : `88 88 88`
- Suit la pulsation naturelle de la noire

**Temps composé (6/8, 9/8, 12/8, etc.)** :
- Les croches sont groupées par **3** : `888 888`
- Suit la pulsation naturelle de la noire pointée

Cette convention respecte la notation musicale standard et permet une lecture rythmique claire.

## 1. Métrique 3/4 (Valse)

### 1.1 Ligatures basiques en 3/4

```chordgrid
3/4 | C[4 4 4] | G[88 88 4] | F[88 88 88] |
```

### 1.2 Ligatures cross-segment en 3/4

```chordgrid
3/4 | C[8]G[8 4 4] | Am[88]F[88 4] |
```

### 1.3 Liaisons en 3/4

```chordgrid
3/4 | C[4 4_88_] | [_88 88 4] | G[2_4_] | [_4 4 4] |
```

### 1.4 Liaisons cross-mesure en 3/4

```chordgrid
3/4 | Am[4 4 4_] | Dm[_88 88 4] | G7[4_4_4_] | C[_4 4 4] |
```

### 1.5 Triplets en 3/4

```chordgrid
3/4 | C[{888}3 {888}3 4] | G[4 {888}3 4] | Am[{444}3 4] |
```

### 1.6 Triplets avec liaisons en 3/4

```chordgrid
3/4 | C[{8_8_8}3 4 4] | G[4_{888}3 4] | Am[4 4_{8 8 8_}3] | [_{8 8 8}3 4 4] |
```

### 1.7 Doubles-croches et triplets en 3/4

```chordgrid
3/4 | C[1616 1616 88 4] | G[{161616}3 {161616}3 {161616}3 {161616}3 4] | F[8.16 88 4] |
```

---

## 2. Métrique 6/8 (Temps composé)

### 2.1 Ligatures basiques en 6/8

```chordgrid
6/8 | C[888 888] | G[4. 4.] | F[8 8 8 8 8 8] |
```

### 2.2 Ligatures groupées par 3 en 6/8

```chordgrid
6/8 | Am[888 888] | C[161616161616 888] | G[888 161616 161616] |
```

### 2.3 Liaisons en 6/8

```chordgrid
6/8 | C[888_888_] | [_4. 4.] | G[8_8 8 8 8 8] |
```

### 2.4 Duplets en 6/8 (temps composé)

```chordgrid
6/8 | C[{8 8}2:3 888] | G[888 {8 8}2:3] | F[{8 8}2:3 {8 8}2:3] |
```

### 2.5 Triplets de doubles-croches en 6/8

```chordgrid
6/8 | Am[{161616}3 {161616}3 {161616}3 888] | C[888 {161616}3 {161616}3 {161616}3] | G[{161616}3 {161616}3 {161616}3 {161616}3 {161616}3 {161616}3] |
```

### 2.6 Notes pointées et liaisons en 6/8

```chordgrid
6/8 | C[4._4._] | [_8 8 8 8 8 8] | G[8. 16 8 888] |
```

---

## 3. Métrique 2/4 (Marche)

### 3.1 Ligatures basiques en 2/4

```chordgrid
2/4 | C[4 4] | G[88 88] | F[88 88] |
```

### 3.2 Ligatures cross-segment en 2/4

```chordgrid
2/4 | C[8]G[8 88] | Am[88]F[88] |
```

### 3.3 Liaisons en 2/4

```chordgrid
2/4 | C[4_88_] | [_8 8 4] | G[88_4_] | [_88 4] |
```

### 3.4 Triplets en 2/4

```chordgrid
2/4 | C[{888}3 8 8] | G[4 {888}3] | Am[{888}3 {888}3] |
```

### 3.5 Doubles-croches en 2/4

```chordgrid
2/4 | C[1616 1616 88] | G[1616 1616 88] | F[88 1616 1616] |
```

### 3.6 Tuplets mixtes en 2/4

```chordgrid
2/4 | C[{1616 16}3 {1616 16}3 88] | G[88 {1616 16}3 {1616 16}3] |
```

---

## 4. Métrique 5/4 (Asymétrique - Take Five)

### 4.1 Ligatures basiques en 5/4

```chordgrid
5/4 | C[4 4 4 4 4] | G[88 88 4 4 4] | F[2 4 4 4] |
```

### 4.2 Ligatures et liaisons en 5/4

```chordgrid
5/4 | Am[88 88 4_4_4_] | [_2 4 4 4] | Dm[4 4 4 4_4_] | [_4 4 4 4 4] |
```

### 4.3 Triplets en 5/4

```chordgrid
5/4 | C[{888}3 {888}3 4 4 4] | G[4 4 {888}3 {888}3 4] |
```

### 4.4 Patterns complexes en 5/4

```chordgrid
5/4 | Am[88 88 88 4 4] | C[1616 1616 88 88 4 4] |
```

---

## 5. Métrique 7/8 (Asymétrique)

### 5.1 Groupement 2+2+3 en 7/8

```chordgrid
7/8 | C[88 88 888] | G[4 4 888] | F[88 88 888] |
```

### 5.2 Groupement 3+2+2 en 7/8

```chordgrid
7/8 | Am[888 88 88] | C[888 4 4] | G[888 88 88] |
```

### 5.3 Liaisons en 7/8

```chordgrid
7/8 | C[88_88_888_] | [_4 4 888] | G[888_88_88_] | [_888 4 4] |
```

### 5.4 Tuplets en 7/8

```chordgrid
7/8 | C[{161616}3 {161616}3 88 888] | G[888 {161616}3 {161616}3 88] |
```

---

## 6. Métrique 5/8 (Asymétrique)

### 6.1 Groupement 3+2 en 5/8

```chordgrid
5/8 | C[888 88] | G[4. 4] | F[888 88] |
```

### 6.2 Groupement 2+3 en 5/8

```chordgrid
5/8 | Am[88 888] | C[4 4.] | G[88 888] |
```

### 6.3 Liaisons en 5/8

```chordgrid
5/8 | C[888_88_] | [_4 4.] | G[4._4_] | [_88 888] |
```

### 6.4 Tuplets en 5/8

```chordgrid
5/8 | C[{161616}3 {161616}3 {161616}3 88] | G[88 888] |
```

---

## 7. Métrique 12/8 (Temps composé)

### 7.1 Ligatures basiques en 12/8

```chordgrid
12/8 | C[888 888 888 888] | G[4. 4. 4. 4.] |
```

### 7.2 Ligatures groupées en 12/8

```chordgrid
12/8 | Am[888 888 888 888] | C[161616 161616 161616 161616 888 888] |
```

### 7.3 Liaisons en 12/8

```chordgrid
12/8 | C[888_888_888_888_] | [_4. 4. 4. 4.] |
```

### 7.4 Duplets en 12/8

```chordgrid
12/8 | C[{8 8}2:3 {8 8}2:3 {8 8}2:3 {8 8}2:3] | G[4. 4. {8 8}2:3 888] |
```

---

## 8. Métrique 9/8 (Temps composé)

### 8.1 Ligatures basiques en 9/8

```chordgrid
9/8 | C[888 888 888] | G[4. 4. 4.] | F[8 8 8 8 8 8 8 8 8] |
```

### 8.2 Liaisons en 9/8

```chordgrid
9/8 | Am[888_888_888_] | [_4. 4. 4.] | C[4._4._4._] | [_4. 4. 888] |
```

### 8.3 Tuplets en 9/8

```chordgrid
9/8 | C[{161616}3 {161616}3 {161616}3 {161616}3 {161616}3 {161616}3 {161616}3 {161616}3 {161616}3] | G[888 {8 8}2:3 888] |
```

---

## 9. Tests de cas limites

### 9.1 Silences avec ligatures (3/4)

```chordgrid
3/4 | C[88 -88 4] | G[4 -4 4] | F[88 88 -4] |
```

### 9.2 Silences avec liaisons (impossible, mais test syntaxe)

```chordgrid
3/4 | C[4 -4 4_] | [_4 -4 4] |
```

### 9.3 Ligatures cross-segment avec silences (6/8)

```chordgrid
6/8 | C[88]G[-8 888] | Am[888]F[-888] |
```

### 9.4 Tuplets avec silences (2/4)

```chordgrid
2/4 | C[{8 -8 8}3 8 8] | G[{8 8 -8}3 8 8] |
```

### 9.5 Tuplets cross-mesure avec liaisons (4/4)

```chordgrid
4/4 | C[4 4 4_{8 8 8_}3] | [_{8 8 8}3 4 4 4] |
```

### 9.6 Notes pointées dans tuplets (3/4)

```chordgrid
3/4 | C[{8. 16 8}3 4 4] | G[4 {8 8. 16}3 4] |
```

---

## 10. Métriques rares

### 10.1 Métrique 7/4

```chordgrid
7/4 | C[4 4 4 4 4 4 4] | G[2 2 2 4] | F[88 88 88 4 4 4 4] |
```

### 10.2 Métrique 11/8

```chordgrid
11/8 | C[888 888 88 888] | G[4. 4. 4 888] |
```

### 10.3 Métrique 15/16

```chordgrid
15/16 | C[1616 1616 1616 1616 1616 1616 1616 16] |
```

---

## Résultats attendus

Pour chaque test :
- ✅ Les ligatures doivent se connecter correctement entre notes du même groupe
- ✅ Les ligatures cross-segment doivent fonctionner sans espace
- ✅ Les liaisons doivent créer des courbes entre notes successives
- ✅ Les liaisons cross-mesure doivent persister à travers les barres
- ✅ Les tuplets doivent afficher le bon ratio et occuper la durée correcte
- ✅ La validation rythmique doit accepter les mesures complètes
- ❌ Les mesures incomplètes doivent générer des erreurs de validation
