# Test Tuplet Beam Spacing

Test for spacing within tuplets affecting beam levels

## Test 1: Sextuplet with space (should have level-1 beam across, level-2 beams within groups)

Input: `{161616 161616}6`

Expected:
- 6 notes total (sextuplet)
- Notes 0-2: level-2 beam (triple doubles-croches)
- Notes 3-5: level-2 beam (triple doubles-croches)  
- Notes 0-5: level-1 beam across all (croches)

Current bug: All 6 notes have level-2 beam connecting them

## Test 2: Triplet with space

Input: `{88 8}3`

Expected:
- 3 notes total (triplet)
- Notes 0-1: no higher-level beam (just stems)
- Notes 0-2: level-1 beam across all

```
4/4 | C[{161616 161616}6] |
```

```
4/4 | C[{88 8}3] |
```
