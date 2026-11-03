import { useState } from 'react';
import { REPO_URL } from '../build';
import { DATA_VERSION, stepsBetween } from '../model/versions';
import { useStore } from '../state/store';
import { useUi } from '../state/ui';
import { APP_URL } from '../build';
import { bannerDismissed, dismissBanner, isRoot, versionState, type VersionState } from '../state/versioning';
import { Modal } from './Modal';

/** What upgrading changes, step by step; only the latest version knows every step. */
function UpgradeNotes({ from }: { from: string }) {
  const steps = stepsBetween(from);
  if (!steps.length) return <p className="about-note">Nothing you have saved changes: your settings are only marked as upgraded.</p>;
  return (
    <ul className="upgrade-notes">
      {steps.map((s) => (
        <li key={s.version}>
          <strong>{s.version}</strong>
          <ul>
            {s.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function UpgradeDialog({ state, onClose, onUpgraded }: { state: Extract<VersionState, { kind: 'outdated' }>; onClose: () => void; onUpgraded: () => void }) {
  const upgradeSettings = useStore((s) => s.upgradeSettings);
  return (
    <Modal
      title={`Upgrade your settings to ${state.latest}?`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Not now
          </button>
          <button
            className="btn primary"
            onClick={() => {
              upgradeSettings();
              versionState.current = { kind: 'current' };
              // An older hosted copy hands over to the latest at the root; the root just carries on.
              if (!isRoot()) location.replace(APP_URL);
              else {
                history.replaceState(null, '', location.pathname + location.hash);
                useUi.getState().showToast(`Settings upgraded to ${DATA_VERSION}. The old ones are kept as a backup in About.`);
                onUpgraded();
              }
            }}
          >
            Upgrade
          </button>
        </>
      }
    >
      <p className="share-text">
        Your settings were saved with version <strong>{state.settings}</strong>. Upgrading brings every setup up to {state.latest}, one release at a
        time:
      </p>
      <UpgradeNotes from={state.settings} />
      <p className="about-note">Your current settings are kept as a backup until the next upgrade, and can be restored from About.</p>
    </Modal>
  );
}

/** Shown every time the site opens with settings saved by another version, until they are upgraded. */
export function VersionBanner() {
  const [state, setState] = useState(versionState.current);
  const [hidden, setHidden] = useState(() => bannerDismissed(state));
  const [asking, setAsking] = useState(state.kind === 'outdated' && state.prompt);
  if (state.kind === 'current' || state.kind === 'redirect') return null;
  const notNow = () => {
    dismissBanner(state);
    setHidden(true);
  };
  if (state.kind === 'newer') {
    return hidden ? null : (
      <div className="version-banner newer" role="alert">
        <div className="vb-text">
          <strong>Your settings were saved with version {state.settings}</strong>, newer than this copy ({DATA_VERSION}). You can look around, but
          nothing you change here is saved.
        </div>
        <a className="btn primary" href={state.latestUrl}>
          Open the latest version
        </a>
        <button className="btn" onClick={notNow}>
          Not now
        </button>
      </div>
    );
  }
  const releases = stepsBetween(state.settings).length;
  return (
    <>
      {!hidden && (
        <div className="version-banner" role="status">
          <div className="vb-text">
            <strong>Version {state.latest} is available.</strong> Your settings are from {state.settings}
            {state.upgradeUrl === null && releases ? ` (${releases} update${releases === 1 ? '' : 's'} to apply)` : ''}.{' '}
            <a href={`${REPO_URL}/releases`} target="_blank" rel="noreferrer">
              What's new
            </a>
          </div>
          <button className="btn primary" onClick={() => (state.upgradeUrl ? location.assign(state.upgradeUrl) : setAsking(true))}>
            Upgrade
          </button>
          <button className="btn" onClick={notNow}>
            Not now
          </button>
        </div>
      )}
      {asking && (
        <UpgradeDialog
          state={state}
          onUpgraded={() => {
            setAsking(false);
            setState({ kind: 'current' });
          }}
          onClose={() => {
            setAsking(false);
            // Asked for from an older copy: going back to it keeps the settings as they are.
            if (state.prompt && versionState.current.kind !== 'current') history.back();
          }}
        />
      )}
    </>
  );
}
