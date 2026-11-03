import { beforeAll, describe, expect, it } from 'vitest';
import { BASELINE, DATA_VERSION, UPGRADES, compareVersions, relation, savedWith, stepsBetween, upgradeSetup, type UpgradeStep } from './versions';
import { newSetup } from './presets';
import { decideVersion, versionUrl } from '../state/versioning';
import { APP_URL } from '../build';

describe('versions', () => {
  it('orders versions by number, not as text', () => {
    expect(compareVersions('1.10.0', '1.9.3')).toBeGreaterThan(0);
    expect(compareVersions('v1.4.0', '1.4')).toBe(0);
    expect(relation('1.3.9', '1.4.0')).toBe('older');
    expect(relation('2.0.0', '1.4.0')).toBe('newer');
  });

  it('takes settings saved before stamping as the baseline', () => {
    expect(savedWith(undefined)).toBe(BASELINE);
    expect(savedWith('1.5.0')).toBe('1.5.0');
  });

  it('has an upgrade step only for releases after the baseline, up to this one, each once and in order', () => {
    const versions = UPGRADES.map((s) => s.version);
    expect(new Set(versions).size).toBe(versions.length);
    expect([...versions].sort(compareVersions)).toEqual(versions);
    for (const v of versions) {
      expect(compareVersions(v, BASELINE)).toBeGreaterThan(0);
      expect(compareVersions(v, DATA_VERSION)).toBeLessThanOrEqual(0);
    }
    for (const s of UPGRADES) expect(s.notes.length).toBeGreaterThan(0);
  });

  it('runs every step since the settings were saved, oldest first, and only those', () => {
    const log: string[] = [];
    const step = (version: string): UpgradeStep => ({ version, notes: [version], upgrade: (s) => (log.push(version), { ...s, name: `${s.name} > ${version}` }) });
    const steps = [step('9.2.0'), step('9.0.0'), step('9.1.0'), step('8.0.0')];
    expect(stepsBetween('8.5.0', '9.1.0', steps).map((s) => s.version)).toEqual(['9.0.0', '9.1.0']);
    expect(stepsBetween('9.1.0', '9.1.0', steps)).toEqual([]);
    const s = newSetup('Van');
    // Settings already at this version are only normalised.
    expect(upgradeSetup(s, DATA_VERSION, steps).name).toBe('Van');
    expect(log).toEqual([]);
  });
});

describe('opening the right version', () => {
  const manifest = { latest: '1.6.0', versions: ['1.4.0', '1.5.0', '1.6.0'] };
  const at = { search: '', hash: '' };

  it('opens normally with no saved settings, or settings from this version when it is the latest', () => {
    expect(decideVersion({ settings: null, build: '1.6.0', manifest, atRoot: true, ...at })).toEqual({ kind: 'current' });
    expect(decideVersion({ settings: '1.6.0', build: '1.6.0', manifest, atRoot: true, ...at })).toEqual({ kind: 'current' });
  });

  it('sends older settings to the version that saved them, keeping a share link', () => {
    expect(decideVersion({ settings: '1.4.0', build: '1.6.0', manifest, atRoot: true, search: '', hash: '#s=zA&v=1.6.0' })).toEqual({
      kind: 'redirect',
      url: `${versionUrl('1.4.0')}#s=zA&v=1.6.0`,
    });
  });

  it('offers the upgrade in that version every time, handing it to the latest', () => {
    expect(decideVersion({ settings: '1.4.0', build: '1.4.0', manifest, atRoot: false, ...at })).toEqual({
      kind: 'outdated',
      settings: '1.4.0',
      latest: '1.6.0',
      upgradeUrl: `${APP_URL}?upgrade`,
      prompt: false,
    });
  });

  it('asks straight away when the latest is opened to upgrade', () => {
    expect(decideVersion({ settings: '1.4.0', build: '1.6.0', manifest, atRoot: true, search: '?upgrade', hash: '' })).toEqual({
      kind: 'outdated',
      settings: '1.4.0',
      latest: '1.6.0',
      upgradeUrl: null,
      prompt: true,
    });
  });

  it('upgrades in place when there is no other version to open: offline, a downloaded file, an unhosted version', () => {
    expect(decideVersion({ settings: '1.4.0', build: '1.6.0', manifest: null, atRoot: true, ...at })).toMatchObject({ kind: 'outdated', upgradeUrl: null, prompt: false });
    expect(decideVersion({ settings: '1.3.0', build: '1.6.0', manifest, atRoot: true, ...at })).toMatchObject({ kind: 'outdated', upgradeUrl: null });
  });

  it('shows settings from a newer version without saving over them', () => {
    expect(decideVersion({ settings: '1.6.0', build: '1.4.0', manifest, atRoot: false, search: '', hash: '#s=zA' })).toEqual({
      kind: 'newer',
      settings: '1.6.0',
      latestUrl: `${APP_URL}#s=zA`,
    });
  });
});

describe('settings in the browser', () => {
  let store: typeof import('../state/store');
  beforeAll(async () => {
    const mem = new Map<string, string>();
    Object.assign(globalThis, {
      localStorage: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) },
    });
    store = await import('../state/store');
  });

  it('stamps new settings with this version and saves it', () => {
    const st = store.useStore.getState();
    expect(st.dataVersion).toBe(DATA_VERSION);
    st.createSetup('Trip');
    expect(store.storedVersion()).toBe(DATA_VERSION);
  });

  it('upgrades older settings, keeping them as the backup until the next upgrade, and can put them back', () => {
    store.useStore.setState({ dataVersion: '1.3.0' });
    const before = store.useStore.getState().setups;
    store.useStore.getState().upgradeSettings();
    let st = store.useStore.getState();
    expect(st.dataVersion).toBe(DATA_VERSION);
    expect(st.backup).toMatchObject({ version: '1.3.0', setups: before });
    st.restoreBackup();
    st = store.useStore.getState();
    expect(st.dataVersion).toBe('1.3.0');
    expect(st.setups).toBe(before);
  });

  it('never writes over settings while they belong to a newer version', () => {
    store.useStore.getState().upgradeSettings();
    const saved = localStorage.getItem(store.STORAGE_KEY);
    store.storageLock.readOnly = true;
    store.useStore.getState().createSetup('Not saved');
    expect(localStorage.getItem(store.STORAGE_KEY)).toBe(saved);
    store.storageLock.readOnly = false;
  });

  it('refuses to import setups saved by a newer version', () => {
    expect(() => store.useStore.getState().importSetups([newSetup('Future')], '99.0.0')).toThrow(/newer than this copy/);
    expect(store.useStore.getState().importSetups([newSetup('Old')], '1.3.0')).toBe(1);
  });
});
