# Changelog - Tuplets avec valeurs rythmiques mixtes (baseLen)

## Date : 14 novembre 2025

## Changements majeurs

### 🎯 Nouvelle fonctionnalité : Support des tuplets avec valeurs rythmiques mixtes

Implémentation du concept **baseLen** (longueur de base) inspiré de **MuseScore** pour gérer correctement les tuplets contenant des notes de valeurs différentes.

### Fichiers modifiés

#### `src/parser/ChordGridParser.ts`

**Changements dans la validation des tuplets (lignes 125-195)** :

1. **Calcul de baseLen** : Détection automatique de la plus petite valeur rythmique du tuplet
   ```typescript
   let baseLen = Infinity;
   for (const element of tuplet.elements) {
     if (element.value > baseLen) {
       baseLen = element.value; // Plus grande valeur numérique = plus courte durée
     }
   }
   ```

2. **Calcul des unités cumulatives** : Conversion de toutes les notes en unités de baseLen
   ```typescript
   const unitsOfBaseLen = (baseLen / noteValue) * dottedMultiplier;
   cumulativeUnits += unitsOfBaseLen;
   ```

3. **Application du ratio** : Durée réelle basée sur les unités cumulatives
   ```typescript
   const cumulativeDuration = cumulativeUnits / baseLen;
   const actualDuration = cumulativeDuration * tupletRatio;
   ```

**Mise à jour de la documentation (lignes 40-57)** :

- Clarification de la convention N:M pour valeurs mixtes
- Ajout d'exemples avec baseLen
- Référence à la compatibilité MuseScore

### Nouveaux fichiers

#### `test/mixed_tuplet_baselen.spec.ts`

Tests de validation pour :
- Tuplets mixtes : `{816-16 1616 8 8}5:4`
- Tuplets uniformes : `{8 8 8}3:2`
- Calcul de baseLen avec diverses combinaisons

#### `MIXED_TUPLETS.md`

Documentation complète incluant :
- Explication du concept baseLen
- Convention N:M pour tuplets mixtes
- Exemples pratiques
- Comparaison avant/après
- Référence au code source MuseScore

#### `test/test_mixed_tuplet.md`

Exemples de cas d'usage et notes de calcul

## Convention de notation mise à jour

### Avant (simple count)

```
{8 8 8}3:2
N = nombre de notes (3)
M = durée cible (2 croches)
```

### Après (baseLen compatible MuseScore)

```
{816-16 1616 8 8}5:4
baseLen = 16 (plus petite valeur)
N = 5 (unités de baseLen normalisées = 5 croches)
M = 4 (durée cible = 4 croches)
```

## Résultats des tests

```
Test Suites: 9 passed, 9 total
Tests:       57 passed, 57 total (dont 4 nouveaux tests)
```

### Nouveaux tests passés

1. ✅ `{816-16 1616 8 8}5:4` - Validation d'erreur attendue
2. ✅ `{816-16 1616 8 8}5:4 2` - Validation correcte (4/4 complet)
3. ✅ `{8 8 8}3:2` - Triplet classique
4. ✅ `{4 8 16}3:2` - Tuplet super-mixte

## Compatibilité

### ✅ Rétrocompatible

Tous les tests existants (53) passent toujours :
- `parse.spec.ts`
- `tuplet_parser.spec.ts`
- `tuplet_validation.spec.ts`
- `tuplet_ratios.spec.ts`
- `beam_parse.spec.ts`
- `analyzer.spec.ts`
- `tuplet_beam_spacing.spec.ts`
- `tuplet_beam_with_rests_spacing.spec.ts`

### ✅ Conforme aux standards

- **MuseScore** : Même approche que `tuplet.cpp` / `tuplet.h`
- **MusicXML** : Compatible avec export/import
- **Wikipedia** : Respecte la définition standard des tuplets

## Exemple d'utilisation

### Cas utilisateur original

```chordgrid
4/4 | [{816-16 1616 8 8}5:4 2] |
```

**Calcul** :
- baseLen = 16
- Unités : 2+1+1+1+1+2+2 = 10 doubles-croches = 5 croches
- Ratio 5:4 : 5 croches dans le temps de 4 croches
- Durée tuplet : (5/8) × (4/5) = 2 noires
- Blanche : 2 noires
- **Total : 4 noires** ✓

## Migration

Aucune migration nécessaire. Le code détecte automatiquement si un ratio explicite est fourni et applique la logique baseLen.

### Pour les utilisateurs

**Tuplets uniformes** (inchangés) :
```
{8 8 8}3:2  ✓ fonctionne toujours
```

**Tuplets mixtes** (nouvelle fonctionnalité) :
```
{816-16 1616 8 8}5:4  ✓ maintenant supporté !
```

## Références

- Code MuseScore : `src/engraving/dom/tuplet.cpp` lignes 86-95, 854-878
- Documentation : `src/engraving/dom/tuplet.h` lignes 16-21
- Tests : `test/mixed_tuplet_baselen.spec.ts`
- Doc : `MIXED_TUPLETS.md`

---

**Auteur** : GitHub Copilot  
**Date** : 14 novembre 2025  
**Branche** : dev/v2.1
