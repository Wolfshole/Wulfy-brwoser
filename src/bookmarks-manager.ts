import Store from 'electron-store';

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  createdAt: number;
  folder?: string;
}

export interface BookmarkFolder {
  id: string;
  name: string;
  createdAt: number;
}

class BookmarksManager {
  private store: Store;

  constructor() {
    this.store = new Store({
      name: 'bookmarks',
      defaults: {
        bookmarks: [],
        folders: [],
      },
    });
  }

  /**
   * Favorit hinzufügen
   */
  addBookmark(title: string, url: string, favicon?: string, folder?: string): Bookmark {
    const bookmarks = this.getBookmarks();
    const bookmark: Bookmark = {
      id: `bookmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      url,
      favicon,
      createdAt: Date.now(),
      folder,
    };

    bookmarks.push(bookmark);
    this.store.set('bookmarks', bookmarks);
    return bookmark;
  }

  /**
   * Alle Favoriten abrufen
   */
  getBookmarks(folder?: string): Bookmark[] {
    const bookmarks = this.store.get('bookmarks', []) as Bookmark[];
    if (folder) {
      return bookmarks.filter(b => b.folder === folder);
    }
    return bookmarks.filter(b => !b.folder);
  }

  /**
   * Favorit löschen
   */
  deleteBookmark(bookmarkId: string): boolean {
    let bookmarks = this.store.get('bookmarks', []) as Bookmark[];
    bookmarks = bookmarks.filter(b => b.id !== bookmarkId);
    this.store.set('bookmarks', bookmarks);
    return true;
  }

  /**
   * Favorit aktualisieren
   */
  updateBookmark(bookmarkId: string, updates: Partial<Bookmark>): Bookmark | null {
    let bookmarks = this.store.get('bookmarks', []) as Bookmark[];
    const index = bookmarks.findIndex(b => b.id === bookmarkId);

    if (index === -1) return null;

    bookmarks[index] = { ...bookmarks[index], ...updates };
    this.store.set('bookmarks', bookmarks);
    return bookmarks[index];
  }

  /**
   * Ordner erstellen
   */
  createFolder(name: string): BookmarkFolder {
    const folders = this.getFolders();
    const folder: BookmarkFolder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      createdAt: Date.now(),
    };

    folders.push(folder);
    this.store.set('folders', folders);
    return folder;
  }

  /**
   * Alle Ordner abrufen
   */
  getFolders(): BookmarkFolder[] {
    return this.store.get('folders', []) as BookmarkFolder[];
  }

  /**
   * Ordner löschen
   */
  deleteFolder(folderId: string): boolean {
    let folders = this.store.get('folders', []) as BookmarkFolder[];
    let bookmarks = this.store.get('bookmarks', []) as Bookmark[];

    folders = folders.filter(f => f.id !== folderId);
    bookmarks = bookmarks.filter(b => b.folder !== folderId);

    this.store.set('folders', folders);
    this.store.set('bookmarks', bookmarks);
    return true;
  }

  /**
   * Alle Favoriten und Ordner exportieren
   */
  exportBookmarks(): { bookmarks: Bookmark[]; folders: BookmarkFolder[] } {
    return {
      bookmarks: this.store.get('bookmarks', []) as Bookmark[],
      folders: this.store.get('folders', []) as BookmarkFolder[],
    };
  }

  /**
   * Favoriten importieren
   */
  importBookmarks(data: { bookmarks: Bookmark[]; folders: BookmarkFolder[] }): void {
    this.store.set('bookmarks', data.bookmarks || []);
    this.store.set('folders', data.folders || []);
  }
}

export default new BookmarksManager();
