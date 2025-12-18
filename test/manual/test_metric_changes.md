# Test Time Signature Changes

This test verifies that time signature changes (2/4, 4/4, 3/4, etc.) are displayed:
1. At the first occurrence of a new time signature
2. At the start of each new line when the current metric differs from the global signature

## Test Case 1: User Example with 4/4 → 2/4 → 4/4

Expected behavior:
- Global 4/4 shown at top left
- 2/4 shown inline when it first appears (measure 9)
- 4/4 shown inline when returning to it (measure 10)
- At line breaks, if current metric differs from global, it should be shown

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

## Test Case 2: Multiple Changes on Same Line

Expected behavior:
- 4/4 → 3/4 → 2/4 should all be displayed inline

```chord-grid
4/4 | C[8888] | 3/4 D[888] | 2/4 G[88] | 4/4 C[8888]
```

## Test Case 3: Line Break with Different Metric

Expected behavior:
- Line 1: 4/4 global
- Line 2: Start with 2/4, should show 2/4 at line start
- Line 3: Still 2/4, should show 2/4 at line start

```chord-grid
4/4 | C[88 88 88 88] | D[88 88 88 88] | 
2/4 G[88 88] | Em[88 88] | Am[88 88] |
G[88 88] | C[88 88] | D[88 88]
```

## Test Case 4: Return to Global Metric at Line Break

Expected behavior:
- Line 1: 4/4 global
- Line 2: 3/4 shown inline
- Line 3: Start with 4/4 again, should NOT show 4/4 (matches global)

```chord-grid
4/4 | C[88 88 88 88] | D[88 88 88 88] | 
3/4 G[88 88 88] | Em[88 88 88] |
C[88 88 88 88] | D[88 88 88 88]
```

## Test Case 5: Complex Sequence

Expected behavior:
- Multiple changes across lines should all be tracked correctly

```chord-grid
4/4 | C[8888] | D[8888] | Em[8888] | G[8888] |
3/4 Am[888] | Dm[888] | 
2/4 G[88] | C[88] |
4/4 D[8888] | Em[8888]
```
