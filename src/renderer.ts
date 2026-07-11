declare const electron: any;

interface Tab {
  id: string;
  title: string;
  url: string;
  webviewId: string;
}

interface SearchEngine {
  id: string;
  name: string;
  url: string;
  icon?: string;
}

class BrowserApp {
  private tabs: Map<string, Tab> = new Map();
  private activeTabId: string = '';
  private tabCounter: number = 0;
  private selectedSearchEngine: SearchEngine | null = null;

  constructor() {
    // Initialisierung wird vom DOMContentLoaded Event gestartet
  }

  async initialize(): Promise<void> {
    console.log('🚀 Wulfy Browser wird initialisiert...');
    try {
      await this.loadTheme();
      await this.loadSearchEngine();
      await this.initializeAI();
      this.setupEventListeners();
      console.log('✅ Event Listener registriert');
      await this.setupSearchEngineSelector();
      console.log('✅ Suchmaschinen geladen');
      this.createNewTab('https://www.google.com', 'Google');
      this.loadBookmarks();
      console.log('✅ Browser bereit!');
    } catch (error) {
      console.error('❌ Fehler bei der Initialisierung:', error);
    }
  }

  private setupEventListeners(): void {
    document.getElementById('back-btn')?.addEventListener('click', () => this.goBack());
    document.getElementById('forward-btn')?.addEventListener('click', () => this.goForward());
    document.getElementById('refresh-btn')?.addEventListener('click', () => this.refresh());
    document.getElementById('stop-btn')?.addEventListener('click', () => this.stop());
    document.getElementById('home-btn')?.addEventListener('click', () => this.goHome());
    document.getElementById('new-tab-btn')?.addEventListener('click', () => this.createNewTab());
    document.getElementById('ai-open-btn')?.addEventListener('click', () => this.openAIChat());
    
    document.getElementById('bookmark-btn')?.addEventListener('click', () => this.addBookmark());
    document.getElementById('bookmarks-menu-btn')?.addEventListener('click', () => this.toggleBookmarksPanel());
    document.getElementById('history-btn')?.addEventListener('click', () => this.toggleHistoryPanel());
    document.getElementById('downloads-btn')?.addEventListener('click', () => this.toggleDownloadsPanel());
    document.getElementById('settings-btn')?.addEventListener('click', () => this.toggleSettingsPanel());
    
    document.getElementById('close-bookmarks-btn')?.addEventListener('click', () => this.closeBookmarksPanel());
    document.getElementById('close-history-btn')?.addEventListener('click', () => this.closeHistoryPanel());
    document.getElementById('close-downloads-btn')?.addEventListener('click', () => this.closeDownloadsPanel());
    document.getElementById('close-settings-btn')?.addEventListener('click', () => this.closeSettingsPanel());
    
    document.getElementById('clear-downloads-btn')?.addEventListener('click', () => this.clearDownloads());
    
    // Theme Toggle Buttons
    document.getElementById('theme-light-btn')?.addEventListener('click', () => this.setTheme('light'));
    document.getElementById('theme-dark-btn')?.addEventListener('click', () => this.setTheme('dark'));
    
    // AI Settings Button
    document.getElementById('ai-settings-btn')?.addEventListener('click', () => this.openAISettings());
    
    const historySearch = document.getElementById('history-search') as HTMLInputElement;
    historySearch?.addEventListener('input', () => this.searchHistory());

    const addressBar = document.getElementById('address-bar') as HTMLInputElement;
    addressBar?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.navigateToUrl(addressBar.value);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 't') {
          e.preventDefault();
          this.createNewTab();
        }
        if (e.key === 'w') {
          e.preventDefault();
          this.closeTab(this.activeTabId);
        }
        if (e.key === 'Tab') {
          e.preventDefault();
          this.switchToNextTab();
        }
        if (e.key === 'd') {
          e.preventDefault();
          this.addBookmark();
        }
        if (e.key === 'h') {
          e.preventDefault();
          this.toggleHistoryPanel();
        }
        if (e.key === 'j') {
          e.preventDefault();
          this.toggleDownloadsPanel();
        }
      }

      if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
        e.preventDefault();
        this.refresh();
      }

      if (e.key === 'Escape') {
        this.closeAllPanels();
        this.stop();
      }

      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        this.goBack();
      }

      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        this.goForward();
      }
    });

    window.addEventListener('new-tab', () => {
      this.createNewTab();
    });
  }

  private createNewTab(url: string = 'https://www.google.com', title: string = 'Neues Tab'): void {
    const tabId = `tab-${++this.tabCounter}`;
    const webviewId = `webview-${this.tabCounter}`;

    const tab: Tab = {
      id: tabId,
      title: title,
      url: url,
      webviewId: webviewId,
    };

    this.tabs.set(tabId, tab);
    this.renderTab(tab);
    this.createWebView(webviewId, url);
    this.switchToTab(tabId);
  }

  private renderTab(tab: Tab): void {
    const tabBar = document.getElementById('tab-bar');
    if (!tabBar) return;

    const tabElement = document.createElement('div');
    tabElement.className = 'tab';
    tabElement.id = tab.id;
    tabElement.innerHTML = `
      <span class="tab-title">${this.escapeHtml(tab.title)}</span>
      <span class="tab-close">✕</span>
    `;

    tabElement.addEventListener('click', () => this.switchToTab(tab.id));
    tabElement.querySelector('.tab-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeTab(tab.id);
    });

    tabBar.appendChild(tabElement);
  }

  private createWebView(webviewId: string, url: string): void {
    const container = document.querySelector('.browser-container');
    if (!container) return;

    const webview = document.createElement('webview');
    webview.id = webviewId;
    webview.src = this.ensureProtocol(url);
    webview.className = 'webview';
    webview.style.display = 'none';

    webview.addEventListener('page-title-updated', (e: any) => {
      const tab = Array.from(this.tabs.values()).find(t => t.webviewId === webviewId);
      if (tab) {
        tab.title = e.title;
        this.updateTabUI(tab.id);
        electron.history.add(tab.title, tab.url);
      }
    });

    webview.addEventListener('did-navigate', (e: any) => {
      const tab = Array.from(this.tabs.values()).find(t => t.webviewId === webviewId);
      if (tab) {
        tab.url = e.url;
        if (tab.id === this.activeTabId) {
          this.updateAddressBar(tab.url);
          this.updateNavigationButtonStates();
        }
      }
    });

    webview.addEventListener('did-start-loading', () => {
      this.showProgressBar();
    });

    webview.addEventListener('did-stop-loading', () => {
      this.hideProgressBar();
    });

    (webview as any).addEventListener('dom-ready', () => {
      if (this.activeTabId === Array.from(this.tabs.values()).find(t => t.webviewId === webviewId)?.id) {
        this.updateNavigationButtonStates();
      }
    });

    (webview as any).addEventListener('will-download', (event: any) => {
      const fileName = event.item.getFilename();
      const url = event.item.getURL();
      electron.downloads.add(fileName, url);
      this.loadDownloads();
    });

    container.appendChild(webview);
  }

  private switchToTab(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    if (this.activeTabId) {
      const currentWebview = document.getElementById(
        this.tabs.get(this.activeTabId)?.webviewId || ''
      ) as any;
      if (currentWebview) currentWebview.style.display = 'none';

      const currentTabElement = document.getElementById(this.activeTabId);
      if (currentTabElement) currentTabElement.classList.remove('active');
    }

    this.activeTabId = tabId;
    const webview = document.getElementById(tab.webviewId) as any;
    if (webview) webview.style.display = 'flex';

    const tabElement = document.getElementById(tabId);
    if (tabElement) tabElement.classList.add('active');

    this.updateAddressBar(tab.url);
    
    // Verzögern Sie die Navigation Button Updates, bis der WebView bereit ist
    setTimeout(() => {
      this.updateNavigationButtonStates();
    }, 100);
  }

  private closeTab(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    const webview = document.getElementById(tab.webviewId);
    webview?.remove();

    document.getElementById(tabId)?.remove();

    this.tabs.delete(tabId);

    if (this.activeTabId === tabId) {
      const remainingTabs = Array.from(this.tabs.keys());
      if (remainingTabs.length > 0) {
        this.switchToTab(remainingTabs[0]);
      } else {
        this.createNewTab();
      }
    }
  }

  private switchToNextTab(): void {
    const tabIds = Array.from(this.tabs.keys());
    const currentIndex = tabIds.indexOf(this.activeTabId);
    const nextIndex = (currentIndex + 1) % tabIds.length;
    this.switchToTab(tabIds[nextIndex]);
  }

  private navigateToUrl(urlInput: string): void {
    const tab = this.tabs.get(this.activeTabId);
    if (!tab) return;

    let url = urlInput.trim();
    url = this.ensureProtocol(url);

    tab.url = url;
    const webview = document.getElementById(tab.webviewId) as any;
    if (webview) {
      webview.src = url;
    }
  }

  private updateAddressBar(url: string): void {
    const addressBar = document.getElementById('address-bar') as HTMLInputElement;
    if (addressBar) addressBar.value = url;
  }

  private updateTabUI(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    const tabElement = document.getElementById(tabId);
    if (tabElement) {
      const titleElement = tabElement.querySelector('.tab-title');
      if (titleElement) titleElement.textContent = this.escapeHtml(tab.title);
    }
  }

  private goBack(): void {
    const tab = this.tabs.get(this.activeTabId);
    if (!tab) return;

    const webview = document.getElementById(tab.webviewId) as any;
    if (webview && webview.canGoBack && webview.canGoBack()) {
      webview.goBack();
      this.updateNavigationButtonStates();
    }
  }

  private goForward(): void {
    const tab = this.tabs.get(this.activeTabId);
    if (!tab) return;

    const webview = document.getElementById(tab.webviewId) as any;
    if (webview && webview.canGoForward && webview.canGoForward()) {
      webview.goForward();
      this.updateNavigationButtonStates();
    }
  }

  private refresh(): void {
    const tab = this.tabs.get(this.activeTabId);
    if (!tab) return;

    const webview = document.getElementById(tab.webviewId) as any;
    if (webview) webview.reload();
  }

  private stop(): void {
    const tab = this.tabs.get(this.activeTabId);
    if (!tab) return;

    const webview = document.getElementById(tab.webviewId) as any;
    if (webview) webview.stop();
  }

  private goHome(): void {
    this.navigateToUrl('https://www.google.com');
  }

  private showProgressBar(): void {
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
      progressBar.classList.add('active');
    }
  }

  private hideProgressBar(): void {
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
      progressBar.classList.remove('active');
      progressBar.classList.add('complete');
      setTimeout(() => {
        progressBar?.classList.remove('complete');
      }, 700);
    }
  }

  private updateNavigationButtonStates(): void {
    const tab = this.tabs.get(this.activeTabId);
    if (!tab) return;

    const webview = document.getElementById(tab.webviewId) as any;
    const backBtn = document.getElementById('back-btn') as HTMLButtonElement;
    const forwardBtn = document.getElementById('forward-btn') as HTMLButtonElement;

    // Nur aktualisieren, wenn WebView bereit ist
    if (!webview || typeof webview.canGoBack !== 'function' || typeof webview.canGoForward !== 'function') {
      if (backBtn) backBtn.disabled = true;
      if (forwardBtn) forwardBtn.disabled = true;
      return;
    }

    try {
      if (backBtn) {
        backBtn.disabled = !webview.canGoBack();
      }

      if (forwardBtn) {
        forwardBtn.disabled = !webview.canGoForward();
      }
    } catch (error) {
      // WebView noch nicht vollständig initialisiert
      if (backBtn) backBtn.disabled = true;
      if (forwardBtn) forwardBtn.disabled = true;
    }
  }

  private async addBookmark(): Promise<void> {
    const tab = this.tabs.get(this.activeTabId);
    if (!tab) return;

    try {
      await electron.bookmarks.add(tab.title, tab.url);
      alert(`✅ "${tab.title}" wurde zu Favoriten hinzugefügt!`);
      this.loadBookmarks();
    } catch (error) {
      console.error('Fehler beim Hinzufügen von Favorit:', error);
    }
  }

  private async loadBookmarks(): Promise<void> {
    try {
      const bookmarks = await electron.bookmarks.get();
      const bookmarksList = document.getElementById('bookmarks-list');
      if (!bookmarksList) return;

      bookmarksList.innerHTML = '';

      if (bookmarks.length === 0) {
        bookmarksList.innerHTML = '<p class="empty-message">Keine Favoriten vorhanden</p>';
        return;
      }

      bookmarks.forEach((bookmark: any) => {
        const bookmarkElement = document.createElement('div');
        bookmarkElement.className = 'bookmark-item';
        bookmarkElement.innerHTML = `
          <a href="${this.escapeHtml(bookmark.url)}" class="bookmark-link">
            ${this.escapeHtml(bookmark.title)}
          </a>
          <button class="delete-btn" data-id="${bookmark.id}">🗑️</button>
        `;

        bookmarkElement.querySelector('.bookmark-link')?.addEventListener('click', (e) => {
          e.preventDefault();
          this.navigateToUrl(bookmark.url);
          this.closeBookmarksPanel();
        });

        bookmarkElement.querySelector('.delete-btn')?.addEventListener('click', async () => {
          await electron.bookmarks.delete(bookmark.id);
          this.loadBookmarks();
        });

        bookmarksList.appendChild(bookmarkElement);
      });
    } catch (error) {
      console.error('Fehler beim Laden von Favoriten:', error);
    }
  }

  private toggleBookmarksPanel(): void {
    const panel = document.getElementById('bookmarks-panel');
    if (panel?.classList.contains('active')) {
      this.closeBookmarksPanel();
    } else {
      this.closeAllPanels();
      panel?.classList.add('active');
      this.loadBookmarks();
    }
  }

  private closeBookmarksPanel(): void {
    document.getElementById('bookmarks-panel')?.classList.remove('active');
  }

  private async loadHistory(search?: string): Promise<void> {
    try {
      const history = await (search 
        ? electron.history.get(100, search)
        : electron.history.get(100)
      );
      const historyList = document.getElementById('history-list');
      if (!historyList) return;

      historyList.innerHTML = '';

      if (history.length === 0) {
        historyList.innerHTML = '<p class="empty-message">Kein Verlauf vorhanden</p>';
        return;
      }

      history.forEach((entry: any) => {
        const date = new Date(entry.visitedAt);
        const historyElement = document.createElement('div');
        historyElement.className = 'history-item';
        historyElement.innerHTML = `
          <div class="history-content">
            <a href="${this.escapeHtml(entry.url)}" class="history-link">
              ${this.escapeHtml(entry.title)}
            </a>
            <p class="history-url">${this.escapeHtml(entry.url)}</p>
            <p class="history-date">${date.toLocaleString()}</p>
          </div>
          <button class="delete-btn" data-id="${entry.id}">🗑️</button>
        `;

        historyElement.querySelector('.history-link')?.addEventListener('click', (e) => {
          e.preventDefault();
          this.navigateToUrl(entry.url);
          this.closeHistoryPanel();
        });

        historyElement.querySelector('.delete-btn')?.addEventListener('click', async () => {
          await electron.history.delete(entry.id);
          this.loadHistory();
        });

        historyList.appendChild(historyElement);
      });
    } catch (error) {
      console.error('Fehler beim Laden von History:', error);
    }
  }

  private searchHistory(): void {
    const searchInput = document.getElementById('history-search') as HTMLInputElement;
    this.loadHistory(searchInput.value);
  }

  private toggleHistoryPanel(): void {
    const panel = document.getElementById('history-panel');
    if (panel?.classList.contains('active')) {
      this.closeHistoryPanel();
    } else {
      this.closeAllPanels();
      panel?.classList.add('active');
      this.loadHistory();
    }
  }

  private closeHistoryPanel(): void {
    document.getElementById('history-panel')?.classList.remove('active');
  }

  private async loadDownloads(): Promise<void> {
    try {
      const downloads = await electron.downloads.get();
      const downloadsList = document.getElementById('downloads-list');
      if (!downloadsList) return;

      downloadsList.innerHTML = '';

      if (downloads.length === 0) {
        downloadsList.innerHTML = '<p class="empty-message">Keine Downloads vorhanden</p>';
        return;
      }

      downloads.forEach((download: any) => {
        const date = new Date(download.downloadedAt);
        const downloadElement = document.createElement('div');
        downloadElement.className = 'download-item';
        downloadElement.innerHTML = `
          <div class="download-content">
            <p class="download-name">${this.escapeHtml(download.fileName)}</p>
            <p class="download-path">${this.escapeHtml(download.filePath)}</p>
            <p class="download-date">${date.toLocaleString()}</p>
          </div>
          <button class="delete-btn" data-id="${download.id}">🗑️</button>
        `;

        downloadElement.querySelector('.delete-btn')?.addEventListener('click', async () => {
          await electron.downloads.delete(download.id);
          this.loadDownloads();
        });

        downloadsList.appendChild(downloadElement);
      });
    } catch (error) {
      console.error('Fehler beim Laden von Downloads:', error);
    }
  }

  private async clearDownloads(): Promise<void> {
    if (confirm('Alle Downloads löschen?')) {
      await electron.downloads.clear();
      this.loadDownloads();
    }
  }

  private toggleDownloadsPanel(): void {
    const panel = document.getElementById('downloads-panel');
    if (panel?.classList.contains('active')) {
      this.closeDownloadsPanel();
    } else {
      this.closeAllPanels();
      panel?.classList.add('active');
      this.loadDownloads();
    }
  }

  private closeDownloadsPanel(): void {
    document.getElementById('downloads-panel')?.classList.remove('active');
  }

  private async loadSearchEngine(): Promise<void> {
    try {
      this.selectedSearchEngine = await electron.settings.getDefaultSearchEngine();
    } catch (error) {
      console.error('Failed to load search engine:', error);
      this.selectedSearchEngine = {
        id: 'google',
        name: 'Google',
        url: 'https://www.google.com/search?q={query}',
      };
    }
  }

  private async setupSearchEngineSelector(): Promise<void> {
    const select = document.getElementById('search-engine-select') as HTMLSelectElement;
    if (!select) return;

    try {
      const engines = await electron.settings.getSearchEngines();
      select.innerHTML = '';
      
      engines.forEach((engine: SearchEngine) => {
        const option = document.createElement('option');
        option.value = engine.id;
        option.textContent = engine.name;
        option.selected = engine.id === this.selectedSearchEngine?.id;
        select.appendChild(option);
      });

      select.addEventListener('change', async (e) => {
        const selectedId = (e.target as HTMLSelectElement).value;
        await electron.settings.setDefaultSearchEngine(selectedId);
        await this.loadSearchEngine();
      });
    } catch (error) {
      console.error('Failed to setup search engine selector:', error);
    }
  }

  private toggleSettingsPanel(): void {
    const panel = document.getElementById('settings-panel');
    if (panel?.classList.contains('active')) {
      this.closeSettingsPanel();
    } else {
      this.closeAllPanels();
      panel?.classList.add('active');
    }
  }

  private closeSettingsPanel(): void {
    document.getElementById('settings-panel')?.classList.remove('active');
  }

  private closeAllPanels(): void {
    document.getElementById('bookmarks-panel')?.classList.remove('active');
    document.getElementById('history-panel')?.classList.remove('active');
    document.getElementById('downloads-panel')?.classList.remove('active');
    document.getElementById('settings-panel')?.classList.remove('active');
  }

  private ensureProtocol(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    if (url.includes('.') && !url.includes(' ')) {
      return `https://${url}`;
    }

    // Use selected search engine or fallback to Google
    if (this.selectedSearchEngine) {
      return this.selectedSearchEngine.url.replace('{query}', encodeURIComponent(url));
    }

    return `https://www.google.com/search?q=${encodeURIComponent(url)}`;
  }

  private escapeHtml(text: string): string {
    const map: {[key: string]: string} = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  // ============================================
  // THEME MANAGEMENT
  // ============================================

  private async loadTheme(): Promise<void> {
    const theme = await electron.settings.getTheme();
    this.applyTheme(theme || 'light');
  }

  private setTheme(theme: 'light' | 'dark'): void {
    this.applyTheme(theme);
    electron.settings.setTheme(theme);
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    const body = document.body;
    const lightBtn = document.getElementById('theme-light-btn');
    const darkBtn = document.getElementById('theme-dark-btn');

    if (theme === 'dark') {
      body.classList.add('dark-mode');
      lightBtn?.classList.remove('active');
      darkBtn?.classList.add('active');
    } else {
      body.classList.remove('dark-mode');
      lightBtn?.classList.add('active');
      darkBtn?.classList.remove('active');
    }
  }

  // ============================================
  // AI ASSISTANT
  // ============================================

  private async initializeAI(): Promise<void> {
    try {
      await electron.ai.createConversation();
      await electron.ai.addKnowledge('Wulfy Browser unterstützt lokale KI-Assistenten im UI.');
    } catch (error) {
      console.error('AI initialisierung fehlgeschlagen:', error);
    }
  }

  private openAISettings(): void {
    const dialog = this.createAIDialog();
    document.body.appendChild(dialog);
  }

  private async openAIChat(): Promise<void> {
    const dialog = this.createAIChatDialog();
    document.body.appendChild(dialog);
    await this.refreshAIChatHistory(dialog);
  }

  private createAIDialog(): HTMLElement {
    const dialog = document.createElement('div');
    dialog.className = 'ai-dialog';
    dialog.innerHTML = `
      <div class="ai-dialog-content">
        <div class="ai-dialog-header">
          <h2>🤖 KI-Assistent Konfigurieren</h2>
          <button class="ai-close-btn">✕</button>
        </div>
        <div class="ai-dialog-body">
          <div class="ai-option">
            <h3>API-Modell auswählen</h3>
            <select id="ai-model-select" class="ai-select">
              <option value="openai">OpenAI GPT-4</option>
              <option value="local">Lokale KI (Ollama)</option>
              <option value="google">Google Gemini</option>
              <option value="anthropic">Claude (Anthropic)</option>
            </select>
          </div>
          
          <div class="ai-option">
            <label>API-Schlüssel</label>
            <input type="password" id="ai-api-key" class="ai-input" placeholder="Geben Sie Ihren API-Schlüssel ein">
          </div>
          
          <div class="ai-option">
            <label>Modellname</label>
            <input type="text" id="ai-model-name" class="ai-input" placeholder="z.B. gpt-4, llama2">
          </div>
          
          <div class="ai-option">
            <label>API-Endpunkt (Optional)</label>
            <input type="text" id="ai-endpoint" class="ai-input" placeholder="https://api.openai.com/v1">
          </div>
        </div>
        <div class="ai-dialog-footer">
          <button id="ai-save-btn" class="ai-btn ai-btn-primary">Speichern</button>
          <button id="ai-cancel-btn" class="ai-btn ai-btn-secondary">Abbrechen</button>
        </div>
      </div>
    `;

    const closeBtn = dialog.querySelector('.ai-close-btn') as HTMLElement;
    const cancelBtn = dialog.querySelector('#ai-cancel-btn') as HTMLElement;
    const saveBtn = dialog.querySelector('#ai-save-btn') as HTMLElement;

    closeBtn?.addEventListener('click', () => dialog.remove());
    cancelBtn?.addEventListener('click', () => dialog.remove());
    saveBtn?.addEventListener('click', () => this.saveAIConfig(dialog));

    return dialog;
  }

  private createAIChatDialog(): HTMLElement {
    const dialog = document.createElement('div');
    dialog.className = 'ai-dialog';
    dialog.innerHTML = `
      <div class="ai-dialog-content ai-chat-content">
        <div class="ai-dialog-header">
          <h2>🤖 Lokaler KI-Assistent</h2>
          <button class="ai-close-btn">✕</button>
        </div>
        <div id="ai-chat-messages" class="ai-chat-messages"></div>
        <form id="ai-chat-form" class="ai-chat-form">
          <input id="ai-chat-input" class="ai-input ai-chat-input" placeholder="Frage an die KI eingeben..." autocomplete="off" />
          <button type="submit" class="ai-btn ai-btn-primary">Senden</button>
        </form>
      </div>
    `;

    const closeBtn = dialog.querySelector('.ai-close-btn') as HTMLElement;
    const form = dialog.querySelector('#ai-chat-form') as HTMLFormElement;
    const input = dialog.querySelector('#ai-chat-input') as HTMLInputElement;

    closeBtn?.addEventListener('click', () => dialog.remove());

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text) return;

      input.value = '';
      await this.sendAIChatMessage(dialog, text);
    });

    return dialog;
  }

  private async refreshAIChatHistory(dialog: HTMLElement): Promise<void> {
    const messagesContainer = dialog.querySelector('#ai-chat-messages');
    if (!messagesContainer) return;

    try {
      const history = await electron.ai.getHistory();
      messagesContainer.innerHTML = '';

      if (!history || history.length === 0) {
        const intro = document.createElement('div');
        intro.className = 'ai-message ai-message-assistant';
        intro.textContent = 'Hallo! Ich bin dein lokaler Wulfy-KI-Assistent. Frag mich einfach nach Tabs, Favoriten, Verlauf, Downloads oder Einstellungen.';
        messagesContainer.appendChild(intro);
        return;
      }

      history.forEach((entry: any) => {
        const message = document.createElement('div');
        message.className = `ai-message ai-message-${entry.role}`;
        message.textContent = entry.content;
        messagesContainer.appendChild(message);
      });

      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {
      console.error('Fehler beim Laden der KI-Historie:', error);
    }
  }

  private async sendAIChatMessage(dialog: HTMLElement, text: string): Promise<void> {
    try {
      const reply = await electron.ai.processMessage(text);
      await this.refreshAIChatHistory(dialog);

      const messagesContainer = dialog.querySelector('#ai-chat-messages');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }

      if (reply) {
        console.log('KI-Antwort:', reply);
      }
    } catch (error) {
      console.error('Fehler beim Senden an die KI:', error);
      alert('Die KI konnte die Anfrage derzeit nicht verarbeiten.');
    }
  }

  private saveAIConfig(dialog: HTMLElement): void {
    const modelSelect = dialog.querySelector('#ai-model-select') as HTMLSelectElement;
    const apiKey = (dialog.querySelector('#ai-api-key') as HTMLInputElement).value;
    const modelName = (dialog.querySelector('#ai-model-name') as HTMLInputElement).value;
    const endpoint = (dialog.querySelector('#ai-endpoint') as HTMLInputElement).value;

    if (!apiKey || !modelName) {
      alert('Bitte füllen Sie API-Schlüssel und Modellname aus');
      return;
    }

    const config = {
      provider: modelSelect.value,
      apiKey,
      modelName,
      endpoint: endpoint || undefined,
    };

    electron.settings.setAIConfig(config);
    alert('✅ KI-Konfiguration gespeichert!');
    dialog.remove();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const app = new BrowserApp();
  await app.initialize();
});
