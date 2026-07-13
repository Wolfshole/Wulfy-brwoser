import { session, ipcMain, BrowserWindow, DownloadItem } from 'electron';
import fs from 'fs';
import path from 'path';
import downloadsManager from './downloads-manager';

// Hält die aktiven Electron DownloadItems, damit sie pausiert/fortgesetzt/
// abgebrochen werden können. Lebt nur im Main-Prozess, nicht im Store —
// DownloadItem ist nicht serialisierbar.
const activeItems = new Map<string, DownloadItem>();

/**
 * Erzeugt bei Namenskonflikten "datei (1).zip", "datei (2).zip", usw.
 */
function getUniqueFilePath(dir: string, fileName: string): string {
  let filePath = path.join(dir, fileName);
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  let counter = 1;
  while (fs.existsSync(filePath)) {
    filePath = path.join(dir, `${base} (${counter})${ext}`);
    counter++;
  }
  return filePath;
}

export function registerDownloadHandler(win: BrowserWindow) {
  session.defaultSession.on('will-download', (_event, item, _webContents) => {
    const fileName = item.getFilename();
    const downloadDir = downloadsManager.getDownloadPath();
    const savePath = getUniqueFilePath(downloadDir, fileName);
    item.setSavePath(savePath);

    const download = downloadsManager.addDownload(
      item.getURL(),
      path.basename(savePath),
      item.getTotalBytes(),
      item.getMimeType()
    );
    downloadsManager.updateDownload(download.id, {
      filePath: savePath,
      status: 'progressing',
      totalBytes: item.getTotalBytes(),
    });
    activeItems.set(download.id, item);

    win.webContents.send('download-started', {
      id: download.id,
      fileName: path.basename(savePath),
      filePath: savePath,
    });

    let lastBytes = 0;
    let lastTime = Date.now();

    item.on('updated', (_e, state) => {
      const received = item.getReceivedBytes();
      const total = item.getTotalBytes();
      const progress = total > 0 ? Math.floor((received / total) * 100) : 0;

      const now = Date.now();
      const elapsedSec = (now - lastTime) / 1000;
      const bytesDelta = received - lastBytes;
      const speed = elapsedSec > 0 ? bytesDelta / elapsedSec : 0;
      lastBytes = received;
      lastTime = now;

      downloadsManager.updateDownload(download.id, {
        status: item.isPaused() ? 'paused' : 'progressing',
        progress,
        receivedBytes: received,
        totalBytes: total,
        speedBytesPerSec: speed,
        canResume: item.canResume(),
      });

      win.webContents.send('download-progress', {
        id: download.id,
        progress,
        receivedBytes: received,
        totalBytes: total,
        speedBytesPerSec: speed,
        status: item.isPaused() ? 'paused' : state, // 'progressing' | 'paused' | 'interrupted'
        fileName: path.basename(savePath),
      });
    });

    item.once('done', (_e, state) => {
      activeItems.delete(download.id);

      if (state === 'completed') {
        downloadsManager.updateDownload(download.id, {
          status: 'completed',
          progress: 100,
          receivedBytes: item.getTotalBytes(),
          speedBytesPerSec: 0,
        });
        win.webContents.send('download-complete', {
          id: download.id,
          fileName: path.basename(savePath),
          filePath: savePath,
        });
      } else {
        const status = state === 'cancelled' ? 'cancelled' : 'interrupted';
        downloadsManager.updateDownload(download.id, { status, speedBytesPerSec: 0 });
        win.webContents.send('download-failed', {
          id: download.id,
          fileName: path.basename(savePath),
          state,
        });
      }
    });
  });

  // ===== Steuerung laufender Downloads (neu, ergänzt die bestehenden downloads:* Handler) =====
  ipcMain.handle('downloads:pause', (_e, id: string) => {
    activeItems.get(id)?.pause();
    return true;
  });

  ipcMain.handle('downloads:resume', (_e, id: string) => {
    const item = activeItems.get(id);
    if (item?.canResume()) {
      item.resume();
      return true;
    }
    return false;
  });

  // Ersetzt den bisherigen 'downloads:cancel' Handler aus main.ts:
  // bricht das echte DownloadItem ab statt nur den Status im Store zu ändern.
  ipcMain.handle('downloads:cancel', (_e, id: string) => {
    const item = activeItems.get(id);
    if (item) {
      item.cancel();
    } else {
      downloadsManager.cancelDownload(id);
    }
    return true;
  });
}