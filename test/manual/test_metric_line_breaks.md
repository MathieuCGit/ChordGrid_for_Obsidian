# Test: Changements de Métrique avec Retours à la Ligne

Ce test vérifie que les changements de métrique sont correctement affichés en tenant compte :
1. Des retours à la ligne **forcés** (avec `\n` ou simplement un saut de ligne)
2. Des retours à la ligne **automatiques** (calculés par le script)

## Test 1: Retour à la ligne forcé après changement de métrique

Comportement attendu :
- Ligne 1 : 4/4 global affiché
- Ligne 2 : 2/4 affiché inline (changement)
- Ligne 3 : 2/4 affiché au début (métrique courante ≠ globale)
- Ligne 4 : 4/4 affiché inline (retour à la métrique globale)

```chord-grid
finger:fr show%
4/4 | Em[88 88 88 88] | D[88 88 88 88] | Em[88 88 88 88] |
2/4 G[88 88] | C[88 88] |
G[88 88] | D[88 88] |
4/4 Em[88 88 88 88] | D[88 88 88 88]
```

## Test 2: Votre exemple original

```chord-grid
finger:fr show%
4/4 | Em[88 88 88 88] | D[%] | % | Em[%] | 
Em[88 88] G[88 88] | C[88 88] G[88 88] | 
G[88 88 88 88] | C[88 88] G[88 88] | 
2/4 G[4 -4] | 
4/4 C[88 88 88 88] | % | G[%] | 
G[88 88] Em[88 88] | 
2/4 G[88 88] | 
4/4 D[88 88 88 88] | Em[88 88 88 88]
```

## Test 3: Changements multiples sur même ligne (automatique)

Comportement attendu :
- 4/4 → 3/4 → 2/4 → 4/4 tous affichés inline

```chord-grid
4/4 | C[88 88 88 88] | 3/4 D[88 88 88] | 2/4 G[88 88] | 4/4 Em[88 88 88 88] | Am[88 88 88 88]
```

## Test 4: Retour automatique avec métrique différente

Forçons un retour automatique en ajoutant beaucoup de mesures sur une ligne.
La métrique 2/4 devrait se réafficher au début de chaque ligne automatique.

```chord-grid
4/4 | C[88 88 88 88] | D[88 88 88 88] | Em[88 88 88 88] | G[88 88 88 88] | 2/4 Am[88 88] | Dm[88 88] | G[88 88] | C[88 88] | D[88 88] | Em[88 88] | Am[88 88] | G[88 88]
```

## Test 5: Alternance métrique avec line breaks

```chord-grid
4/4 | C[88 88 88 88] |
3/4 D[88 88 88] | Em[88 88 88] |
D[88 88 88] | G[88 88 88] |
2/4 Am[88 88] | C[88 88] |
Am[88 88] | D[88 88] |
4/4 G[88 88 88 88] | C[88 88 88 88]
```

Attendu :
- Ligne 1 : 4/4 global
- Ligne 2 : 3/4 inline (changement)
- Ligne 3 : 3/4 au début (≠ global)
- Ligne 4 : 2/4 inline (changement)
- Ligne 5 : 2/4 au début (≠ global)
- Ligne 6 : 4/4 inline (retour au global)
