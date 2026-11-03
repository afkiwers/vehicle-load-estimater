// Which version of the app settings were saved with, and how to bring older settings up to date.
//
// Every workspace in the browser, exported file and share link carries the version of the app
// that saved it. When the app is newer, the settings are upgraded only when the person agrees, by
// running every upgrade step released since, oldest first, until they match this version.

import type { Setup } from './types';
import { normalizeSetup } from './migrate';

declare const __DATA_VERSION__: string;

/** The version settings saved by this copy of the app carry: package.json's, equal to the release tag. */
export const DATA_VERSION: string = __DATA_VERSION__;

/**
 * The first release that stamped its settings. Anything saved before carries no version and is
 * taken as saved by this one.
 */
export const BASELINE = '1.4.0';

function parts(v: string): number[] {
  return v
    .trim()
    .replace(/^v/, '')
    .split('.')
    .map((n) => Number.parseInt(n, 10) || 0);
}

/** Orders two versions: negative if a is older, positive if newer, 0 if the same. */
export function compareVersions(a: string, b: string): number {
  const x = parts(a);
  const y = parts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

/** The version a stored workspace, file or link was saved with; unstamped ones predate stamping. */
export const savedWith = (version: unknown): string => (typeof version === 'string' && version ? version : BASELINE);

type Raw = Record<string, unknown>;

export interface UpgradeStep {
  /** The release that introduced the change; settings older than this get the step. */
  version: string;
  /** What changes for the person, shown before they agree to upgrade. */
  notes: string[];
  /** Changes one setup saved with the previous release into this release's shape. */
  upgrade: (setup: Raw) => Raw;
}

/**
 * One step for every release that changed what is saved, oldest first. A release that changed
 * nothing saved needs no step: its settings are only restamped. Each step only has to understand
 * the release before it.
 */
export const UPGRADES: UpgradeStep[] = [];

/** The steps settings saved with `from` need to reach `to`, oldest first. */
export function stepsBetween(from: string, to: string = DATA_VERSION, steps: UpgradeStep[] = UPGRADES): UpgradeStep[] {
  return steps
    .filter((s) => compareVersions(s.version, from) > 0 && compareVersions(s.version, to) <= 0)
    .sort((a, b) => compareVersions(a.version, b.version));
}

/** Brings one setup saved with `from` up to this version, step by step, then fills in anything still missing. */
export function upgradeSetup(raw: unknown, from: string, steps: UpgradeStep[] = UPGRADES): Setup {
  let s = structuredClone(raw) as Raw;
  for (const step of stepsBetween(from, DATA_VERSION, steps)) s = step.upgrade(s);
  return normalizeSetup(s as Partial<Setup>);
}

/** Whether settings saved with `version` are older than, the same as or newer than this copy of the app. */
export function relation(version: string, build: string = DATA_VERSION): 'older' | 'same' | 'newer' {
  const c = compareVersions(version, build);
  return c < 0 ? 'older' : c > 0 ? 'newer' : 'same';
}
