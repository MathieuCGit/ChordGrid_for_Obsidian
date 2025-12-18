# Ratios de Tuplets - Documentation

## Vue d'ensemble

Le système de tuplets supporte maintenant trois méthodes pour déterminer le ratio de compression rythmique :

1. **Ratios explicites** : Syntaxe `{...}N:M` pour forcer un ratio spécifique
2. **Table des ratios par défaut** : Pour les cas courants (triplets, quintuplets, etc.)
3. **Calcul automatique** : Fallback pour les cas inhabituels

## Convention musicale

**N:M signifie "N notes occupent le temps de M notes de même valeur"**

Le dénominateur M représente **combien de notes de même valeur** occupent normalement cette durée.

### Exemples
- `3:2` → 3 notes dans le temps de 2 notes de même valeur
- `5:4` → 5 notes dans le temps de 4 notes de même valeur  
- `5:8` → 5 notes dans le temps de 8 notes de même valeur
- `7:4` → 7 notes dans le temps de 4 notes de même valeur

**Important** : Le dénominateur ne représente PAS une valeur de note (4, 8, 16), mais le **nombre** de notes de référence.

## Syntaxe

### Ratio par défaut (recommandé)
```
{8 8 8}3        → Triplet avec ratio 3:2 (par défaut)
{8 8 8 8 8}5    → Quintuplet avec ratio 5:4 (par défaut)
{8 8 8 8 8 8 8}7 → Septuplet avec ratio 7:4 (par défaut)
```

### Ratio explicite
```
{8 8 8}3:2       → Triplet avec ratio 3:2 (explicite)
{8 8 8 8 8}5:3   → 5 notes dans le temps de 3 (inhabituel)
{8 8 8}3:4       → 3 notes dans le temps de 4 (inhabituel)
```

## Table des ratios par défaut

La table `DEFAULT_TUPLET_RATIOS` dans `ChordGridParser.ts` définit les ratios courants :

### Temps simple
- **3:2** - Triplet (3 notes dans le temps de 2)
- **5:4** - Quintuplet (5 notes dans le temps de 4)
- **6:4** - Sextuplet (6 notes dans le temps de 4)
- **7:4** - Septuplet (7 notes dans le temps de 4)
- **9:8** - Nonuplet (9 notes dans le temps de 8)
- **10:8** - Décuplet
- **11:8**, **12:8**, **13:8**, **15:8** - etc.

### Temps composé
- **2:3** - Duplet (2 notes dans le temps de 3)
- **4:3** - Quadruplet (4 notes dans le temps de 3)
- **8:6** - Octuplet en temps composé

## Calcul de la durée

**Formule** : `Durée réelle = Σ(durées des notes) × (M / N)`

Où :
- N = numérateur du ratio (nombre de notes dans le tuplet)
- M = dénominateur du ratio (nombre de notes de référence)

### Exemples détaillés

**Triplet de croches (3:2)**
```
{8 8 8}3  (utilise le ratio par défaut 3:2)

Calcul :
- 3 croches = 3 × (1/8 ronde) = 3/8 de ronde
- Ratio 3:2 → durée réelle = (3/8) × (2/3) = 2/8 de ronde
- 2/8 de ronde = 1/4 de ronde = 1 noire ✓

Interprétation : 3 croches occupent le temps de 2 croches (= 1 noire)
```

**Quintuplet de croches (5:4)**
```
{8 8 8 8 8}5  (utilise le ratio par défaut 5:4)

Calcul :
- 5 croches = 5 × (1/8) = 5/8 de ronde
- Ratio 5:4 → durée réelle = (5/8) × (4/5) = 4/8 de ronde
- 4/8 de ronde = 1/2 de ronde = 2 noires ✓

Interprétation : 5 croches occupent le temps de 4 croches (= 2 noires)
```

**Ratio inhabituel (5:8)**
```
{8 8 8 8 8}5:8  (ratio explicite)

Calcul :
- 5 croches = 5 × (1/8) = 5/8 de ronde
- Ratio 5:8 → durée réelle = (5/8) × (8/5) = 8/8 de ronde
- 8/8 de ronde = 1 ronde = 4 noires ✓

Interprétation : 5 croches occupent le temps de 8 croches (= 1 ronde)
```

**Septuplet de croches (7:4)**
```
{8 8 8 8 8 8 8}7  (utilise le ratio par défaut 7:4)

Calcul :
- 7 croches = 7 × (1/8) = 7/8 de ronde
- Ratio 7:4 → durée réelle = (7/8) × (4/7) = 4/8 de ronde  
- 4/8 de ronde = 1/2 de ronde = 2 noires ✓

Interprétation : 7 croches occupent le temps de 4 croches (= 2 noires)
```

## Validation rythmique

L'erreur de validation initiale était due à un mauvais comptage des notes :

### ❌ Incorrect
```
4/4 | [{816-16 1616 8 8}5 ...] |
```
Ce tuplet contient 7 éléments (notes + silences), pas 5 !

### ✅ Correct
Le nombre après `}` doit correspondre au nombre réel de notes/silences :
```
4/4 | [{8 16 -16 16 16 8 8}7:6 ...] |
```

Ou bien corriger le comptage :
```
4/4 | [{8 8 8 8 8}5 ...] |
```

## Modification de la table

La table peut être étendue en ajoutant des entrées dans `DEFAULT_TUPLET_RATIOS` :

```typescript
private static readonly DEFAULT_TUPLET_RATIOS: Record<number, { numerator: number, denominator: number }> = {
  // ... ratios existants ...
  
  // Ajouter un nouveau ratio
  14: { numerator: 14, denominator: 8 },
  
  // ...
};
```

## Cas d'usage

### Mesure 4/4 complète avec triplets
```
4/4 | [{8 8 8}3 {8 8 8}3 {8 8 8}3 {8 8 8}3] |
```
4 triplets × 1/4 = 1 ronde = 4/4 ✅

### Mesure 4/4 avec quintuplet et septuplet
```
4/4 | [{8 8 8 8 8}5 {8 8 8 8 8 8 8}7] |
```
Quintuplet (2/4) + Septuplet (2/4) = 4/4 ✅

### Ratio inhabituel avec syntaxe explicite
```
4/4 | [{8 8 8 8 8}5:3 4 4] |
```
Quintuplet 5:3 (3/8) + 2 noires (2/4) = 3/8 + 4/8 = 7/8 ≠ 4/4 ❌

## Résumé

- ✅ Utilisez la syntaxe par défaut `{...}N` pour les cas courants
- ✅ Utilisez la syntaxe explicite `{...}N:M` pour les cas inhabituels
- ✅ Vérifiez que le nombre N correspond au nombre réel de notes/silences
- ✅ La table des ratios est évolutive et peut être étendue

## Tests

Le fichier `test/tuplet_ratios.spec.ts` contient 14 tests couvrant :
- Ratios par défaut (triplet, quintuplet, sextuplet, septuplet)
- Ratios explicites
- Validation des mesures
- Cas limites
