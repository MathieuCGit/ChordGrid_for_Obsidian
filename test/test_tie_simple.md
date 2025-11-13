# Test simple des liaisons avec changement de ligne

## Test 1 : Liaison avec \n explicite (le plus simple)

```chordgrid
4/4
C[4 4 4 4_]
|D[4 4 4 4]|
```

**Attendu** : Une liaison doit partir de la dernière noire du Do (première ligne) et arriver à la première noire du Ré (deuxième ligne).
La liaison doit aller jusqu'à la marge droite, puis reprendre depuis la marge gauche.

## Test 2 : Liaison normale (sans changement de ligne) - RÉFÉRENCE

```chordgrid
4/4
C[4_ 4 4 4]|
```

**Attendu** : Une liaison normale entre les deux premières noires. Ceci doit continuer à fonctionner parfaitement (ne pas régresser).

## Test 3 : Plusieurs mesures pour forcer un wrap automatique

```chordgrid
4/4
C[4 4 4 4]|D[4 4 4 4]|E[4 4 4 4]|F[4 4 4 4]|G[4 4 4 4_]|A[4 4 4 4]|B[4 4 4 4]|C[4 4 4 4]|D[4 4 4 4]|E[4 4 4 4]|
```

**Attendu** : 
- Si le wrap automatique se produit **avant** le G avec liaison, celle-ci doit rester normale
- Si le wrap automatique se produit **après** le G avec liaison (entre G et A), la liaison doit devenir cross-line

## Points de vérification

Dans la console de débogage, chercher :
- `🔧 Post-processing ties for line breaks`
- `🔧 Converting cross-line tie: note X -> note Y`

Si ces messages apparaissent, le post-processing fonctionne !
