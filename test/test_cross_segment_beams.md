# Test Cross-Segment Beams

Test pour vérifier si les beams se connectent correctement entre segments d'accords sans espace.

## Cas 1 : Beams devraient se connecter (PAS d'espace avant G)

```chordgrid
4/4 | Am[8]G[8] |
```

Résultat attendu : Les deux croches doivent être liées par une barre horizontale.

## Cas 2 : Beams NE devraient PAS se connecter (espace avant G)

```chordgrid
4/4 | Am[8] G[8] |
```

Résultat attendu : Les deux croches sont séparées, chacune avec son propre crochet.

## Cas 3 : Pattern plus complexe

```chordgrid
4/4 | Am[4. 8_4 4_] | [_4 2_8]G[8] |
```

Expected: Le dernier 8 de la deuxième mesure et le 8 avec G devraient être liés.

## Cas 4 : Multiple segments sans espace

```chordgrid
4/4 | C[88]Dm[88]G[88 4] |
```

Résultat attendu : Tous les croches liées ensemble (6 notes liées).
