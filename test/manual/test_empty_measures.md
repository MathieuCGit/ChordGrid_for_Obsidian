# Test Empty Measures with measures-per-line

Test 1: 4 measures per line, 2 with content, 2 empty
```chordgrid
measures-per-line:4
4/4 | CmM7 | Am | | ||
```

Test 2: 4 measures per line, only first has content
```chordgrid
measures-per-line:4
4/4 | G7 | | | ||
```

Test 3: Mix of empty and filled measures
```chordgrid
measures-per-line:4
4/4 | C | | Dm | ||
```

Test 4: Without measures-per-line (should skip empty measures as before)
```chordgrid
4/4 | C | | Am | ||
```
