(function () {
  const TPV = (window.TPV = window.TPV || {});
  const renderers = new Map();

  function extensionOf(url) {
    try {
      const path = new URL(url).pathname;
      const base = path.slice(path.lastIndexOf('/') + 1);
      const dot = base.lastIndexOf('.');
      return dot >= 0 ? base.slice(dot + 1).toLowerCase() : '';
    } catch {
      return '';
    }
  }

  TPV.registry = {
    register(renderer) {
      for (const extension of renderer.extensions) {
        renderers.set(extension.toLowerCase(), renderer);
      }
    },
    getByUrl(url) {
      return renderers.get(extensionOf(url)) || null;
    },
    extensionOf,
  };
})();
