const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const runtimeSource = read('src/app/runtime/studio.ts');

module.exports = { read, root, runtimeSource };
