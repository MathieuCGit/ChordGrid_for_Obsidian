# Test Visual: Multi-line Volta Brackets

## Test Case 1: Volta spanning 2 lines (user's example)

```chordgrid
measures-per-line:2 picks-auto
4/4 ||:.1-3 C[88 81616_16-161616 88] | G[%] | 
| F[16161616_88 88 4] :||.4 Am[88_4 4.8] ||
```

**Expected:** Volta "1-3" should span from C to F (across 2 lines)

## Test Case 2: Volta spanning 3 lines

```chordgrid
measures-per-line:1 picks-auto
4/4 ||:.1-2 C[1] | 
| D[1] | 
| E[1] :||.3 F[1] ||
```

**Expected:** Volta "1-2" should span from C to E (across 3 lines)

## Test Case 3: Single-line volta (regression test)

```chordgrid
measures-per-line:4
4/4 ||:.1 C[1] | D[1] :||.2 E[1] | F[1] ||
```

**Expected:** Volta "1" on C-D, volta "2" on E (single line each)

## Test Case 4: Open volta spanning multiple lines

```chordgrid
measures-per-line:2
4/4 ||:.1-3 C[1] | D[1] | 
| E[1] | F[1] :|| 
.4 G[1] | A[1] ||
```

**Expected:** Volta "1-3" closed (C to F across 2 lines), volta "4" open (G-A)
