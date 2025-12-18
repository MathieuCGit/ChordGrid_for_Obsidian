# Tuplet Ratios - Documentation# Ratios de Tuplets - Documentation



## Overview## Vue d'ensemble



The tuplet system now supports three methods to determine rhythmic compression ratios:Le système de tuplets supporte maintenant trois méthodes pour déterminer le ratio de compression rythmique :



1. **Explicit ratios**: Syntax `{...}N:M` to force a specific ratio1. **Ratios explicites** : Syntaxe `{...}N:M` pour forcer un ratio spécifique

2. **Default ratio table**: For common cases (triplets, quintuplets, etc.)2. **Table des ratios par défaut** : Pour les cas courants (triplets, quintuplets, etc.)

3. **Automatic calculation**: Fallback for unusual cases3. **Calcul automatique** : Fallback pour les cas inhabituels



## Musical Convention## Convention musicale



**N:M means "N notes occupy the time of M notes of the same value"****N:M signifie "N notes occupent le temps de M notes de même valeur"**



The denominator M represents **how many notes of the same value** normally occupy this duration.Le dénominateur M représente **combien de notes de même valeur** occupent normalement cette durée.



### Examples### Exemples

- `3:2` → 3 notes in the time of 2 notes of the same value- `3:2` → 3 notes dans le temps de 2 notes de même valeur

- `5:4` → 5 notes in the time of 4 notes of the same value  - `5:4` → 5 notes dans le temps de 4 notes de même valeur  

- `5:8` → 5 notes in the time of 8 notes of the same value- `5:8` → 5 notes dans le temps de 8 notes de même valeur

- `7:4` → 7 notes in the time of 4 notes of the same value- `7:4` → 7 notes dans le temps de 4 notes de même valeur



**Important**: The denominator does NOT represent a note value (4, 8, 16), but the **number** of reference notes.**Important** : Le dénominateur ne représente PAS une valeur de note (4, 8, 16), mais le **nombre** de notes de référence.



## Syntax## Syntaxe



### Default ratio (recommended)### Ratio par défaut (recommandé)

``````

{8 8 8}3        → Triplet with 3:2 ratio (default){8 8 8}3        → Triplet avec ratio 3:2 (par défaut)

{8 8 8 8 8}5    → Quintuplet with 5:4 ratio (default){8 8 8 8 8}5    → Quintuplet avec ratio 5:4 (par défaut)

{8 8 8 8 8 8 8}7 → Septuplet with 7:4 ratio (default){8 8 8 8 8 8 8}7 → Septuplet avec ratio 7:4 (par défaut)

``````



### Explicit ratio### Ratio explicite

``````

{8 8 8}3:2       → Triplet with 3:2 ratio (explicit){8 8 8}3:2       → Triplet avec ratio 3:2 (explicite)

{8 8 8 8 8}5:3   → 5 notes in the time of 3 (unusual){8 8 8 8 8}5:3   → 5 notes dans le temps de 3 (inhabituel)

{8 8 8}3:4       → 3 notes in the time of 4 (unusual){8 8 8}3:4       → 3 notes dans le temps de 4 (inhabituel)

``````



## Default Ratio Table## Table des ratios par défaut



The `DEFAULT_TUPLET_RATIOS` table in `ChordGridParser.ts` defines common ratios:La table `DEFAULT_TUPLET_RATIOS` dans `ChordGridParser.ts` définit les ratios courants :



### Simple time### Temps simple

- **3:2** - Triplet (3 notes in the time of 2)- **3:2** - Triplet (3 notes dans le temps de 2)

- **5:4** - Quintuplet (5 notes in the time of 4)- **5:4** - Quintuplet (5 notes dans le temps de 4)

- **6:4** - Sextuplet (6 notes in the time of 4)- **6:4** - Sextuplet (6 notes dans le temps de 4)

- **7:4** - Septuplet (7 notes in the time of 4)- **7:4** - Septuplet (7 notes dans le temps de 4)

- **9:8** - Nonuplet (9 notes in the time of 8)- **9:8** - Nonuplet (9 notes dans le temps de 8)

- **10:8** - Decuplet- **10:8** - Décuplet

- **11:8**, **12:8**, **13:8**, **15:8** - etc.- **11:8**, **12:8**, **13:8**, **15:8** - etc.



### Compound time### Temps composé

