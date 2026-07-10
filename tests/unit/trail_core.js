/**
 * Compatibility bridge for existing CommonJS unit tests.
 *
 * The pure core implementation now lives in src/core/*.ts. Node 24 can load
 * TypeScript files directly via type stripping, so the older tests keep their
 * require('./trail_core') entry while the implementation has a single source.
 */
module.exports = require('../../src/core/index.ts');
