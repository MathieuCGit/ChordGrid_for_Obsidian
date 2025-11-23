# Test de diagnostic des métadonnées

Ce fichier teste le nouveau système de métadonnées enrichies et le rapport de diagnostic pour l'alignement chords-stems.

## Test 1: Simple rhythm with chord
```chordgrid
4/4 ||: C[4 88_4 4] | % | G[%] | % :||
```

## Test 2: Multiple chords per measure
```chordgrid
4/4 | C[4 4] G[4 4] | Am[4 4] F[4 4] |
```

## Test 3: Mixed rhythms
```chordgrid
4/4 | C[8 8 4 4] | G[4. 8 4] | Am[2 4 4] |
```

## Notes de diagnostic

Pour activer le rapport de diagnostic dans la console :

1. Ouvrir le bloc ChordGrid dans Obsidian
2. Ouvrir la console développeur (Ctrl+Shift+I ou Cmd+Option+I)
3. Le rapport s'affiche automatiquement si `debugPlacement` est activé dans les options

Le rapport indique pour chaque mesure :
- Liste des accords avec leur position X et mode d'ancrage
- Liste des hampes avec leur position centerX et direction
- Différence d'alignement entre premier accord et première hampe
- Statut : ✅ ALIGNED (< 0.5px) ou ❌ MISALIGNED (≥ 0.5px)
