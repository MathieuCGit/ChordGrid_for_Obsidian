# Test : Chord-Only Measures with % Repeat

## Cas 1 : Simple chord-only with %

```chordgrid
| Dm | % | E | % | Am | E | Am | E |
```

**Comportement attendu** :
- Mesure 1 : `Dm` (chord-only, valide)
- Mesure 2 : `%` copie `Dm` (chord-only, valide)
- Mesure 3 : `E` (chord-only, valide)
- Mesure 4 : `%` copie `E` (chord-only, valide)
- Aucune erreur de validation rythmique

---

## Cas 2 : Mix chord-only et rythme explicite

```chordgrid
| Dm | % | E[4 4 4 4] | % |
```

**Comportement attendu** :
- Mesure 1 : `Dm` (chord-only, valide)
- Mesure 2 : `%` copie `Dm` (chord-only, valide)
- Mesure 3 : `E[4 4 4 4]` (rythme explicite, 4 quarter-notes)
- Mesure 4 : `%` copie `E[4 4 4 4]` (rythme explicite, 4 quarter-notes)
- Aucune erreur de validation

---

## Cas 3 : Multiple chords per measure avec %

```chordgrid
| Dm / F | % | Am / C | % |
```

**Comportement attendu** :
- Mesure 1 : `Dm / F` (2 accords, chord-only, valide)
- Mesure 2 : `%` copie `Dm / F` (chord-only, valide)
- Mesure 3 : `Am / C` (2 accords, chord-only, valide)
- Mesure 4 : `%` copie `Am / C` (chord-only, valide)
- Aucune erreur

---

## Cas 4 : % en cascade (% copie un %)

```chordgrid
| Dm | % | % | % |
```

**Comportement attendu** :
- Mesure 1 : `Dm` (chord-only, valide)
- Mesure 2 : `%` copie `Dm` (chord-only, valide)
- Mesure 3 : `%` copie mesure 2 qui contient `Dm` (chord-only, valide)
- Mesure 4 : `%` copie mesure 3 qui contient `Dm` (chord-only, valide)
- Aucune erreur

---

## Cas 5 : Erreur - % avec rythme invalide

```chordgrid
| C[4 4 4] | % |
```

**Comportement attendu** :
- Mesure 1 : Erreur de validation (3 quarter-notes au lieu de 4)
- Mesure 2 : `%` copie la mesure 1 erronée (même erreur propagée)

---

## Notes d'Implémentation

### Changement Effectué

Dans `ChordGridParser.ts`, ligne ~375-390, ajout d'une condition pour skip la validation rythmique des mesures "chord-only" :

```typescript
// Skip rhythm validation for chord-only measures
const hasRhythm = measure.beats.some(beat => beat.notes && beat.notes.length > 0);

if (hasRhythm) {
  // Validation rythmique normale
  const diff = Math.abs(foundQuarterNotes - expectedQuarterNotes);
  if (diff > 1e-6) {
    errors.push({...});
  }
}
// Chord-only measures are implicitly valid
```

### Justification

Dans les grilles d'accords jazz :
- Une mesure peut contenir uniquement des accords (pas de rythme)
- `| Dm |` est une mesure valide qui implique "jouer Dm pendant toute la mesure"
- `| % |` doit pouvoir copier ces mesures chord-only
- La validation rythmique ne s'applique qu'aux mesures avec rythme explicite

### Compatibilité

Cette correction préserve la compatibilité :
- ✅ Mesures avec rythme explicite → validation normale
- ✅ Mesures chord-only → pas de validation (acceptées)
- ✅ `%` copiant une mesure chord-only → pas d'erreur
- ✅ `%` copiant une mesure avec rythme → validation normale

---

**Date** : 25 novembre 2025  
**Version** : 2.2.0  
**Bug** : Rhythm validation error on `%` copying chord-only measures  
**Fix** : Skip rhythm validation for chord-only measures
