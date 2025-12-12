# Test Migration Report - NEW Grouping System

**Date**: January 2025  
**Scope**: Complete refactor from auto-break default to space-based default  
**Status**: Analysis complete - awaiting implementation

---

## Overview

**Total existing tests**: 65 files (364 tests)  
**New specification tests**: 5 files (85 tests)  
**Tests requiring action**: ~15 files identified

---

## 🔴 Category A: DELETE (Obsolete - `noauto` directive tests)

These tests verify the OLD `noauto` directive which becomes the NEW default behavior.  
All functionality is now covered by `NEW_SPEC_default_space_based.spec.ts`.

### Files to DELETE:

1. **`noauto_directive_rendering.spec.ts`** (3 tests)
   - Tests `noauto` directive parsing and rendering
   - Tests "without noauto, auto-breaking should occur" (inverted in new spec)
   - **Obsolete**: Default is now space-based, no directive needed

2. **`noauto_render_debug.spec.ts`** (3 tests)
   - Tests `noauto` directive in first measure
   - Tests inline `3/4 noauto` inheritance
   - Tests `4/4 noauto` after TS
   - **Obsolete**: All scenarios now default behavior

3. **`noauto_user_case.spec.ts`** (1 test)
   - Original user-reported case that started this refactor
   - Tests `noauto` with mixed time signatures and chord-only measures
   - **Obsolete**: Exact scenario now covered by NEW_SPEC_inline_inheritance.spec.ts (line 201)

4. **`noauto_inline.spec.ts`** (2 tests)
   - Tests `3/4 noauto` inline directive
   - Tests `noauto` inheritance to inline time signatures
   - **Obsolete**: Inheritance now covered by NEW_SPEC_inline_inheritance.spec.ts

5. **`pick_count_noauto.spec.ts`** (4 tests)
   - Tests `noauto` combined with `pick count` directive
   - Tests "without noauto, auto beam breaking should occur"
   - **Obsolete**: Default is now space-based

6. **`noauto_mode.spec.ts`** (10 tests)
   - Comprehensive parsing tests for `noauto` keyword
   - Tests user-controlled grouping via spaces
   - Tests multiple time signatures with `noauto`
   - **Obsolete**: All covered by NEW_SPEC_default_space_based.spec.ts

**Total to DELETE: 6 files (23 tests)**

---

## 🟡 Category B: RENAME/UPDATE (Tests expecting auto-break by default)

These tests assume auto-breaking happens WITHOUT a directive.  
Need to add `auto-beam` directive or rewrite to expect space-based behavior.

### Files to UPDATE:

1. **`auto_34_regression.spec.ts`** (2 tests)
   - ❌ OLD: `test('3/4 in auto mode should group eighth notes by 2')`
   - ✅ NEW: Add `auto-beam` directive OR rename test to reflect space-based default
   - Comments mention "In 3/4 auto mode" → needs `auto-beam` prefix
   - Line 13: `const input = '3/4 | Am[888 888] |';` → expects auto-break (wrong)
   - **Action**: Add `auto-beam` directive to tests expecting algorithmic grouping

2. **`grouping_modes.spec.ts`** (if exists - not fully visible)
   - Core tests for grouping system
   - **Action**: Review and update all tests for new mode names and defaults

3. **Tests with "auto mode" comments** (various files)
   - `pick_strokes_render.spec.ts` line 75: "auto mode detects 16th notes"
   - Comments like "In auto mode (binary)" need clarification (now "auto-beam mode")
   - **Action**: Grep for "auto mode" comments and add `auto-beam` directive

**Total to UPDATE: ~3-5 files (exact count needs detailed review)**

---

## 🟢 Category C: KEEP (Already valid - using explicit modes)

These tests use explicit `binary` or `ternary` modes, which remain valid.

### Files to KEEP:

1. **`time_signature_changes.spec.ts`**
   - Line 123: Uses `6/8 ternary` (explicit mode - valid)
   - Line 137: Uses `4/4 binary` (explicit mode - valid)
   - **Status**: ✅ No changes needed (explicit modes still work)

2. **All `NEW_SPEC_*.spec.ts`** (5 files)
   - Newly created specification tests
   - **Status**: ✅ Keep as-is

3. **Most other tests** (~50 files)
   - Tests for parsing, rendering, tuplets, ties, etc.
   - Don't explicitly test grouping modes
   - **Status**: ✅ Likely no changes needed (verify with full test run)

---

## 📋 Detailed Action Plan

### Phase 1: DELETE obsolete tests

```powershell
# Delete noauto-specific test files
Remove-Item test/noauto_directive_rendering.spec.ts
Remove-Item test/noauto_render_debug.spec.ts
Remove-Item test/noauto_user_case.spec.ts
Remove-Item test/noauto_inline.spec.ts
Remove-Item test/pick_count_noauto.spec.ts
Remove-Item test/noauto_mode.spec.ts
```

**Expected impact**: Test count drops by ~23 tests

---

### Phase 2: UPDATE tests expecting auto-break default

