# Test Finger Patterns with StrumPatternRenderer

## Test 1: 4/4 with eighth notes (pattern should apply)
```chordgrid
finger
4/4
C | 8 8 8 8 8 8 8 8 |
```

Expected pattern: t↑ h↑ t↑ h↑ t↑ h↑ t↑ h↑
(Following: td tu hd tu td tu hd tu)

## Test 2: 4/4 with sixteenth notes (pattern per beat)
```chordgrid
finger
4/4
C | 16 16 16 16 16 16 16 16 16 16 16 16 16 16 16 16 |
```

Expected pattern: t↑ h↑ t↑ h↑ (repeated 4 times, once per beat)
(Following: td tu hd tu on each beat)

## Test 3: 3/4 with eighth notes
```chordgrid
finger
3/4
C | 8 8 8 8 8 8 |
```

Expected pattern: t↑ h↑ h↑
(Following: td tu hd tu hd tu)

## Test 4: Explicit symbols override pattern (priority level 1)
```chordgrid
finger
4/4
C | 8t 8hu 8h 8tu 8t 8tu 8h 8tu |
```

Expected: t↓ h↑ h↓ t↑ t↓ t↑ h↓ t↑
(Explicit symbols take priority over pattern)

## Test 5: French mode (finger:fr)
```chordgrid
finger:fr
4/4
C | 8 8 8 8 8 8 8 8 |
```

Expected pattern: p↑ m↑ p↑ m↑ p↑ m↑ p↑ m↑
(Translated: td→pd, tu→pu, hd→md, tu→pu)

## Test 6: French mode with explicit symbols
```chordgrid
finger:fr
4/4
C | 8p 8mu 8m 8pu 8p 8pu 8m 8pu |
```

Expected: p↓ m↑ m↓ p↑ p↓ p↑ m↓ p↑
(French symbols: p=pd, pu=pu, m=md, mu=mu)

## Test 7: Mixed values (automatic subdivision detection)
```chordgrid
finger
4/4
C | 16 16 8 16 16 8 4 |
```

Should detect sixteenth as smallest → use sixteenth pattern
Expected: t↑ h↑ (based on position in sixteenth grid)

## Test 8: 6/8 compound meter
```chordgrid
finger
6/8
C | 8 8 8 8 8 8 |
```

Expected pattern: t↑ h↑ h↑
(Following: td tu hd tu hd tu)

## Test 9: Short symbols accepted (normalization)
```chordgrid
finger
4/4
C | 8t 8tu 8h 8tu 8t 8tu 8h 8tu |
```

Expected: Same as explicit long form
(t normalized to td, h to hd)

## Test 10: Automatic alternation fallback (no pattern for 5/4)
```chordgrid
finger
5/4
C | 4 4 4 4 4 |
```

Expected: Automatic alternation (down, up, down, up, down)
Since no pattern defined for 5/4, uses fallback

## Test 11: With rests (rests don't get symbols)
```chordgrid
finger
4/4
C | 8 -8 8 8 8 -8 8 8 |
```

Expected: Only real attacks get symbols (6 symbols total, rests skipped)

## Test 12: With ties (tied notes don't get symbols)
```chordgrid
finger
4/4
C | 8_ 8 8_ 8 8_ 8 8_ 8 |
```

Expected: Only attack notes get symbols (4 symbols: positions 1, 3, 5, 7)
