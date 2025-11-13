# Test des ligatures avec silences

Ce fichier teste le rendu correct des ligatures lorsque des silences sont présents dans les groupes rythmiques.

## Test 1 : Exemple fourni par l'utilisateur

```chordgrid
4/4 | C[1616-1616 -4 4 -88] | C[16-816 3232-323232-323232 4_88] |
```

Résultat attendu :
- **Mesure 1** : 
  - Groupe 1 : deux doubles-croches liées (1616)
  - Silence de doubles-croches (-1616) : pas de ligature, silence affiché
  - Silence de noire (-4) : pas de ligature, silence affiché
  - Noire (4) : pas de ligature (note longue)
  - Silence de croches (-88) : pas de ligature, silence affiché

- **Mesure 2** :
  - Double-croche (16)
  - Silence de croche (-8) : brise la ligature
  - Double-croche (16) : isolée, flag individuel
  - Groupe : six triples-croches liées (3232-32)
  - Silence de triple-croche (32) : brise la ligature
  - Groupe : cinq triples-croches liées (32-3232)
  - Noire liée à deux croches (4_88)

## Test 2 : Silences qui brisent les ligatures

```chordgrid
4/4 | C[88-88 1616-1616] | D[8 -8 8 8] |
```

Résultat attendu :
- **Mesure 1** :
  - Deux croches liées (88)
  - Silence de deux croches (-88)
  - Quatre doubles-croches liées (1616)
  - Silence de quatre doubles-croches (-1616)

- **Mesure 2** :
  - Croche isolée (8)
  - Silence de croche (-8)
  - Deux croches liées (8 8)

## Test 3 : Notes longues ne sont pas liées

```chordgrid
4/4 | Am[4 8 8 16 16 16 16] | G[2 4 8 8] |
```

Résultat attendu :
- **Mesure 1** :
  - Noire (4) : pas de ligature
  - Deux croches liées (8 8)
  - Quatre doubles-croches liées (16 16 16 16)

- **Mesure 2** :
  - Blanche (2) : pas de ligature
  - Noire (4) : pas de ligature
  - Deux croches liées (8 8)

## Test 4 : Combinaison complexe

```chordgrid
4/4 | C[1616 -8 8 32323232] | F[8 8 -4 4 4] |
```

Résultat attendu :
- **Mesure 1** :
  - Quatre doubles-croches liées (1616)
  - Silence de croche (-8)
  - Croche isolée (8)
  - Huit triples-croches liées (32323232)

- **Mesure 2** :
  - Deux croches liées (8 8)
  - Silence de noire (-4)
  - Deux noires (4 4) : pas de ligature
