#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateReleaseHtml } from './generate_release_html.mjs';

const modulePath = fileURLToPath(import.meta.url);
const defaultRoot = path.resolve(path.dirname(modulePath), '../..');
export async function syncCoreBundle({ root = defaultRoot, check = false } = {}) {
  const result = await generateReleaseHtml({ root, check });
  return { changed: result.changed, digest: result.coreDigest };
}

const direct = process.argv[1] && path.resolve(process.argv[1]) === modulePath;
if(direct) {
  await syncCoreBundle({ check: process.argv.includes('--check') });
}
