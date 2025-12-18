# Conventions de groupement rythmique

## Principe général

Le groupement des notes courtes (croches et plus courtes) doit refléter la **pulsation naturelle** de la métrique utilisée.

## Modes de groupement

Le plugin propose plusieurs modes de groupement pour s'adapter à différents besoins :

### Mode par défaut : `space-based` (contrôle utilisateur)

Par défaut, le plugin respecte **exactement les espaces** que vous mettez dans votre notation. Les ligatures (beams) sont créées selon vos groupements explicites.

```chordgrid
4/4 | C[88 88 88 88] |      ✅ 4 groupes séparés (espaces explicites)
4/4 | C[8888 8888] |        ✅ 2 groupes (collés)
4/4 | C[88888888] |         ✅ 1 seul groupe (tout collé)
```

### Mode `auto-beam` (groupement algorithmique)

Ajouter la directive `auto-beam` active le groupement automatique selon les conventions musicales :

```chordgrid
auto-beam
4/4 | C[88888888] |         → Groupé automatiquement en binaire (par 2)
6/8 | C[888888] |           → Groupé automatiquement en ternaire (par 3)
```

### Modes explicites : `binary` et `ternary`

Vous pouvez forcer un groupement spécifique :

```chordgrid
4/4 binary | C[88888888] |  → Force le groupement par 2 (binaire)
6/8 ternary | C[888888] |   → Force le groupement par 3 (ternaire)
```

## Conventions musicales (pour mode auto-beam)

## Temps binaire vs Temps composé

### Temps binaire (Simple Time)

**Signatures**: 2/4, 3/4, 4/4, 5/4, 7/4, 5/8, 7/8, etc.

**Pulsation de base**: La noire (♩)

**Groupement des croches**: Par **2** pour suivre la pulsation de la noire
```
88 = 2 croches = 1 noire
```

**Exemples corrects** :
```chordgrid
3/4 | C[88 88 88] |        ✅ 3 groupes de 2 = 3 noires
4/4 | C[88 88 88 88] |      ✅ 4 groupes de 2 = 4 noires
2/4 | C[88 88] |            ✅ 2 groupes de 2 = 2 noires
```

**Exemples incorrects** :
```chordgrid
3/4 | C[888 888] |          ❌ Groupement ternaire en métrique binaire
4/4 | C[88888888] |         ❌ Pas de structure rythmique claire
```

### Temps composé (Compound Time)

**Signatures**: 6/8, 9/8, 12/8, etc.

**Pulsation de base**: La noire pointée (♩.)

**Groupement des croches**: Par **3** pour suivre la pulsation de la noire pointée
```
888 = 3 croches = 1 noire pointée
```

**Exemples corrects** :
```chordgrid
6/8 | C[888 888] |          ✅ 2 groupes de 3 = 2 noires pointées
9/8 | C[888 888 888] |      ✅ 3 groupes de 3 = 3 noires pointées
12/8 | C[888 888 888 888] | ✅ 4 groupes de 3 = 4 noires pointées
```

**Exemples incorrects** :
```chordgrid
6/8 | C[88 88 88] |         ❌ Groupement binaire en métrique ternaire
9/8 | C[888888888] |        ❌ Pas de structure rythmique claire
```

## Métriques asymétriques

### 5/8

Deux interprétations possibles selon le contexte musical :

**Option 1 : 3+2** (plus courant)
```chordgrid
5/8 | C[888 88] |           ✅ Ternaire + binaire
```

**Option 2 : 2+3**
```chordgrid
5/8 | C[88 888] |           ✅ Binaire + ternaire
```

### 7/8

Plusieurs interprétations possibles :

**Option 1 : 2+2+3** (plus courant en musique balkanique)
```chordgrid
7/8 | C[88 88 888] |        ✅
```

**Option 2 : 3+2+2**
```chordgrid
7/8 | C[888 88 88] |        ✅
```

**Option 3 : 2+3+2**
```chordgrid
7/8 | C[88 888 88] |        ✅
```

### 11/8

Exemple : 3+3+2+3
```chordgrid
11/8 | C[888 888 88 888] |  ✅
```

## Doubles-croches et notes plus courtes

Le même principe s'applique aux subdivisions :

### Temps binaire
```chordgrid
3/4 | C[1616 1616 1616] |   ✅ Groupes de 4 = 3 noires
4/4 | C[1616 1616 1616 1616] | ✅ Groupes de 4 = 4 noires
```

