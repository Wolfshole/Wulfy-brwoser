import { app, BrowserWindow, ipcMain, Menu, dialog } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';
import bookmarksManager from './bookmarks-manager';
import historyManager from './history-manager';
import downloadsManager from './downloads-manager';
import settingsManager from './settings-manager';
import aiManager from './ai-manager';

let mainWindow: BrowserWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
    },
  });

  const startUrl = `file://${path.join(__dirname, 'index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null as any;
  });

  createMenu();
};

const createMenu = () => {
  const template: any[] = [
    {
      label: 'Datei',
      submenu: [
        {
          label: 'Neues Tab',
          accelerator: 'CmdOrCtrl+T',
          click: () => {
            mainWindow.webContents.send('new-tab');
          },
        },
        {
          label: 'Beenden',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Bearbeiten',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
      ],
    },
    {
      label: 'Ansicht',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// ===== BOOKMARKS IPC HANDLERS =====
ipcMain.handle('bookmarks:add', async (_evt, title: string, url: string, favicon?: string) => {
  return bookmarksManager.addBookmark(title, url, favicon);
});

ipcMain.handle('bookmarks:get', async (_evt, folder?: string) => {
  return bookmarksManager.getBookmarks(folder);
});

ipcMain.handle('bookmarks:delete', async (_evt, bookmarkId: string) => {
  return bookmarksManager.deleteBookmark(bookmarkId);
});

ipcMain.handle('bookmarks:update', async (_evt, bookmarkId: string, updates: any) => {
  return bookmarksManager.updateBookmark(bookmarkId, updates);
});

ipcMain.handle('bookmarks:createFolder', async (_evt, name: string) => {
  return bookmarksManager.createFolder(name);
});

ipcMain.handle('bookmarks:getFolders', async () => {
  return bookmarksManager.getFolders();
});

ipcMain.handle('bookmarks:deleteFolder', async (_evt, folderId: string) => {
  return bookmarksManager.deleteFolder(folderId);
});

ipcMain.handle('bookmarks:export', async () => {
  return bookmarksManager.exportBookmarks();
});

ipcMain.handle('bookmarks:import', async (_evt, data: any) => {
  bookmarksManager.importBookmarks(data);
  return true;
});

// ===== HISTORY IPC HANDLERS =====
ipcMain.handle('history:add', async (_evt, title: string, url: string, favicon?: string) => {
  return historyManager.addVisit(title, url, favicon);
});

ipcMain.handle('history:get', async (_evt, limit?: number, search?: string) => {
  return historyManager.getHistory(limit, search);
});

ipcMain.handle('history:getAll', async () => {
  return historyManager.getAllHistory();
});

ipcMain.handle('history:delete', async (_evt, entryId: string) => {
  return historyManager.deleteEntry(entryId);
});

ipcMain.handle('history:deleteUrl', async (_evt, url: string) => {
  return historyManager.deleteUrl(url);
});

ipcMain.handle('history:clear', async () => {
  historyManager.clearHistory();
  return true;
});

ipcMain.handle('history:clearSince', async (_evt, since: number) => {
  historyManager.clearHistorySince(since);
  return true;
});

ipcMain.handle('history:getTopVisited', async (_evt, limit?: number) => {
  return historyManager.getTopVisited(limit);
});

ipcMain.handle('history:getToday', async () => {
  return historyManager.getTodayHistory();
});

ipcMain.handle('history:export', async () => {
  return historyManager.exportHistory();
});

ipcMain.handle('history:import', async (_evt, entries: any) => {
  historyManager.importHistory(entries);
  return true;
});

// ===== DOWNLOADS IPC HANDLERS =====
ipcMain.handle('downloads:add', async (_evt, fileName: string, url: string, fileSize?: number, mimeType?: string) => {
  return downloadsManager.addDownload(fileName, url, fileSize, mimeType);
});

ipcMain.handle('downloads:get', async () => {
  return downloadsManager.getDownloads();
});

ipcMain.handle('downloads:delete', async (_evt, downloadId: string) => {
  return downloadsManager.deleteDownload(downloadId);
});

ipcMain.handle('downloads:clear', async () => {
  downloadsManager.clearDownloads();
  return true;
});

ipcMain.handle('downloads:getPath', async () => {
  return downloadsManager.getDownloadPath();
});

ipcMain.handle('downloads:setPath', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    downloadsManager.setDownloadPath(result.filePaths[0]);
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('downloads:getByDate', async (_evt, days?: number) => {
  return downloadsManager.getDownloadsByDate(days);
});

ipcMain.handle('downloads:getByMimeType', async (_evt, mimeType: string) => {
  return downloadsManager.getDownloadsByMimeType(mimeType);
});

ipcMain.handle('downloads:export', async () => {
  return downloadsManager.exportDownloads();
});

ipcMain.handle('downloads:import', async (_evt, downloads: any) => {
  downloadsManager.importDownloads(downloads);
  return true;
});

// ===== SETTINGS IPC HANDLERS =====
ipcMain.handle('settings:getDefaultSearchEngine', async () => {
  return settingsManager.getDefaultSearchEngine();
});

ipcMain.handle('settings:setDefaultSearchEngine', async (_evt, engineId: string) => {
  settingsManager.setDefaultSearchEngine(engineId);
  return true;
});

ipcMain.handle('settings:getSearchEngines', async () => {
  return settingsManager.getSearchEngines();
});

ipcMain.handle('settings:getSearchEngineById', async (_evt, id: string) => {
  return settingsManager.getSearchEngineById(id);
});

ipcMain.handle('settings:addCustomSearchEngine', async (_evt, name: string, url: string, icon?: string) => {
  return settingsManager.addCustomSearchEngine(name, url, icon);
});

ipcMain.handle('settings:deleteSearchEngine', async (_evt, engineId: string) => {
  return settingsManager.deleteSearchEngine(engineId);
});

ipcMain.handle('settings:getHomepage', async () => {
  return settingsManager.getHomepage();
});

ipcMain.handle('settings:setHomepage', async (_evt, url: string) => {
  settingsManager.setHomepage(url);
  return true;
});

ipcMain.handle('settings:getTheme', async () => {
  return settingsManager.getTheme();
});

ipcMain.handle('settings:setTheme', async (_evt, theme: string) => {
  settingsManager.setTheme(theme);
  return true;
});

ipcMain.handle('settings:getAIConfig', async () => {
  return settingsManager.getAIConfig();
});

ipcMain.handle('settings:setAIConfig', async (_evt, config: any) => {
  settingsManager.setAIConfig(config);
  return true;
});

// ============================================
// KI MANAGER - IPC HANDLERS
// ============================================

ipcMain.handle('ai:createConversation', async (_evt, title?: string) => {
  return aiManager.createConversation(title);
});

ipcMain.handle('ai:getConversations', async () => {
  return aiManager.getConversations();
});

ipcMain.handle('ai:getConversation', async (_evt, id: string) => {
  return aiManager.getConversation(id);
});

ipcMain.handle('ai:deleteConversation', async (_evt, id: string) => {
  aiManager.deleteConversation(id);
  return true;
});

ipcMain.handle('ai:renameConversation', async (_evt, id: string, newTitle: string) => {
  aiManager.renameConversation(id, newTitle);
  return true;
});

ipcMain.handle('ai:processMessage', async (_evt, userMessage: string) => {
  return await aiManager.processMessage(userMessage);
});

ipcMain.handle('ai:deleteMessage', async (_evt, conversationId: string, messageId: string) => {
  aiManager.deleteMessage(conversationId, messageId);
  return true;
});

ipcMain.handle('ai:addKnowledge', async (_evt, pattern: string, response: string) => {
  aiManager.addKnowledge(pattern, response);
  return true;
});

ipcMain.handle('ai:trainFromFeedback', async (_evt, userMessage: string, aiResponse: string, feedback: string) => {
  aiManager.trainFromFeedback(userMessage, aiResponse, feedback as 'good' | 'bad');
  return true;
});

ipcMain.handle('ai:getConfig', async () => {
  return aiManager.getConfig();
});

ipcMain.handle('ai:updateConfig', async (_evt, config: any) => {
  aiManager.updateConfig(config);
  return true;
});

ipcMain.handle('ai:setTemperature', async (_evt, temp: number) => {
  aiManager.setTemperature(temp);
  return true;
});

ipcMain.handle('ai:exportData', async () => {
  return aiManager.exportData();
});

ipcMain.handle('ai:clearAllConversations', async () => {
  aiManager.clearAllConversations();
  return true;
});
