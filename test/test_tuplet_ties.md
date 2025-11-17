# Tests des liaisons (ties) dans les tuplets

## Problème identifié

Actuellement, le parsing des tuplets **ne gère pas les underscores (_)** à l'intérieur des accolades `{}`.

### Cas de test à implémenter

#### 1. Liaison simple dans un triplet
```chordgrid
4/4 | C[{8_8_8}3 4] |
```
**Attendu** : Les 3 croches du triplet doivent être liées entre elles.

#### 2. Liaison partielle dans un triplet
```chordgrid
4/4 | C[{8_8 8}3 4] |
```
**Attendu** : Les 2 premières croches du triplet sont liées, la 3ème est séparée.

#### 3. Liaison commençant dans un tuplet et continuant après
```chordgrid
4/4 | C[{8 8 8_}3 8] |
```
**Attendu** : La dernière note du triplet est liée à la croche suivante (hors tuplet).

#### 4. Liaison commençant avant un tuplet
```chordgrid
4/4 | C[8_{8 8 8}3 8] |
```
**Attendu** : La croche avant le triplet est liée à la première note du triplet.

#### 5. Liaison traversant un tuplet complet
```chordgrid
4/4 | C[8_{8_8_8_}3 8] |
```
**Attendu** : Toutes les notes sont liées entre elles (avant, pendant et après le tuplet).

#### 6. Tuplet avec silences et liaisons
```chordgrid
4/4 | C[{8_8 -8}3 4] |
```
**Attendu** : Les 2 premières notes du triplet sont liées, puis un silence.

#### 7. Liaison cross-measure avec tuplet
```chordgrid
4/4 | C[4 4 {8_8_8_}3] | [_8 4 4] |
```
**Attendu** : La dernière note du triplet est liée à la première note de la mesure suivante.

## État actuel du code

### Dans `ChordGridParser.ts` (lignes 540-615)

Le parsing des tuplets :
```typescript
while (k < group.length) {
  // Parse chaque note du sous-groupe
  let note: NoteElement;
  if (group[k] === '-') {
    note = this.parseNote(group, k + 1);
    note.isRest = true;
    k += (note.length ?? 0) + 1;
  } else {
    note = this.parseNote(group, k);
    k += (note.length ?? 0);
  }
  // Ajout propriété tuplet
  note.tuplet = { ... };
  currentBeat.push(note);
  tupletNoteIndex++;
}
```

**Problème** : Les underscores `_` ne sont pas traités dans cette boucle. Ils sont seulement gérés à la ligne 616, **après** le bloc de parsing des tuplets.

### Solution proposée

Il faut ajouter la gestion des `_` **à l'intérieur** de la boucle de parsing des tuplets :

```typescript
while (k < group.length) {
  // NOUVEAU : Gestion des underscores
  if (group[k] === '_') {
    if (k === group.length - 1) {
      // Underscore à la fin d'un sous-groupe
      // Marque la liaison pour la dernière note ajoutée
      if (currentBeat.length > 0) {
        this.markTieStart(currentBeat);
      }
    } else if (k === 0) {
      // Underscore au début d'un sous-groupe
      // La note précédente (si elle existe) doit être marquée avec tieEnd
      if (currentBeat.length > 0) {
        const lastNote = currentBeat[currentBeat.length - 1];
        if (lastNote.tieStart) {
          // La liaison était déjà marquée, ajouter tieEnd à la prochaine note
          pendingTieEnd = true;
        }
      }
    } else {
      // Underscore au milieu : marquer la note précédente
      this.markTieStart(currentBeat);
    }
    k++;
    continue;
  }
  
  // Parse note ou silence
  let note: NoteElement;
  if (group[k] === '-') {
    note = this.parseNote(group, k + 1);
    note.isRest = true;
    k += (note.length ?? 0) + 1;
  } else {
    note = this.parseNote(group, k);
    k += (note.length ?? 0);
  }
  
  // Si un underscore précédait cette note
  if (pendingTieEnd) {
    note.tieEnd = true;
    pendingTieEnd = false;
  }
  
  // Ajout propriété tuplet
  note.tuplet = { ... };
  currentBeat.push(note);
  tupletNoteIndex++;
}
```

## Cas particuliers à gérer

1. **Underscore en fin de sous-groupe** : `{88_ 8}3`
   - Doit lier les 2 premières notes malgré l'espace

2. **Underscore au début de sous-groupe** : `{88 _8}3`
   - Doit lier la note avant l'espace à celle après

3. **Liaison sortant du tuplet** : `{88_}3`
   - Doit préparer la liaison avec la note suivante (hors tuplet)

4. **Liaison entrant dans le tuplet** : `8_{88}3`
   - L'underscore avant `{` doit être traité avant d'entrer dans le tuplet

## Tests à ajouter

Créer un fichier `test/tuplet_ties.spec.ts` avec :
- Test de parsing : vérifier les flags `tieStart`, `tieEnd` correctement placés
- Test de validation rythmique : les liaisons ne changent pas la durée
- Test de rendu : visuel pour vérifier l'apparence des courbes de liaison
