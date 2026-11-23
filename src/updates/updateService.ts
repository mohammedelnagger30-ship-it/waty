import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

const REPO_OWNER = 'mohammedelnagger30-ship-it';
const REPO_NAME = 'waty';
const BRANCH = 'main';
const MANIFEST_URL =
  `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/update.json`;

export interface UpdateInfo {
  version: string;
  versionCode?: number;
  notes?: string;
  notesEn?: string;
  apkUrl?: string;
  releaseUrl?: string;
}

interface UpdateManifest extends UpdateInfo {
  version: string;
}

export function getCurrentVersion(): string {
  return Constants.expoConfig?.version || '1.0.0';
}

function parseVersion(value: string): number[] {
  const cleaned = (value || '').trim().replace(/^v/i, '').split(/[-+]/)[0];
  const parts = cleaned.split('.').map((part) => Number.parseInt(part, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts.slice(0, 3);
}

export function isNewerVersion(latest: string, current: string): boolean {
  const newer = parseVersion(latest);
  const installed = parseVersion(current);
  for (let index = 0; index < 3; index += 1) {
    if (newer[index] !== installed[index]) {
      return newer[index] > installed[index];
    }
  }
  return false;
}

function isNewerBuild(manifest: UpdateManifest): boolean {
  const currentCode = Number(Constants.expoConfig?.android?.versionCode ?? 0);
  if (currentCode > 0 && typeof manifest.versionCode === 'number') {
    return manifest.versionCode > currentCode;
  }
  return isNewerVersion(manifest.version, getCurrentVersion());
}

/** Fetches the published update manifest and returns it only when it is newer. */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${MANIFEST_URL}?t=${Date.now()}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(`Update manifest request failed: ${response.status}`);
    }

    const manifest = (await response.json()) as UpdateManifest;
    if (!manifest.version || !isNewerBuild(manifest)) {
      return null;
    }

    return {
      version: manifest.version,
      versionCode: manifest.versionCode,
      notes: manifest.notes,
      notesEn: manifest.notesEn,
      apkUrl: manifest.apkUrl,
      releaseUrl: manifest.releaseUrl,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/** Opens the APK download (or the release page) in the browser. */
export async function openDownload(info: UpdateInfo): Promise<void> {
  const url = info.apkUrl || info.releaseUrl;
  if (!url) return;
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    await Linking.openURL(url);
  }
}
