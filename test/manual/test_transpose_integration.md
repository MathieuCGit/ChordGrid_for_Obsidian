# Transpose Integration Tests

## Test 1: Basic transposition up

```chordgrid
transpose: +2
4/4
| C[4 4 4 4] | F[4 4 4 4] | G[4 4 4 4] | C[4 4 4 4] |
```

Expected: CD, FG, GA, CD

## Test 2: Transposition down

```chordgrid
transpose: -3
4/4
| G[4 4 4 4] | C[4 4 4 4] | D[4 4 4 4] | G[4 4 4 4] |
```

Expected: GE, CA, DB, GE

## Test 3: Force sharps

```chordgrid
transpose: +1, #
4/4
| C[4 4 4 4] | F[4 4 4 4] | G[4 4 4 4] | Am[4 4 4 4] |
```

Expected: CC#, FF#, GG#, AmA#m

## Test 4: Force flats

```chordgrid
transpose: +1, b
4/4
| C[4 4 4 4] | F[4 4 4 4] | G[4 4 4 4] | Am[4 4 4 4] |
```

Expected: CDb, FGb, GAb, AmBbm

## Test 5: Complex chords

```chordgrid
transpose: +5
4/4
| Cmaj7[4 4 4 4] | Dm7[4 4 4 4] | G7[4 4 4 4] | Cmaj7[4 4 4 4] |
```

Expected: Cmaj7Fmaj7, Dm7Gm7, G7C7, Cmaj7Fmaj7

## Test 6: Slash chords

```chordgrid
transpose: +2
4/4
| C/G[4 4 4 4] | F/A[4 4 4 4] | G/B[4 4 4 4] | C/E[4 4 4 4] |
```

Expected: C/GD/A, F/AG/B, G/BA/C#, C/ED/F#

## Test 7: Key analysis - Sharp key

```chordgrid
transpose: +1
4/4
| G[4 4 4 4] | C[4 4 4 4] | D[4 4 4 4] | Em[4 4 4 4] |
```

Expected: Should prefer sharps (G major  G# major context)

## Test 8: Key analysis - Flat key

```chordgrid
transpose: +1
4/4
| F[4 4 4 4] | Bb[4 4 4 4] | C[4 4 4 4] | Dm[4 4 4 4] |
```

Expected: Should prefer flats (F major  Gb major context)
