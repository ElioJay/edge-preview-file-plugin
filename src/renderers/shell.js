(function () {
  window.TPV.registry.register({
    id: 'shell',
    label: 'SHELL',
    language: 'bash',
    // Self-extracting installers (Miniconda, Anaconda) are .sh files of
    // hundreds of MB, so shell scripts share the TXT / LOG limit.
    // background.js keeps its own copy of this limit.
    maxBytes: 50 * 1024 * 1024,
    extensions: ['sh', 'bash', 'zsh'],
  });
})();