- **2:3** - Duplet (2 notes in the time of 3)- **2:3** - Duplet (2 notes dans le temps de 3)

- **4:3** - Quadruplet (4 notes in the time of 3)- **4:3** - Quadruplet (4 notes dans le temps de 3)

- **8:6** - Octuplet in compound time- **8:6** - Octuplet en temps composé



## Duration Calculation## Calcul de la durée



**Formula**: `Actual duration = Σ(note durations) × (M / N)`**Formule** : `Durée réelle = Σ(durées des notes) × (M / N)`



Where:Où :

- N = ratio numerator (number of notes in the tuplet)- N = numérateur du ratio (nombre de notes dans le tuplet)

- M = ratio denominator (number of reference notes)- M = dénominateur du ratio (nombre de notes de référence)



### Detailed Examples### Exemples détaillés



**Eighth-note triplet (3:2)****Triplet de croches (3:2)**

``````

{8 8 8}3  (uses default ratio 3:2){8 8 8}3  (utilise le ratio par défaut 3:2)



Calculation:Calcul :

- 3 eighth-notes = 3 × (1/8 whole) = 3/8 whole- 3 croches = 3 × (1/8 ronde) = 3/8 de ronde

- Ratio 3:2 → actual duration = (3/8) × (2/3) = 2/8 whole- Ratio 3:2 → durée réelle = (3/8) × (2/3) = 2/8 de ronde

- 2/8 whole = 1/4 whole = 1 quarter-note ✓- 2/8 de ronde = 1/4 de ronde = 1 noire ✓



Interpretation: 3 eighth-notes occupy the time of 2 eighth-notes (= 1 quarter-note)Interprétation : 3 croches occupent le temps de 2 croches (= 1 noire)

``````



**Eighth-note quintuplet (5:4)****Quintuplet de croches (5:4)**

``````

{8 8 8 8 8}5  (uses default ratio 5:4){8 8 8 8 8}5  (utilise le ratio par défaut 5:4)



Calculation:Calcul :

- 5 eighth-notes = 5 × (1/8) = 5/8 whole- 5 croches = 5 × (1/8) = 5/8 de ronde

- Ratio 5:4 → actual duration = (5/8) × (4/5) = 4/8 whole- Ratio 5:4 → durée réelle = (5/8) × (4/5) = 4/8 de ronde

- 4/8 whole = 1/2 whole = 2 quarter-notes ✓- 4/8 de ronde = 1/2 de ronde = 2 noires ✓



Interpretation: 5 eighth-notes occupy the time of 4 eighth-notes (= 2 quarter-notes)Interprétation : 5 croches occupent le temps de 4 croches (= 2 noires)

``````



**Unusual ratio (5:8)****Ratio inhabituel (5:8)**

``````

{8 8 8 8 8}5:8  (explicit ratio){8 8 8 8 8}5:8  (ratio explicite)



Calculation:Calcul :

- 5 eighth-notes = 5 × (1/8) = 5/8 whole- 5 croches = 5 × (1/8) = 5/8 de ronde

- Ratio 5:8 → actual duration = (5/8) × (8/5) = 8/8 whole- Ratio 5:8 → durée réelle = (5/8) × (8/5) = 8/8 de ronde

- 8/8 whole = 1 whole = 4 quarter-notes ✓- 8/8 de ronde = 1 ronde = 4 noires ✓



Interpretation: 5 eighth-notes occupy the time of 8 eighth-notes (= 1 whole note)Interprétation : 5 croches occupent le temps de 8 croches (= 1 ronde)

``````



**Eighth-note septuplet (7:4)****Septuplet de croches (7:4)**

``````

{8 8 8 8 8 8 8}7  (uses default ratio 7:4){8 8 8 8 8 8 8}7  (utilise le ratio par défaut 7:4)



Calculation:Calcul :

- 7 eighth-notes = 7 × (1/8) = 7/8 whole- 7 croches = 7 × (1/8) = 7/8 de ronde

- Ratio 7:4 → actual duration = (7/8) × (4/7) = 4/8 whole  - Ratio 7:4 → durée réelle = (7/8) × (4/7) = 4/8 de ronde  

- 4/8 whole = 1/2 whole = 2 quarter-notes ✓- 4/8 de ronde = 1/2 de ronde = 2 noires ✓



Interpretation: 7 eighth-notes occupy the time of 4 eighth-notes (= 2 quarter-notes)Interprétation : 7 croches occupent le temps de 4 croches (= 2 noires)

