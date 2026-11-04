import { useEffect, useState, version as reactVersion } from 'react';
import { REVISION } from 'three';
import { APP_URL, BUILD, LATEST_RELEASE_API, REPO_URL, isNewer, versionReport, versionRows } from '../build';
import { CopyIcon, copy } from './clipboard';
import { HelpDialog } from './HelpDialog';
import { Modal } from './Modal';
import { useStore } from '../state/store';
import { isRoot } from '../state/versioning';

type Latest = { state: 'checking' } | { state: 'failed' } | { state: 'found'; tag: string; url: string };

/** Asks GitHub for the latest release; only when the dialog opens, and quietly gives up offline. */
function useLatestRelease(): Latest {
  const [latest, setLatest] = useState<Latest>({ state: 'checking' });
  useEffect(() => {
    const abort = new AbortController();
    fetch(LATEST_RELEASE_API, { signal: abort.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: { tag_name: string; html_url: string }) => setLatest({ state: 'found', tag: d.tag_name, url: d.html_url }))
      .catch(() => !abort.signal.aborted && setLatest({ state: 'failed' }));
    return () => abort.abort();
  }, []);
  return latest;
}

function UpdateBadge({ latest }: { latest: Latest }) {
  if (latest.state === 'checking') return <span className="about-note">Checking for updates…</span>;
  if (latest.state === 'failed') return <span className="about-note">Couldn't check for updates</span>;
  if (!BUILD.version) {
    return (
      <a className="badge badge-dev" href={latest.url} target="_blank" rel="noreferrer" title="This copy was not built from a release">
        Development build · latest {latest.tag}
      </a>
    );
  }
  return isNewer(latest.tag, BUILD.version) ? (
    <a className="badge badge-update" href={location.protocol === 'file:' ? latest.url : APP_URL} target="_blank" rel="noreferrer" title={`${latest.tag} is out`}>
      Update available
    </a>
  ) : (
    <span className="badge badge-current">Up to date</span>
  );
}

const LINKS = [
  { label: 'Online app', href: APP_URL },
  { label: 'Source code', href: REPO_URL },
  { label: 'Releases and downloads', href: `${REPO_URL}/releases` },
  { label: 'Report a problem', href: `${REPO_URL}/issues/new` },
];

/** Which version the settings were saved with, and the backup kept from before the last upgrade. */
function SettingsSection({ onClose }: { onClose: () => void }) {
  const dataVersion = useStore((s) => s.dataVersion);
  const backup = useStore((s) => s.backup);
  const restoreBackup = useStore((s) => s.restoreBackup);
  return (
    <>
      <div className="about-section">
        <h3>Your settings</h3>
      </div>
      <p className="about-note">
        Saved with version <strong>{dataVersion}</strong>.
        {backup
          ? ` Before the last upgrade they were from ${backup.version}; that copy (${backup.order.length} setup${backup.order.length === 1 ? '' : 's'}, upgraded ${new Date(backup.at).toLocaleDateString('en-AU')}) is kept until the next upgrade.`
          : ''}
      </p>
      {backup && (
        <div className="btn-row" style={{ marginBottom: 12 }}>
          <button
            className="btn"
            onClick={() => {
              if (!confirm(`Put back your settings from version ${backup.version}? Your current setups are replaced; the site then opens in version ${backup.version} and offers the upgrade again.`)) return;
              restoreBackup();
              onClose();
              // The restored settings belong to the older version: let the site open it.
              location.assign(isRoot() ? location.pathname : APP_URL);
            }}
          >
            Restore settings from {backup.version}
          </button>
        </div>
      )}
    </>
  );
}

export function AboutDialog({ onClose }: { onClose: () => void }) {
  const latest = useLatestRelease();
  const [help, setHelp] = useState(false);
  const rows = versionRows(BUILD, { react: reactVersion, three: REVISION, protocol: location.protocol, host: location.host });

  if (help) return <HelpDialog onClose={() => setHelp(false)} />;

  return (
    <Modal
      title="About Vehicle Load Estimator"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={() => copy(versionReport(rows, navigator.userAgent), 'Version information')}>
            <CopyIcon /> Copy version information
          </button>
          <button className="btn primary" onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      <div className="about-help">
        <div>
          <strong>How it works, assumptions and limitations</strong>
          <p className="about-note">What the numbers rest on, what is assumed and what is left out.</p>
        </div>
        <button className="btn btn-outline" onClick={() => setHelp(true)}>
          Open help
        </button>
      </div>

      <div className="about-section">
        <h3>Version information</h3>
        <UpdateBadge latest={latest} />
      </div>
      <table className="about-table">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th>{r.label}</th>
              <td>
                {r.href ? (
                  <a href={r.href} target="_blank" rel="noreferrer">
                    {r.value}
                  </a>
                ) : (
                  r.value
                )}
              </td>
              <td className="about-copy">
                {r.value !== '–' && (
                  <button className="icon-btn" onClick={() => copy(r.value, r.label)} title={`Copy ${r.label.toLowerCase()}`} aria-label={`Copy ${r.label.toLowerCase()}`}>
                    <CopyIcon />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <SettingsSection onClose={onClose} />

      <div className="about-section">
        <h3>Links</h3>
      </div>
      <table className="about-table">
        <tbody>
          {LINKS.map((l) => (
            <tr key={l.label}>
              <th>{l.label}</th>
              <td colSpan={2}>
                <a href={l.href} target="_blank" rel="noreferrer">
                  {l.href.replace(/^https:\/\//, '')}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="about-section">
        <h3>Privacy</h3>
      </div>
      <p className="about-note">
        Visits to the online page are counted with{' '}
        <a href="https://plausible.io" target="_blank" rel="noreferrer">
          Plausible Analytics
        </a>
        , which uses no cookies and collects no personal data. Your setups stay in your browser: neither they nor share links are sent, and copies
        opened from a downloaded file are not counted.
      </p>
      <p className="about-note">
        Free software: you can redistribute and modify it under the GNU General Public License, version 3 or any later version. It comes with
        absolutely no warranty.
      </p>
    </Modal>
  );
}
