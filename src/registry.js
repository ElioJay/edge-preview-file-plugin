(function () {
  const TPV = (window.TPV = window.TPV || {});
  const renderers = new Map();
  // Renderers that also claim files by name (e.g. .env.local). Checked after
  // extensions, so .env.yaml still opens as YAML.
  const namedRenderers = [];

  function baseNameOf(url) {
    try {
      const path = new URL(url).pathname;
      return path.slice(path.lastIndexOf('/') + 1);
    } catch {
      return '';
    }
  }

  function extensionOf(url) {
    const base = baseNameOf(url);
    const dot = base.lastIndexOf('.');
    return dot >= 0 ? base.slice(dot + 1).toLowerCase() : '';
  }

  TPV.registry = {
    register(renderer) {
      for (const extension of renderer.extensions) {
        renderers.set(extension.toLowerCase(), renderer);
      }
      if (renderer.filenames) namedRenderers.push(renderer);
    },
    getByUrl(url) {
      const byExtension = renderers.get(extensionOf(url));
      if (byExtension) return byExtension;
      const base = baseNameOf(url);
      return (
        namedRenderers.find((renderer) => renderer.filenames.test(base)) || null
      );
    },
    extensionOf,
  };
})();
