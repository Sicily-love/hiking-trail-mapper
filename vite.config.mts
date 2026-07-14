import { defineConfig } from 'vite';

const FFLATE_UMD_HEADER = "!function(f){typeof module!='undefined'&&typeof exports=='object'?module.exports=f():typeof define!='undefined'&&define.amd?define(f):(typeof self!='undefined'?self:this).fflate=f()}";

export default defineConfig({
  root: '.',
  base: './',
  publicDir: 'public',
  plugins: [{
    name: 'vendored-browser-globals',
    enforce: 'pre',
    transform(code, id) {
      if(!id.endsWith('/src/vendor/fflate.js')) return null;
      if(!code.startsWith(FFLATE_UMD_HEADER)) {
        throw new Error('Unexpected fflate UMD header');
      }
      return code.replace(FFLATE_UMD_HEADER, '!function(f){globalThis.fflate=f()}');
    },
  }],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: 'index.html',
    },
  },
});
