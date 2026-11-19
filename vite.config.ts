/// <reference types="vitest/config" />
import { createHash } from 'node:crypto';
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The build inlines all JS and CSS into one HTML file so the tool can be
// opened straight from disk (file://) in Chrome without a web server.
// That file is also copied to the repo root so it can be downloaded directly.
const RELEASE_FILE = 'vehicle-load-estimator.html';

// GitHub Pages can't send response headers, so the Content-Security-Policy goes in the page. Every script is
// inline (the app, and the analytics snippet), so each one is allowed by its hash, worked out from the
// finished file. React sets style attributes, which need 'unsafe-inline' for styles.
// Not possible in a <meta> policy, so left out: frame-ancestors, report-uri, sandbox.
const ANALYTICS = 'https://plausible.iwers.synology.me';

export function contentSecurityPolicy(html: string): string {
  const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)]
    .filter(([, attrs]) => !/type=["']?application\/ld\+json/.test(attrs))
    .map(([, , body]) => `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
  return [
    "default-src 'self'",
    `script-src 'self' ${ANALYTICS} ${hashes.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    // The home screen icon is linked by its full address, so copies opened from disk or another host find it too.
    "img-src 'self' data: blob: https://afkiwers.github.io",
    "font-src 'self' data:",
    `connect-src 'self' https://api.github.com ${ANALYTICS}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

const copyRelease = (): Plugin => ({
  name: 'copy-release-file',
  apply: 'build',
  closeBundle() {
    const html = readFileSync('dist/index.html', 'utf8');
    // Before every script, so it covers them all.
    const meta = `<meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy(html)}" />`;
    writeFileSync('dist/index.html', html.replace(/(<meta charset="UTF-8"\s*\/?>)/i, `$1\n    ${meta}`));
    copyFileSync('dist/index.html', RELEASE_FILE);
  },
});

// The release workflow stamps its builds with the tag, commit and dates. Other builds
// stay unstamped, so building the same source always gives the same file.
const build = {
  version: process.env.APP_VERSION || null,
  commit: process.env.APP_COMMIT || null,
  commitDate: process.env.APP_COMMIT_DATE || null,
  buildDate: process.env.APP_BUILD_DATE || null,
};

// The version settings are saved under: package.json's, which the release workflow keeps equal to the tag.
const dataVersion = JSON.parse(readFileSync('package.json', 'utf8')).version as string;

export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile(), copyRelease()],
  define: {
    __BUILD__: JSON.stringify(build),
    __DATA_VERSION__: JSON.stringify(dataVersion),
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 4000,
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
