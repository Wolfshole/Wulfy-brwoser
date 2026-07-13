import Store from 'electron-store';
import path from 'path';
import os from 'os';

export type DownloadStatus =
  | 'pending'
  | 'progressing'
  | 'paused'
  | 'completed'
  | 'interrupted'
  | 'cancelled';

export interface Download {
  id: string;
  fileName: string;
  filePath: string;
  url: string;
  fileSize?: number;
  downloadedAt: number;
  mimeType?: string;
  progress: number;
  status: DownloadStatus;
  receivedBytes?: number;
  totalBytes?: number;
  speedBytesPerSec?: number;
  canResume?: boolean;
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

  addDownload(url: string, fileName: string, fileSize?: number, mimeType?: string): Download {
    const downloadPath = this.getDownloadPath();
    const filePath = path.join(downloadPath, fileName);

    const download: Download = {
      id: `dl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fileName,
      filePath,
      url,
      fileSize,
      downloadedAt: Date.now(),
      mimeType,
      progress: 0,
      status: 'pending',
      receivedBytes: 0,
      totalBytes: fileSize,
      speedBytesPerSec: 0,
      canResume: false,
    };

    const downloads = this.getDownloads();
    downloads.unshift(download);
    this.store.set('downloads', downloads);
    return download;
  }

  getDownloads(): Download[] {
    return this.store.get('downloads', []) as Download[];
  }

  getDownload(id: string): Download | undefined {
    return this.getDownloads().find(d => d.id === id);
  }

  /**
   * Generisches Patch-Update — wird vom Download-Handler bei jedem
   * 'updated'/'done' Event der Electron DownloadItem aufgerufen.
   */
  updateDownload(id: string, patch: Partial<Download>): void {
    const downloads = this.getDownloads();
    const index = downloads.findIndex(d => d.id === id);
    if (index === -1) return;

    downloads[index] = { ...downloads[index], ...patch };

    // Fortschritt aus Bytes ableiten, falls vorhanden
    const total = downloads[index].totalBytes;
    const received = downloads[index].receivedBytes;
    if (total && total > 0 && received !== undefined) {
      downloads[index].progress = Math.min(100, Math.max(0, (received / total) * 100));
    }

    this.store.set('downloads', downloads);
  }

  /** @deprecated Nutze updateDownload({ receivedBytes, totalBytes }) */
  updateDownloadProgress(id: string, progress: number, receivedBytes?: number, totalBytes?: number) {
    this.updateDownload(id, {
      progress: Math.min(100, Math.max(0, progress)),
      receivedBytes,
      totalBytes,
      ...(progress >= 100 ? { status: 'completed' as DownloadStatus } : {}),
    });
  }

  updateDownloadStatus(id: string, status: DownloadStatus) {
    this.updateDownload(id, {
      status,
      ...(status === 'completed' ? { progress: 100 } : {}),
    });
  }

  cancelDownload(downloadId: string) {
    this.updateDownloadStatus(downloadId, 'cancelled');
  }

  deleteDownload(downloadId: string): boolean {
    let downloads = this.getDownloads();
    downloads = downloads.filter(d => d.id !== downloadId);
    this.store.set('downloads', downloads);
    return true;
  }

  clearDownloads(): void {
    this.store.set('downloads', []);
  }

  getDownloadPath(): string {
    return this.store.get('downloadPath', this.DEFAULT_DOWNLOAD_PATH) as string;
  }

  setDownloadPath(newPath: string): void {
    this.store.set('downloadPath', newPath);
  }

  getDownloadsByDate(days: number = 30): Download[] {
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    return this.getDownloads().filter(d => d.downloadedAt >= since);
  }

  getDownloadsByMimeType(mimeType: string): Download[] {
    return this.getDownloads().filter(d => d.mimeType === mimeType);
  }

  exportDownloads(): Download[] {
    return this.getDownloads();
  }

  importDownloads(downloads: Download[]): void {
    this.store.set('downloads', downloads);
  }
}

export default new DownloadsManager();