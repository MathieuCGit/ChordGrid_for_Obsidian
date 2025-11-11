# Test Debug Logger

Ce fichier permet de tester le système de logging du plugin Chord Grid.

## Test 1 : Grille simple

```chordgrid
4/4 | Am[2 2] | C[2 2] | G[2 2] | F[2 2] |
```

## Test 2 : Ligatures simples (théoriquement)

```chordgrid
4/4 | Am[2 2 2 2] | C[1 1 1 1] |
```

## Test 3 : Grille avec sauts de ligne

```chordgrid
4/4 | Am[2 2] | C[2 2] | <br>
| G[2 2] | F[2 2] |
```

## Test 4 : Mesure complexe

```chordgrid
4/4 | Am[8 8 4 8 8 4] | C[4 4 2] | G[2 2 2 2] |
```

## Instructions

1. Ouvrir ce fichier dans Obsidian
2. Ouvrir le panneau "Debug Logs" (cliquer sur 🐛)
3. Observer les logs détaillés pour chaque bloc
4. Les logs montrent :
   - Le parsing de la grille
   - Le layout des mesures
   - Les positions des notes
   - La détection et le dessin des ligatures
