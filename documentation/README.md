# Technical Documentation - Chord Grid Plugin

This folder contains all technical documentation for the Chord Grid for Obsidian project.

## 📚 Documentation Index

### Architecture & Design

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete plugin architecture (Parser → Analyzer → Renderer)
- **[ARCHITECTURE_[Fr].md](./ARCHITECTURE_[Fr].md)** - French version

### History & Releases

- **[CHANGELOG.md](./CHANGELOG.md)** - Complete changelog by version
- **[release_notes_v2.1.0.md](./release_notes_v2.1.0.md)** - Detailed v2.1.0 release notes

### Development Guides

- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contribution guidelines
- **[DEBUG_IMPLEMENTATION.md](./DEBUG_IMPLEMENTATION.md)** - Debug system implementation guide
- **[DEBUG_IMPLEMENTATION_[Fr].md](./DEBUG_IMPLEMENTATION_[Fr].md)** - French version
- **[DEBUG_LOGGER.md](./DEBUG_LOGGER.md)** - Logging system documentation
- **[DEBUG_LOGGER_[Fr].md](./DEBUG_LOGGER_[Fr].md)** - French version

### Musical Specifications

#### Tuplets

- **[TUPLET_RATIOS.md](./TUPLET_RATIOS.md)** - N:M ratio system for tuplets
- **[TUPLET_RATIOS_[Fr].md](./TUPLET_RATIOS_[Fr].md)** - French version
- **[MIXED_TUPLETS.md](./MIXED_TUPLETS.md)** - Mixed rhythmic values tuplets (baseLen algorithm)

#### Rhythmic Grouping

- **[GROUPING_CONVENTIONS.md](./GROUPING_CONVENTIONS.md)** - Grouping system (space-based, auto-beam, binary/ternary modes)

## 🔍 Quick Navigation

### I want to understand...

- **How the plugin works?** → `ARCHITECTURE.md`
- **How to contribute?** → `CONTRIBUTING.md`
- **How to debug?** → `DEBUG_IMPLEMENTATION.md` + `DEBUG_LOGGER.md`
- **Tuplets with explicit ratios** → `TUPLET_RATIOS.md`
- **Mixed tuplets (8+16)** → `MIXED_TUPLETS.md`
- **Grouping modes (space-based, auto-beam, explicit)** → `GROUPING_CONVENTIONS.md`

### I'm looking for...

- **A new feature** → `CHANGELOG.md` (Unreleased section)
- **A bug fix** → `CHANGELOG.md` (Fixed section)
- **Version details** → `release_notes_v2.1.0.md`

## 🌍 Languages

Most documents are available in **English** (primary version) and **French** (with `_[Fr]` suffix).

## 📝 Conventions

- **Technical documents**: Markdown with code examples
- **Diagrams**: Mermaid (embedded in .md files)
- **Musical examples**: Textual chordgrid notation
- **Code**: TypeScript with JSDoc

## 🔗 Useful Links

- [Main README](../README.md)
- [Unit tests](../test/)
- [Source code](../src/)

### Technical Comparisons & Proposals

- **[COLLISION_SYSTEM_PROPOSAL.md](./COLLISION_SYSTEM_PROPOSAL.md)** - Collision detection system proposal
- **[COMPARISON_MUSESCORE.md](./COMPARISON_MUSESCORE.md)** - ChordGrid vs MuseScore architecture comparison
- **[COUNTING_SYSTEM_ANALYSIS.md](./COUNTING_SYSTEM_ANALYSIS.md)** - Pedagogical counting system analysis

---

**Documentation reflects the current state of the plugin**  
**Test coverage**: 429 tests across 58 test suites
