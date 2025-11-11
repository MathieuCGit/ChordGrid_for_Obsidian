/**
 * @file DebugLogger.ts
 * @description Système de logging pour le débogage dans Obsidian.
 * 
 * Comme les console.log() ne sont pas facilement accessibles dans Obsidian,
 * ce logger affiche les messages directement dans l'interface utilisateur.
 * Les logs peuvent être activés/désactivés et s'affichent dans un panneau
 * dédié au-dessus du rendu SVG.
 */

export class DebugLogger {
  private static enabled = true;
  private static logContainer: HTMLElement | null = null;
  private static logs: string[] = [];
  private static maxLogs = 50; // Limite pour éviter trop de logs

  /**
   * Active ou désactive le logging.
   */
  static setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Initialise le conteneur de logs pour un bloc de code donné.
   */
  static init(parentElement: HTMLElement): HTMLElement {
    this.logs = [];
    this.logContainer = parentElement.createEl('details', { cls: 'chord-grid-debug' });
    
    const summary = this.logContainer.createEl('summary');
    summary.setText('🐛 Debug Logs');
    
    const logContent = this.logContainer.createEl('pre', { 
      cls: 'chord-grid-debug-content'
    });
    logContent.style.cssText = `
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 10px;
      margin: 10px 0;
      border-radius: 4px;
      font-size: 12px;
      max-height: 300px;
      overflow-y: auto;
      font-family: 'Consolas', 'Monaco', monospace;
    `;
    
    return this.logContainer;
  }

  /**
   * Enregistre un message de log.
   */
  static log(message: string, data?: any) {
    if (!this.enabled) return;

    const timestamp = new Date().toLocaleTimeString();
    const logMessage = data 
      ? `[${timestamp}] ${message}: ${JSON.stringify(data, null, 2)}`
      : `[${timestamp}] ${message}`;
    
    this.logs.push(logMessage);
    
    // Limite le nombre de logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    // Console log pour les DevTools si ouvert
    console.log(`[ChordGrid] ${message}`, data);
    
    this.render();
  }

  /**
   * Enregistre un message d'erreur.
   */
  static error(message: string, error?: any) {
    if (!this.enabled) return;

    const timestamp = new Date().toLocaleTimeString();
    const errorMessage = error 
      ? `[${timestamp}] ❌ ERROR: ${message}: ${error.message || JSON.stringify(error)}`
      : `[${timestamp}] ❌ ERROR: ${message}`;
    
    this.logs.push(errorMessage);
    
    console.error(`[ChordGrid] ${message}`, error);
    
    this.render();
  }

  /**
   * Enregistre un message d'avertissement.
   */
  static warn(message: string, data?: any) {
    if (!this.enabled) return;

    const timestamp = new Date().toLocaleTimeString();
    const warnMessage = data 
      ? `[${timestamp}] ⚠️ WARN: ${message}: ${JSON.stringify(data, null, 2)}`
      : `[${timestamp}] ⚠️ WARN: ${message}`;
    
    this.logs.push(warnMessage);
    
    console.warn(`[ChordGrid] ${message}`, data);
    
    this.render();
  }

  /**
   * Met à jour l'affichage des logs.
   */
  private static render() {
    if (!this.logContainer) return;

    const logContent = this.logContainer.querySelector('.chord-grid-debug-content');
    if (logContent) {
      logContent.textContent = this.logs.join('\n');
      // Auto-scroll vers le bas
      logContent.scrollTop = logContent.scrollHeight;
    }
  }

  /**
   * Efface tous les logs.
   */
  static clear() {
    this.logs = [];
    this.render();
  }
}
