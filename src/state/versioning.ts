// Which version of the app to open for the settings found in the browser, decided before the app
// starts. Every release is hosted at its own address ("v/<version>/"), the latest at the root, and
// "versions.json" at the root lists them all. Settings saved with an older version open in that
// version, with a banner offering the upgrade every time; the upgrade itself runs in the latest
// version, which knows every step.

import { APP_URL } from '../build';
import { DATA_VERSION, compareVersions, relation } from '../model/versions';

export interface VersionsManifest {
  latest: string;
  /** Every hosted release, oldest first. */
  versions: string[];
}

export type VersionState =
  | { kind: 'current' }
  | { kind: 'redirect'; url: string }
  /**
   * The settings are older than the latest release. `upgradeUrl` is where the upgrade runs: null
   * when this copy can run it itself (it is the latest, or there is no other to go to).
   */
  | { kind: 'outdated'; settings: string; latest: string; upgradeUrl: string | null; prompt: boolean }
  /** Saved by a newer version than this copy: shown, but never written back. */
  | { kind: 'newer'; settings: string; latestUrl: string };

/** Asked for by the "Upgrade" button of an older version: the latest version opens with the upgrade offered. */
export const UPGRADE_PARAM = 'upgrade';

export const versionUrl = (version: string) => `${APP_URL}v/${version}/`;

interface Context {
  /** Version of the saved settings; null when nothing is saved yet. */
  settings: string | null;
  /** This copy's version. */
  build?: string;
  /** null offline, from a downloaded file, or in development. */
  manifest: VersionsManifest | null;
  /** Running the latest at the site root rather than a "v/<version>/" copy. */
  atRoot: boolean;
  search: string;
  hash: string;
}

export function decideVersion({ settings, build = DATA_VERSION, manifest, atRoot, search, hash }: Context): VersionState {
  if (settings === null) return { kind: 'current' };
  const rel = relation(settings, build);
  if (rel === 'newer') return { kind: 'newer', settings, latestUrl: APP_URL + hash };
  const latest = manifest && compareVersions(manifest.latest, build) > 0 ? manifest.latest : build;
  const upgrading = new URLSearchParams(search).has(UPGRADE_PARAM);
  if (rel === 'older') {
    // Older settings open in the version that saved them, unless the person asked to upgrade.
    if (atRoot && manifest?.versions.includes(settings) && !upgrading) return { kind: 'redirect', url: versionUrl(settings) + hash };
    // This copy is newer than the settings, so it can upgrade them; to the latest only if it is the latest.
    const upgradeUrl = latest === build ? null : `${APP_URL}?${UPGRADE_PARAM}${hash}`;
    return { kind: 'outdated', settings, latest, upgradeUrl, prompt: upgrading && upgradeUrl === null };
  }
  if (latest !== build) return { kind: 'outdated', settings, latest, upgradeUrl: `${APP_URL}?${UPGRADE_PARAM}${hash}`, prompt: false };
  return { kind: 'current' };
}

/** The hosted versions, only when running from the published site; null otherwise or if it can't be read in time. */
export async function loadManifest(timeoutMs = 2500): Promise<VersionsManifest | null> {
  if (location.protocol === 'file:' || !location.href.startsWith(APP_URL)) return null;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  try {
    const r = await fetch(`${APP_URL}versions.json`, { signal: abort.signal, cache: 'no-cache' });
    if (!r.ok) return null;
    const m = (await r.json()) as VersionsManifest;
    return typeof m?.latest === 'string' && Array.isArray(m.versions) ? m : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Running at the site root, not a hosted older version. */
export const isRoot = () => !/\/v\/[0-9][^/]*\/?$/.test(location.pathname);

/** The banner hides for the rest of the visit when dismissed, and comes back next time the site opens. */
const DISMISS_KEY = 'vehicle-load-estimator:version-banner';
export function bannerDismissed(state: VersionState): boolean {
  try {
    return state.kind !== 'current' && sessionStorage.getItem(DISMISS_KEY) === JSON.stringify(state);
  } catch {
    return false;
  }
}
export function dismissBanner(state: VersionState) {
  try {
    sessionStorage.setItem(DISMISS_KEY, JSON.stringify(state));
  } catch {
    // Storage blocked: it just shows again.
  }
}

/** Decided at start-up, read by the banner. */
export const versionState: { current: VersionState } = { current: { kind: 'current' } };
