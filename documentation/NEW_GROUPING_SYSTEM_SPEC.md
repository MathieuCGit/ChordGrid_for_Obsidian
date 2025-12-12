# NEW GROUPING SYSTEM SPECIFICATION

## Version: 3.0.0 (Breaking Changes)
## Date: December 11, 2025
## Philosophy: "What you write is what you get" (Markdown spirit)

---

## 🎯 Core Principles

### 1. Default Behavior: Space-Based Grouping
**Sans directive, les espaces sont la LOI.**

- Espaces → coupures de barres
- Pas d'espace → pas de coupure
- Aucun auto-break algorithmique
- "Write it as you want to see it"

### 2. Opt-In Auto-Grouping: `auto-beam`
**Pour activer l'algorithme, demander explicitement.**

- `auto-beam` ou `auto-beams` (alias)
- Binary meters → groupes de 2 croches
- Ternary meters → groupes de 3 croches
- **Les espaces sont IGNORÉS**

### 3. Force Grouping: `binary` et `ternary`
**Pour forcer un style spécifique.**

- `binary` : groupes de 2 croches (même en 6/8)
- `ternary` : groupes de 3 croches (même en 4/4)
- **Les espaces sont IGNORÉS**

---

## 📋 Modes de Groupement

| Mode | Espaces? | Auto-break? | Usage |
|------|----------|-------------|-------|
| **Default** (none) | ✅ Respectés | ❌ Non | Débutants, contrôle manuel |
| **auto-beam** | ❌ Ignorés | ✅ Oui | Algorithme décide (binary/ternary) |
| **binary** | ❌ Ignorés | ✅ Oui | Force groupes de 2 |
| **ternary** | ❌ Ignorés | ✅ Oui | Force groupes de 3 |

---

## 🔄 Héritage des Modes

### Sans directive globale
```
4/4 | C[88 88 88 88] | 3/4 Am[888 888] |
     ↓                  ↓
  space-based       space-based
```

### Avec directive globale
```
auto-beam
4/4 | C[88 88 88 88] | 3/4 Am[888 888] |
     ↓                  ↓
  auto-beam          auto-beam (espaces ignorés!)
```

### Override inline
```
auto-beam
4/4 | C[88 88 88 88] | 3/4 binary Am[888 888] |
     ↓                  ↓
  auto-beam          binary (override)
```

---

## 📐 Détection Automatique (mode auto-beam)

### Simple Meters (denominator ≤ 4) → Binary
- `4/4`, `3/4`, `2/4`, `5/4` → groupes de 2 croches
- Exemple: `auto-beam | 3/4 [888888]` → `[88][88][88]`

### Compound Meters (denominator ≥ 8, num ∈ {3,6,9,12}) → Ternary
- `6/8`, `9/8`, `12/8` → groupes de 3 croches
- Exemple: `auto-beam | 6/8 [888888]` → `[888][888]`

### Irregular Meters → No Auto-Break
- `5/8`, `7/8`, `11/8` → 1 groupe continu
- Utilisateur DOIT utiliser espaces avec mode par défaut

---

## 🎼 Exemples Comparatifs

### Cas 1: 3/4 avec espaces

| Input | Mode | Output | Groupes |
|-------|------|--------|---------|
| `3/4 [888 888]` | default | `[888] [888]` | 2 groupes |
| `auto-beam\n3/4 [888 888]` | auto-beam | `[88][88][88]` | 3 groupes |
| `binary\n3/4 [888 888]` | binary | `[88][88][88]` | 3 groupes |
| `3/4 noauto [888 888]` | ~~OBSOLÈTE~~ | - | Utiliser default |

### Cas 2: 4/4 sans espaces

| Input | Mode | Output | Groupes |
|-------|------|--------|---------|
| `4/4 [88888888]` | default | `[88888888]` | 1 groupe |
| `auto-beam\n4/4 [88888888]` | auto-beam | `[88][88][88][88]` | 4 groupes |

### Cas 3: 6/8 compound

| Input | Mode | Output | Groupes |
|-------|------|--------|---------|
| `6/8 [888888]` | default | `[888888]` | 1 groupe |
| `auto-beam\n6/8 [888888]` | auto-beam | `[888][888]` | 2 groupes |
| `binary\n6/8 [888888]` | binary | `[88][88][88]` | 3 groupes |

