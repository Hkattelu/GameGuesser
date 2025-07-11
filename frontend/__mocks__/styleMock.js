/**
* Simple stub that Jest will use whenever a `.css` (or similar) file is
* imported.  It returns an empty proxy object so className look-ups don't
* crash tests.
*/
module.exports = new Proxy(
  {},
  {
    get: (target, prop) => (typeof prop === 'string' ? prop : ''),
  },
);
