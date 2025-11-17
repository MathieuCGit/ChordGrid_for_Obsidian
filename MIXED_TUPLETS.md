# Tuplets avec Valeurs Rythmiques Mixtes (baseLen)

## Vue d'ensemble

Cette implémentation suit la convention de **MuseScore** pour gérer les tuplets contenant des valeurs rythmiques différentes (par exemple, un mélange de croches et de doubles-croches).

## Concept clé : baseLen

Le **baseLen** (longueur de base) est la **plus petite valeur rythmique** présente dans le tuplet. Il sert d'unité de référence pour calculer la durée cumulative.

### Exemple MuseScore

D'après la documentation MuseScore (`tuplet.h`) :

```cpp
//   @@ Tuplet
//!     Example of 1/8 triplet:
//!       _baseLen     = 1/8  (tuplet is measured in eighth notes)
//!       _ratio       = 3/2  (3 eighth tuplet notes played in the space of 2 regular eighth notes)
```

## Convention de notation : N:M

### Pour tuplets uniformes

```
{8 8 8}3:2
```

- **N = 3** : nombre de notes (toutes des croches)
- **M = 2** : elles occupent le temps de 2 croches
- **baseLen = 1/8** (croche)

### Pour tuplets mixtes

```
{816-16 1616 8 8}5:4
```

- **baseLen = 1/16** (double-croche, la plus petite valeur)
- **Contenu en unités de 16** :
  - 8 = 2 unités
  - 16 = 1 unité
  - Total : 2+1+1+1+1+2+2 = **10 unités de 16** = **5 croches**
- **N = 5** : nombre d'unités de baseLen normalisé (5 croches)
- **M = 4** : elles occupent le temps de 4 croches
- **Durée réelle** : (5/8) × (4/5) = 4/8 = **2 noires**

## Calcul détaillé

### Étape 1 : Trouver baseLen

```typescript
let baseLen = Infinity;
for (const element of tuplet.elements) {
  const noteValue = element.value; // 4=noire, 8=croche, 16=double-croche
  if (noteValue > baseLen) {
    baseLen = noteValue; // Plus grande valeur numérique = plus courte durée
  }
}
```

### Étape 2 : Calculer les unités cumulatives

```typescript
let cumulativeUnits = 0;
for (const element of tuplet.elements) {
  const noteValue = element.value;
  const dottedMultiplier = element.dotted ? 1.5 : 1;
  // Convertir en unités de baseLen
  const unitsOfBaseLen = (baseLen / noteValue) * dottedMultiplier;
  cumulativeUnits += unitsOfBaseLen;
}
```

### Étape 3 : Appliquer le ratio

```typescript
// Si ratio explicite N:M fourni
if (tuplet.ratio) {
  tupletRatio = M / N;
}

// Durée cumulative en fraction de ronde
const cumulativeDuration = cumulativeUnits / baseLen;

// Durée réelle après application du ratio
const actualDuration = cumulativeDuration * tupletRatio;
```

## Exemples pratiques

### Exemple 1 : Triplet classique

```chordgrid
4/4 | [{8 8 8}3:2 4 4 4] |
```

- baseLen = 8
- Unités : 1 + 1 + 1 = 3 croches
- Ratio 3:2 → (3/8) × (2/3) = 2/8 = 1/4 ronde = **1 noire**
- Total mesure : 1 + 1 + 1 + 1 = **4 noires** ✓

### Exemple 2 : Tuplet mixte utilisateur

```chordgrid
4/4 | [{816-16 1616 8 8}5:4 2] |
```

- baseLen = 16
- Unités : 2+1+1+1+1+2+2 = 10 doubles-croches = 5 croches
- Ratio 5:4 → (5/8) × (4/5) = 4/8 = 1/2 ronde = **2 noires**
- Blanche = **2 noires**
- Total mesure : 2 + 2 = **4 noires** ✓

### Exemple 3 : Tuplet super mixte

```chordgrid
4/4 | [{4 8 16}7:4 2] |
```

- baseLen = 16 (double-croche)
- Unités en 16èmes :
  - 4 (noire) = 4 unités
  - 8 (croche) = 2 unités
  - 16 (double-croche) = 1 unité
  - Total = 4+2+1 = **7 unités de 16** = 7/16 ronde
- Ratio 7:4 → (7/16) × (4/7) = 4/16 = 1/4 ronde = **1 noire**
- Blanche = **2 noires**
- Total mesure : 1 + 2 = **3 noires** (ne remplit pas 4/4) ❌

## Avantages de cette approche

### ✅ Conforme au standard

- Compatible avec **MuseScore**
- Compatible avec **MusicXML**
- Compatible avec **Wikipedia** (définition standard des tuplets)

### ✅ Flexible

- Gère les tuplets uniformes : `{8 8 8}3:2`
- Gère les tuplets mixtes : `{816-16 1616 8 8}5:4`
- Gère les silences : `{8-8 8}3:2`
- Gère les notes pointées : `{8. 16 16}3:2`

### ✅ Prévisible

- N représente toujours la durée cumulative normalisée
- M représente toujours la durée cible
- Le calcul est déterministe et reproductible

## Différences avec l'ancienne approche

### Avant (compte de notes)

```
{816-16 1616 8 8}7:8
```

- N = 7 (nombre de notes/silences)
- ❌ Ne capture pas l'information de durée

### Après (baseLen)

```
{816-16 1616 8 8}5:4
```

- N = 5 (croches équivalentes, basé sur baseLen=16)
- ✅ Capture correctement la durée cumulative

## Référence MuseScore

Code source : `src/engraving/dom/tuplet.cpp`

```cpp
Fraction DurationElement::globalTicks() const
{
    Fraction f(m_duration);
    for (Tuplet* t = tuplet(); t; t = t->tuplet()) {
        f /= t->ratio();
    }
    return f;
}
```

Documentation : `src/engraving/dom/tuplet.h`

```cpp
//!    Entire tuplet has a duration of _baseLen * _ratio.denominator().
//!    A single tuplet note has duration of _baseLen * _ratio.denominator() / _ratio.numerator().
```

## Tests de validation

Voir `test/mixed_tuplet_baselen.spec.ts` pour les cas de test détaillés.

```bash
npm test -- test/mixed_tuplet_baselen.spec.ts
```

---

**Implémenté le 14 novembre 2025**  
Compatible avec MuseScore 4.x conventions
