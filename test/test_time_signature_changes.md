# Test: Time Signature Changes

This document demonstrates the new inline time signature change feature.

## Basic Example

```chordgrid
4/4 | Am[4 4 4 4] | 2/4 C[2] | 3/4 D[4 4 4] |
```

Expected result:
- Measure 1: 4/4 with four quarter notes
- Measure 2: Changes to 2/4 with one half note
- Measure 3: Changes to 3/4 with three quarter notes

## User Reported Case

Original problematic input (now fixed):

```chordgrid
4/4 | Em | Em | C / G | D / Em | 2/4 Em[2] |
```

Expected result:
- Measures 1-4: chord-only in 4/4
- Measure 5: Changes to 2/4 with correct validation

## Complex Example

```chordgrid
4/4 ||: Am[4 4 4 4] | C[4 4 4 4] | 3/4 G[4 4 4] | 2/4 D[2] :||
```

Expected result:
- Repeat start/end markers
- Time signature changes within the repeat
- Proper validation for each measure

## With Repeat Notation

```chordgrid
4/4 | Am[4 4 4 4] | 2/4 C[2] | % |
```

Expected result:
- Measure 3 repeats measure 2 (including the 2/4 time signature)
- Validation passes for the repeated measure

## Compound Time Changes

```chordgrid
4/4 | Am[4 4 4 4] | 6/8 C[8 8 8 8 8 8] | 9/8 D[8 8 8 8 8 8 8 8 8] | 4/4 E[4 4 4 4] |
```

Expected result:
- Changes from simple to compound time
- Changes between different compound times
- Changes back to simple time

## With Grouping Mode

```chordgrid
4/4 | Am[4 4 4 4] | 6/8 ternary C[8 8 8 8 8 8] | 4/4 binary D[4 4 4 4] |
```

Expected result:
- Time signature changes include grouping mode specification
- Binary/ternary grouping applies correctly

## Error Cases

### Wrong Duration After Time Change

```chordgrid
4/4 | Am[4 4 4 4] | 3/4 C[4 4] |
```

Expected result: Validation error on measure 2 (expected 3 quarter-notes, found 2)

### Chord-Only with Time Changes

```chordgrid
4/4 | Am | 2/4 C | 3/4 D |
```

Expected result: No errors (chord-only measures skip rhythm validation)

## Technical Notes

### Implementation

- Time signature changes are detected inline: `N/M ` before measure content
- Each measure can have its own `timeSignature` property
- Validation uses the effective time signature (measure-specific or global)
- Cloned measures (% notation) inherit the time signature from the original
- Error messages now include the time signature in the format `(N/M)`

### Syntax

```
[global-signature] | [measure] | [N/M measure] | [M/P measure] |
```

Where:
- `global-signature`: Initial time signature (e.g., `4/4`)
- `measure`: Content using current time signature
- `N/M`: Inline time signature change (e.g., `2/4`, `3/4`, `6/8`)
- Optional grouping mode: `N/M binary`, `N/M ternary`, `N/M noauto`

### Compatibility

- ✅ Works with repeat notation (`%`)
- ✅ Works with volta brackets
- ✅ Works with repeat markers (`||:`, `:||`)
- ✅ Works with chord-only mode
- ✅ Works with complex rhythms and tuplets
- ✅ Backward compatible (grids without changes work as before)
