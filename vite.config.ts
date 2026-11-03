/// <reference types="vitest/config" />
import { copyFileSync, readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The build inlines all JS and CSS into one HTML file so the tool can be
// opened straight from disk (file://) in Chrome without a web server.
// That file is also copied to the repo root so it can be downloaded directly.
const RELEASE_FILE = 'vehicle-load-estimator.html';

const copyRelease = (): Plugin => ({
  name: 'copy-release-file',
  apply: 'build',
  closeBundle() {
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
