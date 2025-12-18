# Test: Multi-line Volta Brackets

## Test Case 1: Volta spanning 2 lines (closed)
**Expected**: Volta bracket with left hook on line 1, extends to line 2 with right hook

```chordgrid
4/4 ||: C[4 4 4 4] | G[4 4 4 4] | Am[4 4 4 4] | F[4 4 4 4] |
.1,2,3 C[4 4 4 4] | G[4 4 4 4] | Am[4 4 4 4] | F[4 4 4 4]. :||
.4 C[4 4 4 4]. | G[4 4 4 4] | Am[4 4 4 4] | F[4 4 4 4] ||
```

**Visual**: 
- Line 1: `┌─1,2,3──────────────────────────────`
- Line 2: `────────────────────────────────────┐`
- Line 3: `┌─4─────┐` (normal closed volta)

## Test Case 2: Volta spanning 3 lines (closed)
**Expected**: First hook on line 1, continuation on line 2, final hook on line 3

```chordgrid
4/4 ||: C[4 4 4 4] | G[4 4 4 4] | Am[4 4 4 4] | F[4 4 4 4] |
.1 C[4 4 4 4] | G[4 4 4 4] | Am[4 4 4 4] | F[4 4 4 4] |
C[4 4 4 4] | G[4 4 4 4] | Am[4 4 4 4] | F[4 4 4 4]. :||
.2 C[4 4 4 4]. | G[4 4 4 4] | Am[4 4 4 4] | F[4 4 4 4] ||
```

**Visual**:
- Line 1: `┌─1─────────────────────────────────`
- Line 2: `────────────────────────────────────`
- Line 3: `────────────────────────────────────┐`
- Line 4: `┌─2─────┐`

## Test Case 3: Volta spanning 2 lines (open - continue)
**Expected**: Left hook on line 1, no right hook on line 2

```chordgrid
4/4 ||: C[4 4 4 4] | G[4 4 4 4] | Am[4 4 4 4] | F[4 4 4 4] |
.1,2,3 C[4 4 4 4] | G[4 4 4 4] | Am[4 4 4 4] | F[4 4 4 4]. :||
.4 C[4 4 4 4] | G[4 4 4 4] | Am[4 4 4 4] | F[4 4 4 4] ||
```

**Visual**:
- Line 1: `┌─1,2,3──────────────────────────────`
- Line 2: `─────────────────────────────────────` (NO right hook)
- Line 3: `┌─4──────` (open volta, continues)

## Test Case 4: Single-line volta (regression test)
**Expected**: Normal volta bracket with both hooks (if closed)

```chordgrid
4/4 ||: C[4 4 4 4] .1,2 | G[4 4 4 4]. :|| .3 C[4 4 4 4]. | F[4 4 4 4] ||
```

**Visual**:
- `┌─1,2──────────┐` `:||` `┌─3───────` (open)

## Test Case 5: Multiple voltas on same grid with multi-line
**Expected**: Each volta rendered independently

```chordgrid
4/4 ||: C[4 4 4 4] | G[4 4 4 4] | Am[4 4 4 4] | F[4 4 4 4] |
.1,2 C[4 4 4 4] | G[4 4 4 4] | Am[4 4 4 4] | F[4 4 4 4]. :||
.3 C[4 4 4 4]. | G[4 4 4 4] ||: Am[4 4 4 4] | F[4 4 4 4] |
.1 C[4 4 4 4] | G[4 4 4 4]. :|| .2 Am[4 4 4 4]. | F[4 4 4 4] ||
```

**Visual**:
- Line 1-2: First volta (1,2) spanning 2 lines
- Line 3: Volta 3 (open) + start of second repeat
- Line 3-4: Second volta (1) closed, then volta (2) open

## Technical Specifications

### Hook Rendering Rules
1. **Left hook**: Only on the FIRST line of a multi-line volta
2. **Right hook**: Only on the LAST line AND only if `isClosed === true`
3. **Horizontal line**: Drawn on EVERY line the volta spans
4. **Text label**: Only on the FIRST line

### Collision Detection
- Each segment should be registered in PlaceAndSizeManager
- First segment includes text height in bbox
- Continuation segments have smaller bbox (no text)

### Edge Cases
- Volta starting at beginning of line
- Volta ending at end of line
- Volta with forced line breaks (`\n`)
- Volta with automatic line breaks (measures-per-line)
