#!/usr/bin/env node
import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const tests = readdirSync(directory)
  .filter(name => /^test_.*\.js$/.test(name))
  .sort((left, right) => left.localeCompare(right));

for(const test of tests) {
  const result = spawnSync(process.execPath, [path.join(directory, test)], {stdio:'inherit'});
  if(result.status !== 0) process.exit(result.status || 1);
}

console.log(`\nUnit suites: ${tests.length}/${tests.length} passed`);