---

## 🛠️ Migration depuis v2.x

### Directives Obsolètes

| v2.x | v3.0 | Action |
|------|------|--------|
| `noauto` | *default* | **SUPPRIMER** la directive |
| `auto` | `auto-beam` | **RENOMMER** |
| `binary` | `binary` | ✅ Inchangé |
| `ternary` | `ternary` | ✅ Inchangé |

### Cas d'Usage Typiques

#### Avant (v2.x)
```
noauto
3/4 | Am[888 888] |
```

#### Après (v3.0)
```
3/4 | Am[888 888] |
```
(Comportement par défaut)

#### Avant (v2.x)
```
4/4 | C[88888888] |
```
→ Donnait 4 groupes (auto-break non demandé mais actif)

#### Après (v3.0)
```
auto-beam
4/4 | C[88888888] |
```
→ Donne 4 groupes (opt-in explicite)

---

## ⚡ Features Avancées

### Tuplets
- Gardent leur intégrité dans tous les modes
- Espaces entre tuplets respectés (mode default)
- Espaces ignorés (mode auto-beam/binary/ternary)

### Ties `_`
- **Forcent toujours le beam**, quel que soit le mode
- Priorité sur espaces et auto-breaks

### Rests `r`
- **Cassent toujours le beam**, quel que soit le mode
- Hard break absolu

### Pick Strokes `v^`
- Indépendants du mode de groupement
- Fonctionnent dans tous les modes

---

## 🧪 Tests Créés

1. ✅ `NEW_SPEC_default_space_based.spec.ts` (29 tests)
2. ✅ `NEW_SPEC_auto_beam_mode.spec.ts` (18 tests)
3. ✅ `NEW_SPEC_explicit_modes.spec.ts` (15 tests)
4. ✅ `NEW_SPEC_inline_inheritance.spec.ts` (13 tests)
5. ✅ `NEW_SPEC_advanced_features.spec.ts` (19 tests)

**Total: ~94 tests de spécification**

---

## 🔧 Implémentation Requise

### 1. Types à Modifier
```typescript
// OLD
type GroupingMode = 'auto' | 'binary' | 'ternary' | 'noauto';

// NEW
type GroupingMode = 'space-based' | 'auto-beam' | 'binary' | 'ternary';
```

### 2. Parsing des Directives
- Parser `auto-beam` et `auto-beams`
- Supprimer `noauto` (devenir comportement par défaut)
- `auto` devient alias de `auto-beam`

### 3. MusicAnalyzer
- **Inverser priorité**: Espaces > Auto-break (mode default)
- Mode `auto-beam`: Auto-break > Espaces
- Modes `binary`/`ternary`: Forcer type, ignorer espaces

### 4. Tests à Migrer/Supprimer
- Tous les tests avec `noauto` → migrer vers default
- Tous les tests avec `auto` → migrer vers `auto-beam`
- Tests attendant auto-break par défaut → inverser expectations

---

## 📚 Documentation à Mettre à Jour

1. README.md
2. GROUPING_CONVENTIONS.md
3. Examples dans tous les fichiers .md
4. Comments dans le code source
5. Types JSDoc

---

## ✅ Checklist d'Implémentation

- [ ] Créer nouveau type `GroupingMode`
- [ ] Parser `auto-beam` et `auto-beams`
- [ ] Modifier `MusicAnalyzer.resolveGroupingMode()`
- [ ] Inverser priorité espaces/auto-break
- [ ] Mettre à jour héritage inline
- [ ] Migrer tous les anciens tests
- [ ] Supprimer tests obsolètes
- [ ] Lancer suite complète (tous verts)
- [ ] Mettre à jour documentation
- [ ] Compiler et tester manuellement
- [ ] Commit + Tag v3.0.0

---

## 🎓 Philosophie de Conception

> **"Un utilisateur qui découvre le script doit comprendre immédiatement."**
> 
> Esprit Markdown : Ce qui est écrit est lisible et prévisible.
> Pas de magie cachée par défaut.
> Algorithme activé uniquement si demandé explicitement.

---

**Status**: 📝 Spécification complète - Prêt pour implémentation
**Next Step**: Implémenter les changements dans le code source
