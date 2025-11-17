# Test Mixed-Duration Tuplet with baseLen

Testing the user's case with mixed note values

## Test Case 1: User's example - {816-16 1616 8 8}5:4

```chordgrid
4/4 | [{816-16 1616 8 8}5:4 4] |
```

Expected:
- baseLen = 16 (smallest value)
- cumulative units = 2+1+1+1+1+2+2 = 10 units of 16th notes = 5 eighth notes
- ratio 5:4 means 5 eighths in the time of 4 eighths
- actual duration = (5/8) * (4/5) = 4/8 = 2 quarter notes
- Total measure: 2 + 1 = 3 quarter notes... ❌ Should be 4!

Wait, let me recalculate...

## Recalculation

If the user wants the tuplet to fit in 4 eighth notes (2 quarter notes):
- Content = 5 eighths worth of notes
- Target = 4 eighths
- Ratio should be 5:4 ✓
- Remaining space = 4 - 2 = 2 quarter notes for the final quarter note

Actually the final note is just `4` = 1 quarter note, so total = 2 + 1 = 3 ❌

## Test Case 2: Adjust to fit 4/4

```chordgrid
4/4 | [{816-16 1616 8 8}5:4 4 4] |
```

Or maybe:

```chordgrid
4/4 | [{816-16 1616 8 8}5:2 4] |
```

If ratio is 5:2, then 5 eighths in time of 2 eighths = 1 quarter note
Total = 1 + 1 = 2 ❌ Still wrong

## Test Case 3: Correct understanding

```chordgrid
4/4 | [{816-16 1616 8 8}5:4] |
```

- Content: 5 eighths (in baseLen=16 units: 10 units)
- Ratio 5:4: means fit 5 eighths into space of 4 eighths
- Duration: (5/8) × (4/5) = 4/8 = 1/2 whole note = 2 quarter notes
- With remaining quarter note: 2 + 1 = 3... not 4

Hmm, I think there's still an issue. Let me check the calculation logic.
