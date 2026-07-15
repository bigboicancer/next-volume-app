import { sanitiseLibraryTitles } from './libraryData';
import { LibrarySnapshot, LibraryTitle } from './types';

interface PortableBackup {
  app: 'next-volume';
  formatVersion: 1;
  exportedAt: string;
  snapshot: LibrarySnapshot;
}

export interface SelectedBackup {
  fileName: string;
  titles: LibraryTitle[];
}

export function createPortableBackup(titles: LibraryTitle[], exportedAt = new Date()): string {
  const backup: PortableBackup = {
    app: 'next-volume',
    formatVersion: 1,
    exportedAt: exportedAt.toISOString(),
    snapshot: { version: 3, titles },
  };
  return JSON.stringify(backup, null, 2);
}

export function parsePortableBackup(raw: string): LibraryTitle[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('That is not a Next Volume backup.');

  const record = parsed as Partial<PortableBackup> & Partial<LibrarySnapshot>;
  const snapshot = record.app === 'next-volume' ? record.snapshot : record;
  if (!snapshot || ![1, 2, 3].includes(Number(snapshot.version)) || !Array.isArray(snapshot.titles)) {
    throw new Error('That is not a supported Next Volume backup.');
  }
  return sanitiseLibraryTitles(snapshot.titles);
}

function backupFileName(): string {
  return `next-volume-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

export async function shareOrDownloadBackup(titles: LibraryTitle[]): Promise<'shared' | 'downloaded'> {
  if (typeof document === 'undefined' || typeof navigator === 'undefined') {
    throw new Error('Backup files are currently available in the web app.');
  }
  const name = backupFileName();
  const blob = new Blob([createPortableBackup(titles)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  const shareData = { title: 'Next Volume backup', files: [file] };

  if (navigator.share && navigator.canShare?.(shareData)) {
    await navigator.share(shareData);
    return 'shared';
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  return 'downloaded';
}

export function chooseBackupFile(): Promise<SelectedBackup | undefined> {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('Backup files are currently available in the web app.'));
  }

  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';

    const finish = () => input.remove();
    input.addEventListener('cancel', () => {
      finish();
      resolve(undefined);
    }, { once: true });
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      finish();
      if (!file) {
        resolve(undefined);
        return;
      }
      try {
        resolve({ fileName: file.name, titles: parsePortableBackup(await file.text()) });
      } catch (error) {
        reject(error);
      }
    }, { once: true });

    document.body.appendChild(input);
    input.click();
  });
}
