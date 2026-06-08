import Store from 'electron-store';

// ============================================
// KI-ENGINE - EIGENE KÜNSTLICHE INTELLIGENZ
// ============================================

export interface ConversationMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: number;
}

export interface ConversationThread {
  id: string;
  title: string;
  messages: ConversationMessage[];
  created: number;
  lastUpdate: number;
}

export interface AIConfig {
  provider: 'local' | 'openai' | 'google' | 'anthropic' | 'custom';
  apiKey?: string;
  modelName: string;
  endpoint?: string;
  temperature: number; // 0-1: Kreativität
  maxTokens: number;
}

export interface KnowledgeBase {
  topics: Map<string, string[]>;
  responses: Map<string, string[]>;
  patterns: Map<string, string>;
}

class AIManager {
  private store: Store;
  private conversations: Map<string, ConversationThread> = new Map();
  private currentConversationId: string = '';
  private knowledgeBase: KnowledgeBase = {
    topics: new Map(),
    responses: new Map(),
    patterns: new Map(),
  };
  private aiConfig: AIConfig = {
    provider: 'local',
    modelName: 'wulfy-ai-v1',
    temperature: 0.7,
    maxTokens: 2048,
  };

  constructor() {
    this.store = new Store({
      name: 'ai-data',
      defaults: {
        conversations: [],
        knowledgeBase: {},
        aiConfig: this.aiConfig,
      },
    });

    this.loadFromStorage();
    this.initializeKnowledgeBase();
  }

  // ============================================
  // KONVERSATIONS-MANAGEMENT
  // ============================================

  /**
   * Neue Konversation erstellen
   */
  createConversation(title: string = 'Neue Konversation'): string {
    const id = `conv-${Date.now()}`;
    const conversation: ConversationThread = {
      id,
      title,
      messages: [],
      created: Date.now(),
      lastUpdate: Date.now(),
    };

    this.conversations.set(id, conversation);
    this.currentConversationId = id;
    this.saveToStorage();

    console.log(`✅ Konversation erstellt: ${id}`);
    return id;
  }

  /**
   * Alle Konversationen abrufen
   */
  getConversations(): ConversationThread[] {
    return Array.from(this.conversations.values()).sort(
      (a, b) => b.lastUpdate - a.lastUpdate
    );
  }

  /**
   * Spezifische Konversation abrufen
   */
  getConversation(id: string): ConversationThread | undefined {
    return this.conversations.get(id);
  }

  /**
   * Konversation löschen
   */
  deleteConversation(id: string): void {
    this.conversations.delete(id);
    if (this.currentConversationId === id) {
      this.currentConversationId = '';
    }
    this.saveToStorage();
  }

  /**
   * Konversationstitel umbenennen
   */
  renameConversation(id: string, newTitle: string): void {
    const conv = this.conversations.get(id);
    if (conv) {
      conv.title = newTitle;
      this.saveToStorage();
    }
  }

  // ============================================
  // NACHRICHTENVERARBEITUNG
  // ============================================

  /**
   * Nachricht zur Konversation hinzufügen und KI-Antwort generieren
   */
  async processMessage(userMessage: string): Promise<string> {
    if (!this.currentConversationId) {
      this.createConversation();
    }

    const conversation = this.conversations.get(this.currentConversationId);
    if (!conversation) {
      throw new Error('Konversation nicht gefunden');
    }

    // Benutzer-Nachricht speichern
    const userMsg: ConversationMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };
    conversation.messages.push(userMsg);

    // KI-Antwort generieren
    const aiResponse = await this.generateResponse(userMessage, conversation.messages);

    // KI-Nachricht speichern
    const aiMsg: ConversationMessage = {
      id: `msg-${Date.now()}-ai`,
      role: 'ai',
      content: aiResponse,
      timestamp: Date.now(),
    };
    conversation.messages.push(aiMsg);

    // Titel automatisch generieren, wenn es die erste Nachricht ist
    if (conversation.messages.length === 2) {
      conversation.title = this.generateConversationTitle(userMessage);
    }

