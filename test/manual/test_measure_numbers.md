# Test Measure Numbers

## Test 1: Default behavior (measure-num only)
```chordgrid
measure-num
4/4 ||: Em[4 4 4 4] | D[2.] | D[2.] | Em[2.] |
Em[4 4 4 4] | G[4 4 4 4] | C[4 4 4 4] | G[4 4 4 4] |
G[4 4 4 4] | C[4 4 4 4] | G[4 4 4 4] | C[4 4 4 4] :||
```

## Test 2: Start at measure 5
```chordgrid
measure-num: 5
4/4 Em[4 4 4 4] | D[2.] | D[2.] | Em[2.] |
Em[4 4 4 4] | G[4 4 4 4] | C[4 4 4 4] | G[4 4 4 4]
```

## Test 3: With time signature changes
```chordgrid
measure-num
4/4 Em[4 4 4 4] | G[4 4 4 4] | 
2/4 G[4 -4] | C[4 4 4 4] | 
4/4 D[4 4 4 4] | Em[4 4 4 4]
```

## Test 4: Multiple lines
```chordgrid
measure-num
measures-per-line: 4
4/4 Em[4 4 4 4] | D[2.] | C[2.] | G[2.] |
Em[4 4 4 4] | D[2.] | C[2.] | G[2.] |
Em[4 4 4 4] | D[2.] | C[2.] | G[2.]
```