``````



## Rhythmic Validation## Validation rythmique



The initial validation error was due to incorrect note counting:L'erreur de validation initiale était due à un mauvais comptage des notes :



### ❌ Incorrect### ❌ Incorrect

``````

4/4 | [{816-16 1616 8 8}5 ...] |4/4 | [{816-16 1616 8 8}5 ...] |

``````

This tuplet contains 7 elements (notes + rests), not 5!Ce tuplet contient 7 éléments (notes + silences), pas 5 !



### ✅ Correct### ✅ Correct

The number after `}` must match the actual number of notes/rests:Le nombre après `}` doit correspondre au nombre réel de notes/silences :

``````

4/4 | [{8 16 -16 16 16 8 8}7:6 ...] |4/4 | [{8 16 -16 16 16 8 8}7:6 ...] |

``````



Or correct the count:Ou bien corriger le comptage :

``````

4/4 | [{8 8 8 8 8}5 ...] |4/4 | [{8 8 8 8 8}5 ...] |

``````



## Modifying the Table## Modification de la table



The table can be extended by adding entries to `DEFAULT_TUPLET_RATIOS`:La table peut être étendue en ajoutant des entrées dans `DEFAULT_TUPLET_RATIOS` :



```typescript```typescript

private static readonly DEFAULT_TUPLET_RATIOS: Record<number, { numerator: number, denominator: number }> = {private static readonly DEFAULT_TUPLET_RATIOS: Record<number, { numerator: number, denominator: number }> = {

  // ... existing ratios ...  // ... ratios existants ...

    

  // Add new ratio  // Ajouter un nouveau ratio

  14: { numerator: 14, denominator: 8 },  14: { numerator: 14, denominator: 8 },

    

  // ...  // ...

};};

``````



## Use Cases## Cas d'usage



### Complete 4/4 measure with triplets### Mesure 4/4 complète avec triplets

``````

4/4 | [{8 8 8}3 {8 8 8}3 {8 8 8}3 {8 8 8}3] |4/4 | [{8 8 8}3 {8 8 8}3 {8 8 8}3 {8 8 8}3] |

``````

4 triplets × 1/4 = 1 whole = 4/4 ✅4 triplets × 1/4 = 1 ronde = 4/4 ✅



### 4/4 measure with quintuplet and septuplet### Mesure 4/4 avec quintuplet et septuplet

``````

4/4 | [{8 8 8 8 8}5 {8 8 8 8 8 8 8}7] |4/4 | [{8 8 8 8 8}5 {8 8 8 8 8 8 8}7] |

``````

Quintuplet (2/4) + Septuplet (2/4) = 4/4 ✅Quintuplet (2/4) + Septuplet (2/4) = 4/4 ✅



### Unusual ratio with explicit syntax### Ratio inhabituel avec syntaxe explicite

``````

4/4 | [{8 8 8 8 8}5:3 4 4] |4/4 | [{8 8 8 8 8}5:3 4 4] |

``````

Quintuplet 5:3 (3/8) + 2 quarter-notes (2/4) = 3/8 + 4/8 = 7/8 ≠ 4/4 ❌Quintuplet 5:3 (3/8) + 2 noires (2/4) = 3/8 + 4/8 = 7/8 ≠ 4/4 ❌



## Summary## Résumé



- ✅ Use default syntax `{...}N` for common cases- ✅ Utilisez la syntaxe par défaut `{...}N` pour les cas courants

- ✅ Use explicit syntax `{...}N:M` for unusual cases- ✅ Utilisez la syntaxe explicite `{...}N:M` pour les cas inhabituels

- ✅ Verify that the number N matches the actual number of notes/rests- ✅ Vérifiez que le nombre N correspond au nombre réel de notes/silences

- ✅ The ratio table is extensible and can be expanded- ✅ La table des ratios est évolutive et peut être étendue



## Tests## Tests



The file `test/tuplet_ratios.spec.ts` contains 14 tests covering:Le fichier `test/tuplet_ratios.spec.ts` contient 14 tests couvrant :

- Default ratios (triplet, quintuplet, sextuplet, septuplet)- Ratios par défaut (triplet, quintuplet, sextuplet, septuplet)

- Explicit ratios- Ratios explicites

- Measure validation- Validation des mesures

- Edge cases- Cas limites

