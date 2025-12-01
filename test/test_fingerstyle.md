# Test Fingerstyle Notation System

## Test 1: English patterns (default)
```chordgrid
finger
4/4
C | 4 8 8 4 4 |
```

## Test 2: French patterns (finger:fr)
```chordgrid
finger:fr
4/4
C | 4 8 8 4 4 |
```

## Test 3: Explicit symbols (English)
```chordgrid
finger
4/4
C | 4t 8h 8tu 4h 4t |
```

## Test 4: Explicit symbols (French)
```chordgrid
finger:fr
4/4
C | 4p 8m 8pu 4m 4p |
```

## Test 5: Mixed explicit and pattern
```chordgrid
finger
4/4
C | 4t 8 8 4 4hu |
```

## Test 6: Different time signatures

### 3/4 pattern
```chordgrid
finger
3/4
C | 4 4 4 |
```

### 6/8 pattern
```chordgrid
finger
6/8
C | 8 8 8 8 8 8 |
```

## Test 7: With stems-down
```chordgrid
finger
stems-down
4/4
C | 4 8 8 4 4 |
```

## Test 8: Pick-strokes vs Fingerstyle (should be mutually exclusive)

### Pick strokes
```chordgrid
pick
4/4
C | 4 8 8 4 4 |
```

### Fingerstyle
```chordgrid
finger
4/4
C | 4 8 8 4 4 |
```

## Test 9: Fingerstyle with ties
```chordgrid
finger
4/4
C | 4 8_ 8 4 4 |
```

## Test 10: Fingerstyle with rests
```chordgrid
finger
4/4
C | 4 -8 8 4 -4 |
```

## Test 11: Complex rhythm with pattern
```chordgrid
finger
4/4
C | 16 16 16 16 8 8 4 |
```

## Test 12: Dotted notes with symbols
```chordgrid
finger
4/4
C | 4.t 8h 4tu 4h |
```

## Test 13: Alias testing

### "fingers" (plural)
```chordgrid
fingers
4/4
C | 4 8 8 4 4 |
```

### "fingers:fr" 
```chordgrid
fingers:fr
4/4
C | 4 8 8 4 4 |
```

## Test 14: Translation preservation
English pattern t/h should display as-is in English mode,
but translate to p/m in French mode.

### English mode with explicit 't'
```chordgrid
finger
4/4
C | 4t 8h 8tu 4h |
```

### French mode with explicit 'p'
```chordgrid
finger:fr
4/4
C | 4p 8m 8pu 4m |
```

## Test 15: mu symbol (only via explicit)
The 'mu' symbol is not in patterns but should work when explicit.

```chordgrid
finger
4/4
C | 4mu 8h 8t 4h |
```

```chordgrid
finger:fr
4/4
C | 4mu 8m 8p 4m |
```

