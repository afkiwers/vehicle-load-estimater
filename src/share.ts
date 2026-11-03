// Share links carry a whole setup inside the link: compressed JSON after "#s=", and the version of
// the app that made it after "&v=". Nothing is uploaded, and the part after "#" never reaches a web server.

import type { Setup } from './model/types';
import { DATA_VERSION, relation, savedWith, upgradeSetup } from './model/versions';
import { APP_URL } from './build';

async function through(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

function toBase64Url(bytes: Uint8Array): string {
  let text = '';
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/** The setup as link text: "z" + deflated JSON, or "j" + plain JSON where the browser can't compress. */
export async function encodeSetup(setup: Setup): Promise<string> {
  const shared: Partial<Setup> = structuredClone(setup);
  // The person opening it gets their own copy.
  delete shared.id;
  delete shared.updatedAt;
  const json = new TextEncoder().encode(JSON.stringify(shared));
  if (typeof CompressionStream === 'function') return `z${toBase64Url(await through(json, new CompressionStream('deflate-raw')))}`;
  return `j${toBase64Url(json)}`;
}

/**
 * The setup in a link, brought up to this version if an older one made it. A link made by a newer
 * version than this copy can't be read safely, so it is refused.
 */
export async function decodeSetup(payload: string, version: string | null = null): Promise<Setup> {
  const madeWith = savedWith(version);
  if (relation(madeWith) === 'newer') {
    throw new Error(`This link was made with version ${madeWith}, newer than this copy (${DATA_VERSION}). Open it in the latest version.`);
  }
  const data = fromBase64Url(payload.slice(1));
  let bytes: Uint8Array;
  if (payload[0] === 'z') bytes = await through(data, new DecompressionStream('deflate-raw'));
  else if (payload[0] === 'j') bytes = data;
  else throw new Error('Not a share link from this tool.');
  const raw = JSON.parse(new TextDecoder().decode(bytes));
  if (!raw || typeof raw !== 'object' || !raw.ute || !raw.caravan) throw new Error('Not a setup from this tool.');
  return upgradeSetup(raw, madeWith);
}

const LINK = /^#?s=([A-Za-z0-9_-]+)(?:&v=([0-9][0-9.]*))?$/;

/** The setup part of a page address's "#s=..." fragment, if it has one. */
export function sharePayload(hash: string): string | null {
  return LINK.exec(hash)?.[1] ?? null;
}

/** The version of the app that made a share link; null for links made before links carried it. */
export function shareVersion(hash: string): string | null {
  return LINK.exec(hash)?.[2] ?? null;
}

/** Links point at the page this copy runs from, or at the online app from a downloaded file. */
export function shareUrl(payload: string, where: { protocol: string; origin: string; pathname: string }): string {
  const base = where.protocol === 'file:' ? APP_URL : `${where.origin}${where.pathname}`;
  return `${base}#s=${payload}&v=${DATA_VERSION}`;
}
