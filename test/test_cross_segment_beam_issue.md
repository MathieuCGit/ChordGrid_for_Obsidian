# Test: Ligature entre segments

Cas problématique : la dernière croche de `[_4 2_8]` devrait être ligaturée avec `G[8]`

```chord-grid
4/4 | Am[4. 8_4 4_] | [_4 2_8]G[8] |
```

Attendu : les deux dernières croches (8) du deuxième temps et du troisième temps doivent être ligaturées ensemble.

## Analyse

- Premier segment : `[_4 2_8]` 
  - `_4` : noire liée
  - `2` : blanche
  - `_8` : croche liée (dernière note du segment)
  
- Deuxième segment : `G[8]`
  - `8` : croche

La croche `_8` et la croche `8` doivent être ligaturées car elles sont consécutives et sans espace les séparant dans la notation.
