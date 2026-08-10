const assert = require('assert');
const {canRegisterStudioServiceWorker, registerStudioServiceWorker} = require('../../src/adapters/pwa.ts');

(async () => {
  console.log('\nPWA adapter');
  const calls = [];
  const secureWindow = {
    location:{protocol:'https:', hostname:'sicily-love.github.io', href:'https://sicily-love.github.io/hiking-trail-mapper/'},
    navigator:{serviceWorker:{
      register:async (url, options) => {
        calls.push({url, options});
        return {scope:'https://sicily-love.github.io/hiking-trail-mapper/'};
      },
    }},
  };
  assert.strictEqual(canRegisterStudioServiceWorker(secureWindow), true);
  assert.strictEqual(canRegisterStudioServiceWorker({
    ...secureWindow,
    location:{protocol:'http:', hostname:'127.0.0.1', href:'http://127.0.0.1:4173/'},
  }), true);
  const registration = await registerStudioServiceWorker(secureWindow);
  assert.ok(registration);
  assert.deepStrictEqual(calls, [{
    url:'https://sicily-love.github.io/hiking-trail-mapper/service-worker.js',
    options:{scope:'./'},
  }]);
  const fileWindow = {
    location:{protocol:'file:', hostname:'', href:'file:///tmp/hiking-trail-mapper.html'},
    navigator:{serviceWorker:secureWindow.navigator.serviceWorker},
  };
  assert.strictEqual(canRegisterStudioServiceWorker(fileWindow), false);
  assert.strictEqual(await registerStudioServiceWorker(fileWindow), null);
  console.log('  PASS secure Pages registration and single-file fallback');
  console.log('Result: 1/1 passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
