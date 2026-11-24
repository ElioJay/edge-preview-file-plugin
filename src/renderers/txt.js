(function () {
  window.TPV.registry.register({
    id: 'txt',
    label: 'TXT',
    // No Prism grammar: shown as plain text, without the highlight toggle.
    language: null,
    // Larger files are left to the browser's own view or a normal download.
    // background.js keeps its own copy of this limit.
    maxBytes: 50 * 1024 * 1024,
    extensions: ['txt'],
  });
})();
