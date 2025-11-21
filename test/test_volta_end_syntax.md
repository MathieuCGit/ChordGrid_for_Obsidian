# Test Volta End Syntax

Test the new `|.` syntax to explicitly mark the end of a volta.

```chordgrid
4/4 ||: C[4 88_4 4] | % |.1-3 G[%] | % :||.4 G[4 4 4 4] |. Am[16168 81616 4 88] ||
```

Expected behavior:
- Volta 1-3: covers measures 2 and 3 (the two G measures before :||)
- Volta 4: covers measures 4 and 5 (G[4 4 4 4] and Am[...])
- The `|.` after Am explicitly ends volta 4
