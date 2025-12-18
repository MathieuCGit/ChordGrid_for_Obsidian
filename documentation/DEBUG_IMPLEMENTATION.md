# Système de Debug Logger - Implémentation

## Résumé

Système de logging visible directement dans l'interface Obsidian pour faciliter le débogage du plugin Chord Grid, en particulier pour les ligatures automatiques.

## Fichiers créés

### 1. `src/utils/DebugLogger.ts`
Classe singleton pour gérer les logs :
- `init(parentElement)` : Initialise le panneau de logs
- `log(message, data?)` : Message informatif
- `warn(message, data?)` : Avertissement
- `error(message, error?)` : Erreur
- `setEnabled(enabled)` : Active/désactive les logs
- `clear()` : Efface tous les logs

**Caractéristiques** :
- Affichage dans un `<details>` déroulant
- Maximum 50 logs par bloc
- Auto-scroll vers le dernier message
- Horodatage de chaque message
- Émojis pour identifier rapidement le type d'information
- Sérialisation JSON des objets complexes
- Console.log parallèle pour DevTools

### 2. `styles.css`
Styles CSS pour le panneau de logs :
- Utilise les variables CSS d'Obsidian (s'adapte aux thèmes)
- Design soigné avec transitions
- Zone de log scrollable avec hauteur max 400px
- Style monospace pour meilleure lisibilité

### 3. `DEBUG_LOGGER.md`
Documentation complète du système :
- Guide d'utilisation
- Types de messages loggés
- Comment ajouter de nouveaux logs
- Dépannage

### 4. `test/test_debug_logger.md`
Fichier de test avec exemples de grilles d'accords pour tester le logger

## Fichiers modifiés

### `main.ts`
- Import de `DebugLogger`
- Initialisation avec `DebugLogger.init(el)` au début du rendu
- Logs de toutes les étapes principales :
  - Parsing
  - Validation
  - Rendu SVG
  - Erreurs

### `src/renderer/SVGRenderer.ts`
- Import de `DebugLogger`
- Logs du layout (mesures par ligne, dimensions)
- Logs des sauts de ligne
- Logs du nombre de notes collectées
- Logs détaillés de la détection des ligatures :
  - Toutes les notes avec marqueurs (tieStart, tieEnd, tieToVoid, tieFromVoid)
  - Correspondances trouvées
  - Dessin des courbes
  - Statistiques finales

### `src/utils/TieManager.ts`
- Import de `DebugLogger`
- Logs lors de l'ajout d'une liaison en attente
- Logs lors de la résolution d'une liaison
- Affichage de l'état des liaisons en attente

## Émojis utilisés

Pour faciliter la lecture rapide des logs :

- 🎵 Parsing de grille
- ✅ Opération réussie
- ⚠️ Avertissement
- ❌ Erreur
- 📐 Layout/dimensions
- ↵ Saut de ligne
- 📊 Statistiques
- 🎼 Rendu de mesures
- 🔗 Ligatures (ties)
- 🔍 Recherche
- 📌 Ajout en attente

## Utilisation

1. Recharger le plugin dans Obsidian
2. Créer un bloc `chordgrid` dans une note
3. Cliquer sur "🐛 Debug Logs" pour voir les logs
4. Observer le comportement des ligatures en temps réel

## Exemple de log pour les ligatures

```
[14:23:45] 🔗 Starting tie detection and drawing
[14:23:45] Notes with tie markers: {"count":4,"details":[...]}
[14:23:45] 🔍 Primary pass: matching tieStart -> tieEnd
[14:23:45] Found tieStart at index 2: {"measure":0,"chord":0,"beat":1}
[14:23:45] ✅ Matched tieStart[2] -> tieEnd[5]
[14:23:45] Drawing tie curve: {"from":{"x":120,"y":80},"to":{"x":180,"y":80},"crossMeasure":false}
[14:23:45] 🔗 Tie detection completed: {"totalMatched":4,"totalNotes":20}
```

## Avantages

1. **Pas besoin des DevTools** : Logs visibles directement dans la note
2. **Contexte complet** : Tous les logs pour un bloc spécifique
3. **Données structurées** : Objets JSON pour une analyse détaillée
4. **Non-invasif** : Panneau déroulant qui ne gêne pas la lecture
5. **Adaptatif** : S'intègre au thème d'Obsidian

## Prochaines étapes

Maintenant que vous avez accès aux logs, vous pouvez :

1. Identifier pourquoi les ligatures automatiques ne fonctionnent pas
2. Vérifier si les marqueurs `tieStart`, `tieEnd`, etc. sont correctement définis
3. Observer le comportement de `TieManager`
4. Tracer le flux de données à travers le rendu

## Désactivation

Pour désactiver les logs (par exemple en production), modifier `main.ts` :

```typescript
async onload() {
  DebugLogger.setEnabled(false); // Désactiver les logs
  // ...
}
```