### Temps composé
```chordgrid
6/8 | C[161616 161616] |    ✅ Groupes de 6 = 2 noires pointées
9/8 | C[161616 161616 161616] | ✅ Groupes de 6 = 3 noires pointées
```

## Ligatures cross-segment

Le plugin permet de lier des notes à travers les changements d'accord **si aucun espace n'est présent**.

### Correct avec espace (groupes séparés)
```chordgrid
3/4 | C[88] G[88 4] |       ✅ Espace = rupture de ligature
```

### Correct sans espace (ligature continue)
```chordgrid
3/4 | C[8]G[8 4 4] |        ✅ Pas d'espace = ligature continue
```

**Important** : Même en cross-segment, respecter le groupement binaire/ternaire :
```chordgrid
3/4 | C[8]G[8 88] |         ✅ Cross-segment binaire en 3/4
6/8 | C[88]G[8 888] |       ✅ Cross-segment ternaire en 6/8
```

## Tuplets

Les tuplets peuvent avoir leur propre groupement interne, indépendamment de la métrique :

```chordgrid
3/4 | C[{888}3 4 4] |       ✅ Triolet = 3 croches collées
6/8 | C[{44}2:3 4.] |       ✅ Duplet = 2 noires collées
```

## Silences

Les silences **ne cassent PAS les ligatures de niveau 1** (poutre primaire), mais **bloquent les ligatures secondaires** (niveau 2+) :

```chordgrid
4/4 | C[1616-1616] |        ✅ Poutre niveau 1 continue, niveau 2 bloqué
4/4 | C[88-88] |            ✅ Niveau 1 continu (dans le même groupe)
```

Les silences séparés par des espaces créent des ruptures complètes :

```chordgrid
3/4 | C[88 -88 4] |         ✅ Le silence coupe le groupe
6/8 | C[888 -888] |         ✅ Le silence coupe le groupe
```

## Exemples complets

### Valse en 3/4 (binaire)
```chordgrid
3/4 | C[4 4 4] | G[88 88 4] | F[88 88 88] | C[2 4] |
```

### Gigue en 6/8 (ternaire)
```chordgrid
6/8 | C[888 888] | G[4. 4.] | F[888 888] | C[2.] |
```

### Rythme asymétrique 7/8
```chordgrid
7/8 | C[88 88 888] | G[888 88 88] | F[4 4 888] |
```

## Validation rythmique

Le parser valide que la durée totale correspond à la métrique :

```chordgrid
3/4 | C[88 88 88] |         ✅ 6 croches = 3 noires = 3/4
3/4 | C[88 88] |            ❌ 4 croches = 2 noires ≠ 3/4
3/4 | C[888 888] |          ❌ Groupement incorrect (métrique binaire)
```

## Philosophie de conception

Le plugin privilégie la **flexibilité et le contrôle utilisateur** :

1. **Par défaut** : Vous contrôlez le groupement avec des espaces (`space-based`)
2. **Mode auto** : Disponible via `auto-beam` pour suivre les conventions automatiquement
3. **Modes explicites** : `binary` et `ternary` pour forcer un comportement spécifique
4. **Validation rythmique** : Vérifie toujours que la durée totale correspond à la métrique

Cette approche permet aux musiciens expérimentés d'avoir un contrôle précis, tout en offrant des assistants pour les débutants.

## Références

- **Elaine Gould** - *Behind Bars: The Definitive Guide to Music Notation*
- **Gardner Read** - *Music Notation: A Manual of Modern Practice*
- **MuseScore** - Documentation sur les ligatures automatiques
- **Finale** - Guide de notation

## Résumé rapide

| Métrique | Type | Groupement croches | Exemple |
|----------|------|-------------------|---------|
| 2/4, 3/4, 4/4 | Binaire | Par 2 | `88 88` |
| 5/4, 7/4 | Binaire | Par 2 | `88 88 88` |
| 6/8, 9/8, 12/8 | Ternaire | Par 3 | `888 888` |
| 5/8 | Mixte | 3+2 ou 2+3 | `888 88` ou `88 888` |
| 7/8 | Mixte | 2+2+3, 3+2+2, etc. | `88 88 888` |

**Règle d'or** : Le groupement doit refléter la pulsation naturelle de la métrique pour faciliter la lecture.
