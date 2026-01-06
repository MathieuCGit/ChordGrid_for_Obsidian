# Test de la directive zoom

## Test 1: Zoom à 50%
```chordgrid
zoom:50%
4/4 | C[4 4 4 4] | G[4 4 4 4] | Am[4 4 4 4] | F[4 4 4 4] |
```

## Test 2: Zoom à 75%
```chordgrid
zoom:75%
4/4 | C[4 4 4 4] | G[4 4 4 4] | Am[4 4 4 4] | F[4 4 4 4] |
```

## Test 3: Zoom par défaut (100%)
```chordgrid
4/4 | C[4 4 4 4] | G[4 4 4 4] | Am[4 4 4 4] | F[4 4 4 4] |
```

## Test 4: Zoom à 150%
```chordgrid
zoom:150%
4/4 | C[4 4 4 4] | G[4 4 4 4] | Am[4 4 4 4] | F[4 4 4 4] |
```

## Test 5: Zoom avec autres directives (pick + show%)
```chordgrid
zoom:60% pick show%
4/4 ||: C[8.16 88 4 168.] | G[%] | Am[%] | F[%] :||
```

## Test 6: Zoom avec measures-per-line
```chordgrid
zoom:80% measures-per-line:4 count
4/4 | Em[4 88 4 88] | D[4 88 4 88] | C[4 88 4 88] | G[4 88 4 88] |
    | Am[4 88 4 88] | F[4 88 4 88] | G[4 88 4 88] | C[4 88 4 88] |
```
