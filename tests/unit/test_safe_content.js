const assert = require('assert');
const path = require('path');
const fs = require('fs');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const source = ts.transpileModule(
  fs.readFileSync(path.join(root, 'src/ui/safe-content.ts'), 'utf8'),
  {compilerOptions:{module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2020}},
).outputText;
const moduleShim = {exports:{}};
new Function('module', 'exports', source)(moduleShim, moduleShim.exports);
const {escapeHtmlText, sanitizeExternalHttpUrl, sanitizeImageSource, sanitizeHexColor} = moduleShim.exports;

let passed = 0;
const test = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  PASS ${name}`);
};

console.log('\nSafe content boundaries');

test('HTML text escapes imported markup and attribute delimiters', () => {
  assert.strictEqual(
    escapeHtmlText(`<img src=x onerror="alert('x')"> & route`),
    '&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt; &amp; route',
  );
});

test('external links allow absolute HTTP(S) without credentials', () => {
  assert.strictEqual(sanitizeExternalHttpUrl('https://example.com/trail?a=1'), 'https://example.com/trail?a=1');
  assert.strictEqual(sanitizeExternalHttpUrl('javascript:alert(1)'), null);
  assert.strictEqual(sanitizeExternalHttpUrl('https://user:secret@example.com'), null);
  assert.strictEqual(sanitizeExternalHttpUrl('/relative/path'), null);
});

test('images allow raster data, blob, and HTTP(S) sources only', () => {
  assert.ok(sanitizeImageSource('data:image/png;base64,AAAA'));
  assert.strictEqual(sanitizeImageSource('data:image/svg+xml;base64,AAAA'), null);
  assert.strictEqual(sanitizeImageSource('javascript:alert(1)'), null);
  assert.strictEqual(sanitizeImageSource('file:///tmp/private.png'), null);
});

test('colors accept hex values and replace CSS payloads', () => {
  assert.strictEqual(sanitizeHexColor('#1E6F50'), '#1E6F50');
  assert.strictEqual(sanitizeHexColor('red;position:fixed'), '#64748b');
});

console.log(`\nResult: ${passed}/${passed} passed`);
