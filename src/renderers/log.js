(function () {
  window.TPV.registry.register({
    id: 'log',
    label: 'LOG',
    language: 'log',
    // Above the default 1 MB; highlighting 5 MB already blocks the page for
    // about 5 seconds.
    highlightLimit: 5 * 1024 * 1024,
    // Same as TXT. background.js keeps its own copy of this limit.
    maxBytes: 50 * 1024 * 1024,
    extensions: ['log'],
  });
})();
