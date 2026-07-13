const fs = require('fs');
const path = require('path');
const { composeClassicRuntime } = require('../../src/app/runtime/compose.ts');

const root = path.resolve(__dirname, '../..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const runtimeTemplate = read('src/app/runtime.ts');
const sliceFiles = [
  'src/app/runtime/classic.ts',
  'src/features/files/runtime.ts',
  'src/features/storage/runtime.ts',
  'src/features/waypoint/runtime.ts',
  'src/features/map/runtime.ts',
  'src/features/elevation/runtime.ts',
  'src/features/localization/runtime.ts',
  'src/features/escape/runtime.ts',
  'src/features/itinerary/runtime.ts',
  'src/features/measure/runtime.ts',
  'src/features/segment/runtime.ts',
  'src/features/trails/runtime.ts',
  'src/ui/orchestration/runtime.ts',
];
const sliceSources = sliceFiles.map(name => ({ name, source: read(name) }));
const runtimeSource = composeClassicRuntime(runtimeTemplate, sliceSources);

module.exports = { read, root, runtimeSource, runtimeTemplate, sliceFiles, sliceSources };
