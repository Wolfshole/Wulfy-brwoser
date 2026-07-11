export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

class AIManager {
  private readonly knowledgeBase: string[] = [
    'Wulfy Browser ist ein moderner Desktop-Browser mit Tabs, Verlauf, Favoriten, Downloads und Suchmaschinen.',
    'Der Browser kann zwischen Light Mode und Dark Mode wechseln.',
    'Die Startseite ist in den Einstellungen konfigurierbar.',
    'Die KI ist ein lokaler, in-App-Hilfsassistent für Browser-Funktionen.',
  ];

  private history: AIMessage[] = [];

  createConversation(): string {
    return `conversation-${Date.now()}`;
  }

  addKnowledge(entry: string): void {
    const normalized = entry.trim();
    if (normalized.length > 0) {
      this.knowledgeBase.push(normalized);
    }
  }

  getConversationHistory(): AIMessage[] {
    return [...this.history];
  }

  clearConversationHistory(): boolean {
    this.history = [];
    return true;
  }

  processMessage(message: string): string {
    const trimmed = message.trim();
    if (!trimmed) {
      return 'Bitte gib eine Frage oder einen Wunsch ein.';
    }

    const reply = this.generateResponse(trimmed);

    this.history.push(
      { role: 'user', content: trimmed, timestamp: Date.now() },
      { role: 'assistant', content: reply, timestamp: Date.now() + 1 },
    );

    return reply;
  }

  private generateResponse(message: string): string {
    const lower = message.toLowerCase();

    if (lower.includes('hilfe') || lower.includes('help')) {
      return 'Ich bin dein lokaler Wulfy-KI-Assistent. Ich kann dir bei Tabs, Favoriten, Verlauf, Downloads und Einstellungen helfen.';
    }

    if (lower.includes('dark') || lower.includes('licht') || lower.includes('theme')) {
      return 'Du kannst im Einstellungsbereich zwischen Hell- und Dunkelmodus wechseln.';
    }

    if (lower.includes('favorit') || lower.includes('bookmark')) {
      return 'Mit dem Stern-Button kannst du die aktuelle Seite als Favorit speichern.';
    }

    if (lower.includes('history') || lower.includes('verlauf')) {
      return 'Der Verlauf ist im Verlaufspanel sichtbar und lässt sich durchsuchen.';
    }

    if (lower.includes('download') || lower.includes('downloads')) {
      return 'Downloads werden im Download-Panel erfasst und können dort verwaltet werden.';
    }

    if (lower.includes('tab') || lower.includes('neues tab')) {
      return 'Mit Strg/Cmd + T kannst du einen neuen Tab öffnen.';
    }

    if (lower.includes('browser') || lower.includes('wulfy')) {
      return 'Wulfy Browser ist eine moderne Desktop-Browseroberfläche mit Tabs, Suche, Verlauf, Favoriten und lokalen Einstellungen.';
    }

    if (lower.includes('start') || lower.includes('starten')) {
      return 'Du kannst den Browser mit npm run start starten. Danach öffnet sich die Electron-App.';
    }

    const details = this.knowledgeBase.join(' ');
    return `Ich habe deine Anfrage verstanden: "${message}". Der lokale Assistent arbeitet aktuell mit einer kompakten Wissensbasis. Wichtig dabei ist: ${details.substring(0, 160)}...`;
  }
}

export default new AIManager();
