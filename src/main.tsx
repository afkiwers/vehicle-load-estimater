import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { storageLock, storedVersion } from './state/store';
import { decideVersion, isRoot, loadManifest, versionState } from './state/versioning';
import './styles.css';

// Settings saved with an older version open in that version; ones saved with a newer version are
// shown but never overwritten. Decided before anything renders, so nothing is saved in between.
async function start() {
  const settings = storedVersion();
  const manifest = settings ? await loadManifest() : null;
  const state = decideVersion({ settings, manifest, atRoot: isRoot(), search: location.search, hash: location.hash });
  if (state.kind === 'redirect') {
    location.replace(state.url);
    return;
  }
  storageLock.readOnly = state.kind === 'newer';
  versionState.current = state;
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start();
