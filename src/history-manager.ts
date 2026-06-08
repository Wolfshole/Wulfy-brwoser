import Store from 'electron-store';

export interface HistoryEntry {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  visitedAt: number;
  visitCount: number;
}

class HistoryManager {
  private store: Store;
  private MAX_HISTORY_ENTRIES = 5000;

  constructor() {
    this.store = new Store({
      name: 'history',
      defaults: {
        history: [],
      },
    });
  }

  /**
   * Besuch hinzufügen oder aktualisieren
   */
  addVisit(title: string, url: string, favicon?: string): HistoryEntry {
    let history = this.store.get('history', []) as HistoryEntry[];

    // Prüfen, ob URL bereits in History vorhanden
    const existingIndex = history.findIndex(h => h.url === url);

    if (existingIndex !== -1) {
      // Aktualisieren
      history[existingIndex].visitedAt = Date.now();
      history[existingIndex].visitCount++;
      history[existingIndex].title = title;
      if (favicon) history[existingIndex].favicon = favicon;

      // An den Anfang verschieben
      const entry = history.splice(existingIndex, 1)[0];
      history.unshift(entry);
    } else {
      // Neue Entry
      const entry: HistoryEntry = {
        id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title,
        url,
        favicon,
        visitedAt: Date.now(),
        visitCount: 1,
      };

      history.unshift(entry);
    }

    // Limit auf MAX_HISTORY_ENTRIES
    if (history.length > this.MAX_HISTORY_ENTRIES) {
      history = history.slice(0, this.MAX_HISTORY_ENTRIES);
    }

    this.store.set('history', history);
    return history[0];
  }

  /**
   * History abrufen (mit optionalen Filtern)
   */
  getHistory(limit: number = 100, search?: string): HistoryEntry[] {
    let history = this.store.get('history', []) as HistoryEntry[];

    if (search) {
      const searchLower = search.toLowerCase();
      history = history.filter(
        h => h.title.toLowerCase().includes(searchLower) ||
             h.url.toLowerCase().includes(searchLower)
      );
    }

    return history.slice(0, limit);
  }

  /**
   * Alle History abrufen
   */
  getAllHistory(): HistoryEntry[] {
    return this.store.get('history', []) as HistoryEntry[];
  }

  /**
   * History-Entry löschen
   */
  deleteEntry(entryId: string): boolean {
    let history = this.store.get('history', []) as HistoryEntry[];
    history = history.filter(h => h.id !== entryId);
    this.store.set('history', history);
    return true;
  }

  /**
   * URL aus History löschen
   */
  deleteUrl(url: string): boolean {
    let history = this.store.get('history', []) as HistoryEntry[];
    history = history.filter(h => h.url !== url);
    this.store.set('history', history);
    return true;
  }

  /**
   * Alle History löschen
   */
  clearHistory(): void {
    this.store.set('history', []);
  }

  /**
   * History für einen Zeitraum löschen (in Millisekunden)
   */
  clearHistorySince(since: number): void {
    let history = this.store.get('history', []) as HistoryEntry[];
    history = history.filter(h => h.visitedAt < since);
    this.store.set('history', history);
  }

  /**
   * Häufigste Seiten abrufen (Top URLs)
   */
  getTopVisited(limit: number = 10): HistoryEntry[] {
    const history = this.store.get('history', []) as HistoryEntry[];
    return history
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, limit);
  }

  /**
   * Heutige History abrufen
   */
  getTodayHistory(): HistoryEntry[] {
    const now = Date.now();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const history = this.store.get('history', []) as HistoryEntry[];
    return history.filter(h => h.visitedAt >= today.getTime());
  }

  /**
   * History exportieren
   */
  exportHistory(): HistoryEntry[] {
    return this.store.get('history', []) as HistoryEntry[];
  }

  /**
   * History importieren
   */
  importHistory(entries: HistoryEntry[]): void {
    this.store.set('history', entries.slice(0, this.MAX_HISTORY_ENTRIES));
  }
}

export default new HistoryManager();
