/**
 * @file DebugLogger.ts
 * @description Logging system for debugging in Obsidian.
 * 
 * Since console.log() is not easily accessible in Obsidian,
 * this logger displays messages directly in the user interface.
 * Logs can be enabled/disabled and appear in a dedicated panel
 * above the SVG rendering.
 */

export class DebugLogger {
  private static enabled = true;
  private static logContainer: HTMLElement | null = null;
  private static logs: string[] = [];
  private static maxLogs = 50; // Limit to avoid too many logs

  /**
   * Enables or disables logging.
   */
  static setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Initializes the log container for a given code block.
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
   * Records a log message.
   */
  static log(message: string, data?: any) {
    if (!this.enabled) return;

    const timestamp = new Date().toLocaleTimeString();
    const logMessage = data 
      ? `[${timestamp}] ${message}: ${JSON.stringify(data, null, 2)}`
      : `[${timestamp}] ${message}`;
    
    this.logs.push(logMessage);
    
    // Limit the number of logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    // Console log for DevTools if open
    console.log(`[ChordGrid] ${message}`, data);
    
    this.render();
  }

  /**
   * Records an error message.
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
   * Records a warning message.
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
   * Updates the log display.
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