#### File: `auto_34_regression.spec.ts`

**Old test** (line 13-48):
```typescript
test('3/4 in auto mode should group eighth notes by 2', () => {
  const input = `3/4 | Am[888 888] |`; // User writes space
  const result = parseChordGrid(input);
  // ...
  // In 3/4 auto mode with [888 888], should have 3 groups: [8,8] [8] [8] [8,8]
  expect(beamGroups.length).toBe(4); // Space + auto-break = 4 groups
});
```

**New test** (add `auto-beam` directive):
```typescript
test('auto-beam | 3/4 should group eighth notes by 2 (ignoring spaces)', () => {
  const input = `auto-beam\n3/4 | Am[888 888] |`;
  const result = parseChordGrid(input);
  // ...
  // In auto-beam mode, spaces are ignored, binary grouping applies
  expect(beamGroups.length).toBe(3); // Algorithm decides: 3 groups of 2
});
```

**Alternative**: Create NEW test for default space-based behavior:
```typescript
test('3/4 default: [888 888] creates 2 groups (space-based)', () => {
  const input = `3/4 | Am[888 888] |`;
  const result = parseChordGrid(input);
  expect(beamGroups.length).toBe(2); // Respects user space only
});
```

---

#### Other files needing `auto-beam` addition:

- **`pick_strokes_render.spec.ts`** (line 75)
  - Comment: "auto mode detects 16th notes"
  - Add `auto-beam` directive to test

- **`pick_count_noauto.spec.ts`** (line 52)
  - Test: "without noauto, auto beam breaking should occur"
  - DELETE this test (inverted logic) OR rename to "with auto-beam, breaking occurs"

---

### Phase 3: VERIFY unchanged tests

After implementation, run full test suite and check for failures in tests that shouldn't have changed (parsing, rendering, tuplets, ties, etc.). These failures indicate unintended side effects.

---

## 🔍 Grep Patterns for Final Cleanup

After code changes, search for remaining references:

```powershell
# Find remaining 'noauto' references
grep -r "noauto" test/*.spec.ts src/**/*.ts

# Find "auto mode" comments (should now say "auto-beam mode")
grep -r "auto mode" test/*.spec.ts

# Find tests expecting auto-break without directive
grep -r "auto-break" test/*.spec.ts

# Verify no 'auto' as groupingMode (should be 'auto-beam')
grep -r "groupingMode.*'auto'" test/*.spec.ts src/**/*.ts
```

---

## 📊 Expected Test Count After Migration

- **Before**: 364 tests (60 obsolete files)
- **After**:
  - Delete: -23 tests (noauto files)
  - Update: ~5 tests (add auto-beam or rewrite)
  - Add: +85 tests (NEW_SPEC files)
  - **Total**: ~426 tests (85 new, 341 migrated)

---

## ⚠️ Risk Assessment

### High Risk Areas:

1. **Tests with implicit auto-break expectations**
   - Many tests may assume default auto-break without explicitly stating it
   - **Mitigation**: Run full suite after implementation and fix failures

2. **Tests using `groupingMode` type checks**
   - Type changes will cause compile errors (good - forces review)
   - **Mitigation**: TypeScript compiler will catch all issues

3. **Tests combining multiple directives**
   - `pick count noauto`, `show percent noauto`, etc.
   - **Mitigation**: Search for multi-directive patterns

### Low Risk Areas:

1. **Parsing tests** (note values, chord parsing, etc.)
   - Don't test grouping modes
   - Should pass unchanged

2. **Rendering tests** (SVG output, positioning, etc.)
   - Visual output may change but test structure remains
   - Might need updated snapshots

---

## ✅ Validation Checklist

After implementation:

- [ ] All NEW_SPEC tests pass (85/85)
- [ ] No references to `noauto` remain in codebase
- [ ] All `'auto'` replaced with `'auto-beam'` or `'space-based'`
- [ ] `groupingMode` type accepts only 4 values
- [ ] Parser rejects old `noauto` directive with warning
- [ ] Default behavior = space-only (no auto-break)
- [ ] `auto-beam` directive enables algorithmic grouping
- [ ] `binary`/`ternary` force specific grouping types
- [ ] Full test suite passes (~426 tests)
- [ ] Manual test in Obsidian confirms new behavior

---

## 🎯 Next Steps

1. ✅ Complete this analysis (DONE)
2. ⏳ Implement TypeScript type changes
3. ⏳ Modify parser to recognize new modes
4. ⏳ Refactor analyzer logic (invert priority)
5. ⏳ Execute test deletion (6 files)
6. ⏳ Execute test updates (~5 files)
7. ⏳ Run full test suite and fix failures
8. ⏳ Build and manual validation

---

## 📝 Notes

- User is sole user → no backward compatibility needed
- Breaking change → v3.0.0
- Old grids in Obsidian will behave differently (space-based by default)
- User must add `auto-beam` to old grids if they want old behavior
- Migration guide in `NEW_GROUPING_SYSTEM_SPEC.md`

