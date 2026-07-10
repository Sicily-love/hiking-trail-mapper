#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const runtimePath = path.join(root, 'src/app/runtime.js');
const source = await readFile(runtimePath, 'utf8');
const aliases = new Set(
  [...source.matchAll(/^([A-Za-z_$][\w$]*)\s*=\s*HTM_CORE\.[A-Za-z_$][\w$]*;/gm)]
    .map(match => match[1]),
);
const ast = ts.createSourceFile(runtimePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const removals = [];
ast.statements.forEach(statement => {
  if(!ts.isFunctionDeclaration(statement) || !statement.name || !aliases.has(statement.name.text)) return;
  let start = statement.getFullStart();
  while(start < statement.getStart() && source[start] === '\n') start += 1;
  removals.push({ start, end: statement.end, name: statement.name.text });
});

let output = source;
removals.sort((a, b) => b.start - a.start).forEach(removal => {
  output = output.slice(0, removal.start) + output.slice(removal.end);
});
if(output !== source) await writeFile(runtimePath, output.replace(/\n{4,}/g, '\n\n\n'));
console.log(`Removed ${removals.length} core fallback functions: ${removals.map(item => item.name).join(', ')}`);
