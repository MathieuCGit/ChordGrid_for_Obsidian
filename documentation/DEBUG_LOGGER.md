# Système de Debug Logger

## Vue d'ensemble

Le `DebugLogger` est un système de logging intégré qui affiche les messages directement dans l'interface Obsidian, sans avoir besoin d'ouvrir les DevTools.

## Utilisation

### Activer/Désactiver les logs

Par défaut, les logs sont **activés**. Pour les désactiver :

```typescript
import { DebugLogger } from './src/utils/DebugLogger';

DebugLogger.setEnabled(false); // Désactiver
DebugLogger.setEnabled(true);  // Activer
```

### Affichage dans Obsidian

Les logs apparaissent dans un panneau déroulant **🐛 Debug Logs** au-dessus de chaque grille d'accords rendue.

- Cliquer sur "🐛 Debug Logs" pour ouvrir/fermer le panneau
- Les logs s'affichent avec horodatage
- Auto-scroll vers le dernier message
- Maximum 50 messages par bloc (pour éviter la surcharge)

### Types de messages

Le logger supporte trois niveaux de messages :

```typescript
// Message informatif
DebugLogger.log('Message simple');
DebugLogger.log('Avec données', { key: 'value' });

// Avertissement
DebugLogger.warn('Attention');
DebugLogger.warn('Détails', { problème: 'valeur' });

// Erreur
DebugLogger.error('Erreur grave');
DebugLogger.error('Exception', error);
```

## Logs actuels

Le système trace actuellement :

### Main.ts
- 🎵 Début du parsing
- ✅ Parsing complété (nombre de mesures, signature temporelle)
- ⚠️ Erreurs de validation rythmique
- 🎨 Début du rendu SVG
- ✅ Rendu complété
- ❌ Erreurs fatales

### SVGRenderer.ts
- 📐 Configuration du layout (mesures par ligne, dimensions)
- ↵ Sauts de ligne (explicites et automatiques)
- 📊 Résumé du layout (lignes, mesures)
- 🎼 Rendu des mesures
- 🎵 Positions des notes collectées
- 🔗 Détection et dessin des ligatures

### TieManager.ts
- 📌 Ajout d'une liaison en attente
- 🔍 Recherche de liaison en attente
- ✅ Résolution d'une liaison
- ⚠️ Liaison non trouvée

### Détection des ligatures
- Liste de toutes les notes avec marqueurs de liaison (tieStart, tieEnd, tieToVoid, tieFromVoid)
- Correspondances trouvées entre les notes
- Dessin des courbes de liaison
- Résumé final (notes matchées)

## Ajouter de nouveaux logs

Pour ajouter des logs dans d'autres fichiers :

1. Importer le logger :
```typescript
import { DebugLogger } from './path/to/DebugLogger';
```

2. Utiliser les méthodes :
```typescript
DebugLogger.log('Description', optionalData);
```

## Désactivation pour la production

Pour désactiver les logs en production, modifier `main.ts` :

```typescript
async onload() {
  // Désactiver en production
  if (process.env.NODE_ENV === 'production') {
    DebugLogger.setEnabled(false);
  }
  
  // ... reste du code
}
```

## Styles CSS

Les styles du logger sont définis dans `styles.css` :

- `.chord-grid-debug` : conteneur principal
- `.chord-grid-debug-content` : zone de texte des logs
- Utilise les variables CSS d'Obsidian pour s'adapter aux thèmes

## Limitations

- Maximum 50 logs par bloc (modifiable via `maxLogs`)
- Les logs sont réinitialisés pour chaque nouveau bloc
- Les objets complexes sont sérialisés en JSON (peut être verbeux)

## Dépannage

### Les logs n'apparaissent pas
- Vérifier que `DebugLogger.setEnabled(true)` est appelé
- Vérifier que `DebugLogger.init(el)` est appelé au début du rendu
- Regarder les DevTools pour les erreurs JavaScript

### Trop de logs
- Réduire `maxLogs` dans `DebugLogger.ts`
- Commenter certains appels `DebugLogger.log()`
- Utiliser des conditions pour logger seulement certains cas

### Format illisible
- Les objets complexes sont JSON.stringify avec 2 espaces d'indentation
- Modifier `DebugLogger.log()` pour personnaliser le format
