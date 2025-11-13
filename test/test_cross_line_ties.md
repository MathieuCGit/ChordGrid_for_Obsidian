# Tests des liaisons (ties) traversant les changements de ligne

Ce fichier teste les liaisons lorsqu'un changement de ligne survient, soit explicitement (avec `\n`) soit automatiquement (dépassement de largeur).

## Test 1: Liaison avec changement de ligne explicite (\n)

Une liaison simple qui traverse un changement de ligne explicite dans l'input :

```chord-grid
4/4
C[4_]
|F[4]|
```

**Attendu**: La liaison doit partir du Do, continuer vers la marge droite, puis reprendre depuis la marge gauche jusqu'au Fa.

## Test 2: Liaison avec changement de ligne automatique (wrap)

Beaucoup de mesures pour forcer un wrap automatique basé sur la largeur, avec une liaison qui traverse :

```chord-grid
4/4
C[4 4 4 4]|D[4 4 4 4]|E[4 4 4 4]|F[4_ 4 4 4]|G[4 4 4 4]|A[4 4 4 4]|B[4 4 4 4]|C[4 4 4 4]|
```

**Attendu**: Selon la largeur disponible, un changement de ligne automatique devrait survenir. Si la liaison (marquée par `_`) se trouve avant le changement de ligne, elle doit être rendue correctement avec tieToVoid/tieFromVoid.

## Test 3: Multiples liaisons consécutives avec changements de ligne

```chord-grid
4/4
C[4_]
|D[4_]
|E[4_]
|F[4]|
```

**Attendu**: 
- C → D : liaison cross-line (explicite)
- D → E : liaison cross-line (explicite)
- E → F : liaison cross-line (explicite)

Chaque liaison doit être correctement rendue vers la marge puis reprise depuis la marge.

## Test 4: Liaison normale dans la même ligne

```chord-grid
4/4
C[4_ 4]|D[4_ 4]|E[4_ 4]|F[4]|
```

**Attendu**: Toutes les liaisons sont sur la même ligne, donc pas de tieToVoid/tieFromVoid. Les liaisons doivent être rendues normalement entre notes adjacentes.

## Test 5: Liaison avec silences et changement de ligne

```chord-grid
4/4
C[8_-8]
|D[8 8]|
```

**Attendu**: La liaison va du premier Do (croche) jusqu'à la note qui suit le silence, avec un changement de ligne au milieu.

## Test 6: Vérification du zoom dynamique

Pour tester que les tailles sont bien gérées dynamiquement (préparation pour le futur outil de zoom) :

```chord-grid
4/4
C[16161616 16161616]|D[32323232 32323232 32323232 32323232]|E[4 4 4 4]|F[2 2]|G[1]|
```

**Attendu**: Les mesures doivent avoir des largeurs différentes selon leur densité rythmique. Le changement de ligne automatique doit s'adapter dynamiquement.

## Notes de vérification

Lors des tests, vérifier :
1. ✅ Les deux types de changements de ligne sont détectés
2. ✅ `tieToVoid` est bien marqué en fin de ligne
3. ✅ `tieFromVoid` est bien marqué en début de ligne suivante
4. ✅ Les courbes de liaison sont dessinées correctement (vers/depuis les marges)
5. ✅ Pas de régression sur les liaisons normales (même ligne)
6. ✅ Le système de largeur dynamique fonctionne pour préparer le zoom
