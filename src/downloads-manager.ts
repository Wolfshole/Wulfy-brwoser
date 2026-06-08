import Store from 'electron-store';
import path from 'path';
import os from 'os';

export interface Download {
  id: string;
  fileName: string;
  filePath: string;
  url: string;
  fileSize?: number;
  downloadedAt: number;
  mimeType?: string;
}

class DownloadsManager {
  private store: Store;
  private readonly DEFAULT_DOWNLOAD_PATH = path.join(os.homedir(), 'Downloads');

  constructor() {
    this.store = new Store({
      name: 'downloads',
      defaults: {
        downloads: [],
        downloadPath: this.DEFAULT_DOWNLOAD_PATH,
      },
    });
  }

  /**
   * Download hinzufügen
   */
  addDownload(
    fileName: string,
    url: string,
    fileSize?: number,
    mimeType?: string
  ): Download {
    const downloads = this.getDownloads();
    const downloadPath = this.store.get('downloadPath', this.DEFAULT_DOWNLOAD_PATH) as string;

    const download: Download = {
      id: `download-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fileName,
      filePath: path.join(downloadPath, fileName),
      url,
      fileSize,
      downloadedAt: Date.now(),
      mimeType,
    };

    downloads.unshift(download);
    this.store.set('downloads', downloads);
    return download;
  }

  /**
   * Alle Downloads abrufen
   */
  getDownloads(): Download[] {
    return this.store.get('downloads', []) as Download[];
  }

  /**
   * Download löschen
   */
  deleteDownload(downloadId: string): boolean {
    let downloads = this.store.get('downloads', []) as Download[];
    downloads = downloads.filter(d => d.id !== downloadId);
    this.store.set('downloads', downloads);
    return true;
  }

  /**
   * Alle Downloads löschen
   */
  clearDownloads(): void {
    this.store.set('downloads', []);
  }

  /**
   * Download-Ordner abrufen
   */
  getDownloadPath(): string {
    return this.store.get('downloadPath', this.DEFAULT_DOWNLOAD_PATH) as string;
  }

  /**
   * Download-Ordner setzen
   */
  setDownloadPath(newPath: string): void {
    this.store.set('downloadPath', newPath);
  }

  /**
   * Downloads nach Datum sortiert abrufen
   */
  getDownloadsByDate(days: number = 30): Download[] {
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    const downloads = this.store.get('downloads', []) as Download[];
    return downloads.filter(d => d.downloadedAt >= since);
  }

  /**
   * Downloads nach Dateityp filtern
   */
  getDownloadsByMimeType(mimeType: string): Download[] {
    const downloads = this.store.get('downloads', []) as Download[];
    return downloads.filter(d => d.mimeType === mimeType);
  }

  /**
   * Downloads exportieren
   */
  exportDownloads(): Download[] {
    return this.store.get('downloads', []) as Download[];
  }

  /**
   * Downloads importieren
   */
  importDownloads(downloads: Download[]): void {
    this.store.set('downloads', downloads);
  }
}

export default new DownloadsManager();
