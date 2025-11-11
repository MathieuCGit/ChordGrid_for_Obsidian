# Contributing Guide

Thank you for your interest in improving Chord Grid!

## Table of Contents
1. Vision & Scope
2. Development Setup
3. Scripts Overview
4. Branching & Workflow
5. Commit Conventions
6. Code Style
7. Adding Features
8. Testing Requirements
9. Documentation Updates
10. Issue / PR Checklist
11. Roadmap Reference

---
## 1. Vision & Scope
Provide lightweight, accurate chord grid rendering with clear rhythmic notation, evolving toward an extensible musical analysis and interactive editing platform. Simplicity of syntax + correctness of musical rendering are primary goals.

## 2. Development Setup
Requirements:
- Node.js (LTS recommended)
- npm

```bash
npm install
npm run dev   # watch build
npm run build # type-check + production bundle
```

Optional scripts:
```bash
npm test                           # core parser tests
ts-node ./test/run_analyzer_tests.ts
ts-node ./test/run_integration_analyzer.ts
```

## 3. Scripts Overview
| Script | Purpose |
|--------|---------|
| dev | Run esbuild in watch mode |
| build | Type-check then bundle production assets |
| test | Run baseline parse tests |
| debug | Execute debug parsing script | 

## 4. Branching & Workflow
- `main` contains latest stable / near-stable code.
- Create feature branches: `feat/<short-desc>` or `fix/<issue-id>`.
- Keep changes atomic; separate refactors from new features when feasible.
- Rebase on `main` before opening PR to reduce merge noise.

## 5. Commit Conventions (Adapted Conventional Commits)
Format: `type(scope): message`

Types:
- `feat`: new user-facing capability
- `fix`: bug fix
- `docs`: documentation changes
- `refactor`: internal restructuring without behavior change
- `test`: adding or updating tests only
- `perf`: performance improvements
- `build`: build system / tooling changes
- `chore`: misc maintenance

Examples:
```
feat(analyzer): support cross-segment beam grouping
fix(renderer): dotted 16th beamlet direction
docs(readme): add troubleshooting table
```

## 6. Code Style
- TypeScript, strict-ish typing (explicit where unclear).
- Classes: PascalCase; methods / properties: camelCase.
- Constants: UPPER_SNAKE_CASE.
- Prefer small pure functions inside modules for reusable logic.
- Keep public API documented with JSDoc.

## 7. Adding Features
Checklist:
1. Define scope and data shape changes (e.g., new note value, beam group property).
2. Update relevant type definitions (`src/analyzer/analyzer-types.ts`, parser models, etc.).
3. Implement logic (parser → analyzer → renderer path, as applicable).
4. Add unit tests (parsing + analysis + rendering if visual change).
5. Update README / docs with examples.
6. Add CHANGELOG entry under `[Unreleased]`.

## 8. Testing Requirements
Minimum expectations for a new feature:
- Parsing test validating syntax acceptance / rejection.
- Analyzer test (if beam/tie/grouping semantics change).
- Rendering snapshot or structure test (for SVG changes) – planned expansion.
- Edge cases (rests, dotted, cross-measure ties if relevant).

## 9. Documentation Updates
- README: user-facing usage & examples.
- ARCHITECTURE.md: rationale + module responsibilities.
- CHANGELOG.md: summarize changes.
- Add bilingual update to `README.fr.md` if user-facing behavior changes.

## 10. Issue / PR Checklist
Before marking ready for review:
- [ ] All tests pass locally.
- [ ] Added or updated tests.
- [ ] Updated docs and CHANGELOG.
- [ ] No stray console logs (use `DebugLogger` where appropriate).
- [ ] Feature flag documented if introduced.
- [ ] Self-reviewed for dead code / commented blocks.

## 11. Roadmap Reference
High-level planned milestones (see README for details):
- v2.0: Analyzer core integration & removal of legacy beaming path.
- v2.1: Tuplets / grace notes.
- v2.2: Dynamics & articulation layer.
- v2.3: Export (PNG / MIDI) & styling hooks.
- v3.x: Interactive editing & richer musical semantics.

## Questions / Help
Open a GitHub Discussion or create an Issue tagged with `question`. Provide reproduction snippets in `chordgrid` blocks when relevant.

## License Alignment
Project is GPL-3.0. Contributions are accepted under the same license. By submitting a PR you agree to license your changes under GPL-3.0.

---
Thanks for helping build Chord Grid! 🎵