    conversation.lastUpdate = Date.now();
    this.saveToStorage();

    return aiResponse;
  }

  /**
   * Nachricht aus Konversation löschen
   */
  deleteMessage(conversationId: string, messageId: string): void {
    const conv = this.conversations.get(conversationId);
    if (conv) {
      conv.messages = conv.messages.filter(m => m.id !== messageId);
      this.saveToStorage();
    }
  }

  // ============================================
  // KI-RESPONSE GENERATOR
  // ============================================

  /**
   * Intelligente Antwort generieren
   */
  private async generateResponse(userMessage: string, history: ConversationMessage[]): Promise<string> {
    console.log(`🤖 Generiere Antwort für: "${userMessage}"`);

    // Text normalisieren
    const normalized = this.normalizeText(userMessage);
    const tokens = this.tokenize(normalized);

    // Ähnliche bekannte Fragen finden
    const similarResponse = this.findSimilarResponse(normalized);
    if (similarResponse) {
      return this.addVariation(similarResponse);
    }

    // Kontext aus Konversationsverlauf nutzen
    const context = this.extractContext(history);

    // Respons generieren basierend auf Muster
    if (this.isQuestion(userMessage)) {
      return this.generateQuestionAnswer(tokens, context);
    } else if (this.isGreeting(normalized)) {
      return this.generateGreeting(context);
    } else if (this.isStatement(userMessage)) {
      return this.generateStatementResponse(tokens, context);
    } else {
      return this.generateGeneralResponse(tokens, context);
    }
  }

  /**
   * Frage beantworten
   */
  private generateQuestionAnswer(tokens: string[], _context: string): string {
    const responses = [
      `Das ist eine interessante Frage über ${this.getMainTopic(tokens)}. Basierend auf unserem Gespräch kann ich dir sagen, dass...`,
      `Gute Frage! Bezüglich ${this.getMainTopic(tokens)} würde ich dir folgendes empfehlen...`,
      `Das hängt von mehreren Faktoren ab. Beim Thema ${this.getMainTopic(tokens)} ist es wichtig zu beachten...`,
      `Das ist eine tiefgreifende Frage! Lassen Sie mich analysieren: Bei ${this.getMainTopic(tokens)} spielen diese Punkte eine Rolle...`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Auf Begrüßung antworten
   */
  private generateGreeting(_context: string): string {
    const greetings = [
      `👋 Hallo! Ich bin deine persönliche KI. Wie kann ich dir heute helfen?`,
      `🤖 Willkommen! Ich bin bereit, dir bei deinen Fragen zu unterstützen. Was möchtest du wissen?`,
      `Hallo! Freut mich dich zu treffen. Wobei kann ich dir helfen?`,
      `👀 Guten Tag! Ich bin hier, um dir intelligente Antworten zu geben.`,
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  /**
   * Auf Aussage antworten
   */
  private generateStatementResponse(tokens: string[], _context: string): string {
    const responses = [
      `Das ist ein wichtiger Punkt! Ich verstehe, dass du ${this.getMainTopic(tokens)} ansprichst. Das ist sehr relevant.`,
      `Interessant! Das Thema ${this.getMainTopic(tokens)} ist definitiv diskussionswürdig. Hast du bereits überlegt...`,
      `Du hast recht, dass ${this.getMainTopic(tokens)} bedeutsam ist. Weitere Aspekte könnten sein...`,
      `Das ist eine gute Beobachtung! Zum Punkt ${this.getMainTopic(tokens)} möchte ich noch hinzufügen...`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Allgemeine Antwort
   */
  private generateGeneralResponse(_tokens: string[], _context: string): string {
    const responses = [
      `Interessant! Ich denke, das ist ein wichtiges Thema. Können Sie mir mehr Details geben?`,
      `Das verstehe ich. Möchtest du darüber mehr erfahren?`,
      `Ich folge dir. Wie kann ich dir dabei helfen?`,
      `Das ist beachtenswert. Was möchtest du als nächstes wissen?`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // ============================================
  // NLP - NATURAL LANGUAGE PROCESSING
  // ============================================

  /**
   * Text normalisieren
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[!?.;:,]/g, '')
      .replace(/\s+/g, ' ');
  }

  /**
   * Text in Tokens zerlegen
   */
  private tokenize(text: string): string[] {
    return text.split(/\s+/).filter(token => token.length > 0);
  }

  /**
   * Ist es eine Frage?
   */
  private isQuestion(text: string): boolean {
    const questionWords = ['was', 'wie', 'wann', 'wo', 'warum', 'wer', 'welche', 'can', 'could', 'would', 'should'];
    const normalized = this.normalizeText(text);
    return questionWords.some(word => normalized.startsWith(word)) || text.includes('?');
  }

  /**
   * Ist es eine Begrüßung?
   */
  private isGreeting(text: string): boolean {
    const greetings = ['hallo', 'hi', 'hey', 'guten tag', 'guten morgen', 'guten abend', 'hello', 'hey there'];
    return greetings.some(greeting => text.includes(greeting));
  }

  /**
   * Ist es eine Aussage?
   */
  private isStatement(text: string): boolean {
    return !this.isQuestion(text) && !this.isGreeting(this.normalizeText(text));
  }

  /**
   * Hauptthema extrahieren
   */
  private getMainTopic(tokens: string[]): string {
    const stopwords = ['was', 'wie', 'der', 'die', 'das', 'ein', 'eine', 'ist', 'sind', 'zu', 'im', 'in'];
    const contentWords = tokens.filter(t => !stopwords.includes(t) && t.length > 3);
    return contentWords.length > 0 ? contentWords[0] : 'diesem Thema';
  }

  /**
   * Kontext aus Konversation extrahieren
   */
  private extractContext(messages: ConversationMessage[]): string {
    if (messages.length < 2) return 'am Anfang unserer Konversation';
    const recentMessages = messages.slice(-4);
    const userMsgs = recentMessages.filter(m => m.role === 'user');
    if (userMsgs.length > 0) {
      return `basierend auf "${userMsgs[userMsgs.length - 1].content}"`;
    }
    return 'in unserem Gespräch';
  }

  /**
   * Ähnliche bekannte Antwort finden
   */
  private findSimilarResponse(normalizedText: string): string | null {
    for (const [pattern, response] of this.knowledgeBase.patterns.entries()) {
      if (this.similarity(normalizedText, pattern) > 0.7) {
        return response;
      }
    }
    return null;
  }

  /**
   * Ähnlichkeit zwischen zwei Texten (Levenshtein Distance)
   */
  private similarity(text1: string, text2: string): number {
    const longer = text1.length > text2.length ? text1 : text2;
    const shorter = text1.length > text2.length ? text2 : text1;

    if (longer.length === 0) return 1;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Levenshtein Distance berechnen
   */
  private levenshteinDistance(s1: string, s2: string): number {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }

  /**
   * Variation einer Antwort generieren
   */
  private addVariation(response: string): string {
    const variations = [
      `Ja, ${response.toLowerCase()}`,
      `Das ist richtig: ${response}`,
      `Genau, ${response}`,
      `Meine Analyse zeigt: ${response}`,
    ];
    return variations[Math.floor(Math.random() * variations.length)];
  }

  /**
   * Automatischer Gesprächstitel
   */
  private generateConversationTitle(firstMessage: string): string {
    const normalized = this.normalizeText(firstMessage);
    const tokens = this.tokenize(normalized);
    const contentWords = tokens.filter(t => t.length > 3).slice(0, 3);
    return contentWords.length > 0 
      ? contentWords.join(' ').charAt(0).toUpperCase() + contentWords.join(' ').slice(1)
      : 'Konversation';
  }

  // ============================================
  // WISSENSBASE-VERWALTUNG
  // ============================================

  /**
   * Wissensbase initialisieren
   */
  private initializeKnowledgeBase(): void {
    // Standard-Muster und Antworten
    this.knowledgeBase.patterns.set('hallo', 'Hallo! Wie geht es dir?');
    this.knowledgeBase.patterns.set('wie geht es dir', 'Mir geht es großartig! Ich bin bereit zu helfen.');
    this.knowledgeBase.patterns.set('danke', 'Gerne geschehen! Kann ich dir noch helfen?');
    this.knowledgeBase.patterns.set('ja', 'Super! Dann lass uns weitermachen.');
    this.knowledgeBase.patterns.set('nein', 'Okay, das verstehe ich. Gibt es etwas anderes?');

    // Themen-Kategorien
    this.knowledgeBase.topics.set('programmierung', [
      'JavaScript', 'TypeScript', 'Python', 'React', 'Node.js', 'Electron'
    ]);
    this.knowledgeBase.topics.set('ai', [
      'Machine Learning', 'Neural Networks', 'NLP', 'Deep Learning'
    ]);
    this.knowledgeBase.topics.set('browser', [
      'Chrome', 'Firefox', 'WebViews', 'Tabs', 'Navigation'
    ]);
  }

  /**
   * Neues Wissen zur Basis hinzufügen
   */
  addKnowledge(pattern: string, response: string): void {
    this.knowledgeBase.patterns.set(
      this.normalizeText(pattern),
      response
    );
    this.saveToStorage();
  }

  /**
   * KI trainieren (Feedback lernen)
   */
  trainFromFeedback(userMessage: string, aiResponse: string, feedback: 'good' | 'bad'): void {
    if (feedback === 'good') {
      this.addKnowledge(userMessage, aiResponse);
      console.log(`✅ KI gelernt: "${userMessage}" -> "${aiResponse}"`);
    } else {
      console.log(`⚠️ Negative Rückmeldung für: "${userMessage}"`);
    }
  }

  // ============================================
  // KI-KONFIGURATION
  // ============================================

  /**
   * KI-Konfiguration abrufen
   */
  getConfig(): AIConfig {
    const stored = this.store.get('aiConfig') as any;
    return stored || this.aiConfig;
  }

  /**
   * KI-Konfiguration aktualisieren
   */
  updateConfig(config: Partial<AIConfig>): void {
    this.aiConfig = { ...this.aiConfig, ...config };
    this.store.set('aiConfig', this.aiConfig);
    console.log('✅ KI-Konfiguration aktualisiert:', this.aiConfig);
  }

  /**
   * Temperatur setzen (0-1)
   */
  setTemperature(temp: number): void {
    this.aiConfig.temperature = Math.max(0, Math.min(1, temp));
    this.store.set('aiConfig', this.aiConfig);
  }

  // ============================================
  // SPEICHERUNG
  // ============================================

  /**
   * Daten speichern
   */
  private saveToStorage(): void {
    const conversationsArray = Array.from(this.conversations.values());
    this.store.set('conversations', conversationsArray);
  }

  /**
   * Daten laden
   */
  private loadFromStorage(): void {
    const stored = this.store.get('conversations') as any[];
    if (stored && Array.isArray(stored)) {
      stored.forEach(conv => {
        this.conversations.set(conv.id, conv);
      });
    }

    const storedConfig = this.store.get('aiConfig') as any;
    if (storedConfig) {
      this.aiConfig = storedConfig;
    }
  }

  /**
   * Alle Daten exportieren
   */
  exportData(): string {
    return JSON.stringify({
      conversations: Array.from(this.conversations.values()),
      config: this.aiConfig,
      knowledgeBase: {
        patterns: Array.from(this.knowledgeBase.patterns.entries()),
        topics: Array.from(this.knowledgeBase.topics.entries()),
      },
    }, null, 2);
  }

  /**
   * Alle Konversationen löschen
   */
  clearAllConversations(): void {
    this.conversations.clear();
    this.currentConversationId = '';
    this.store.set('conversations', []);
  }
}

export default new AIManager();
