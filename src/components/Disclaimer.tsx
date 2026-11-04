import { useState } from 'react';
import { HelpDialog } from './HelpDialog';

const KEY = 'ute-load-estimator:disclaimer';

function acknowledged(): boolean {
  try {
    return localStorage.getItem(KEY) === 'acknowledged';
  } catch {
    return false;
  }
}

/** Shown until the viewer acknowledges once that the results are estimates to confirm on real scales. */
export function Disclaimer() {
  const [open, setOpen] = useState(() => !acknowledged());
  const [help, setHelp] = useState(false);
  if (!open) return null;
  return (
    <div className="disclaimer" role="alertdialog" aria-labelledby="disclaimer-title" aria-describedby="disclaimer-text">
      <div className="disclaimer-text">
        <strong id="disclaimer-title">This app gives estimates only.</strong>{' '}
        <span id="disclaimer-text">
          It works from the figures you enter and typical values, and it can be wrong. Before you head off, weigh your vehicle and trailer, loaded
          as you will travel, at a weighbridge or with a mobile weighing service using real scales, and check every result against your
          placards.
        </span>
      </div>
      <div className="disclaimer-actions">
        <button className="btn" onClick={() => setHelp(true)}>
          Show limitations
        </button>
        <button
          className="btn primary"
          autoFocus
          onClick={() => {
            try {
              localStorage.setItem(KEY, 'acknowledged');
            } catch {
              // Storage blocked: it shows again next time.
            }
            setOpen(false);
          }}
        >
          I understand
        </button>
      </div>
      {help && <HelpDialog onClose={() => setHelp(false)} />}
    </div>
  );
}
