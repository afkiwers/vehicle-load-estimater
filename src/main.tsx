import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { storageLock, storedVersion } from './state/store';
import { FRESH_PARAM, decideVersion, isRoot, loadManifest, versionState } from './state/versioning';
import './styles.css';

// Settings saved with an older version open in that version; ones saved with a newer version are
// shown but never overwritten. Decided before anything renders, so nothing is saved in between.
async function start() {
  const settings = storedVersion();
  const atRoot = isRoot();
  // The root also checks it isn't a stale cached copy of an older release.
  const manifest = settings || atRoot ? await loadManifest() : null;
  const state = decideVersion({ settings, manifest, atRoot, search: location.search, hash: location.hash });
  if (state.kind === 'redirect') {
    location.replace(state.url);
    return;
  }
  // The cache-busting reload has done its job: tidy the address.
  const params = new URLSearchParams(location.search);
  if (params.has(FRESH_PARAM)) {
    params.delete(FRESH_PARAM);
    const rest = params.toString().replace(/=(?=&|$)/g, '');
    history.replaceState(null, '', location.pathname + (rest ? `?${rest}` : '') + location.hash);
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
