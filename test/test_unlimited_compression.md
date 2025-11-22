# Test compression illimitée avec measures-per-line

Exemple concret avec 4 mesures par ligne forcées :

```chordgrid
picks-auto stems-down measures-per-line:4 show%
4/4 ||:.1-3 C[88 81616_16-161616 88] | G[%] | F[16161616_88 88 4] :||.4 Am[88_4 4.8] ||.4
```

Le renderer devrait maintenant :
- Forcer exactement 4 mesures par ligne (même si ça nécessite une compression énorme)
- Maintenir les ratios relatifs entre croches (8), doubles-croches (16) et noires (4)
- Pas de limite minimum/maximum - compression totale si nécessaire
- L'utilisateur décide si c'est trop compressé ou non
