(function () {
  let baseUrl = null;

  // Resolve relative links and images against the file while sanitizing. The
  // viewer is a chrome-extension:// page, and the output must already carry
  // the final URLs so nothing is requested from the extension itself.
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    for (const name of ['href', 'src']) {
      const value = node.getAttribute(name);
      if (value === null || value.startsWith('#')) continue;
      try {
        node.setAttribute(name, new URL(value, baseUrl).href);
      } catch {
        // Leave values URL() cannot parse as they are.
      }
    }
  });

  // In place the document belongs to the file's own site, so markup from the
  // file must be sanitized: script or event-handler attributes would run on
  // that site. Use the string output and let the page parse it again: in a
  // content script, nodes returned with RETURN_DOM_FRAGMENT kept a removed
  // onerror handler and ran it once adopted (caught by tests/e2e.cjs).
  function render(text, url) {
    baseUrl = url;
    const article = document.createElement('article');
    article.className = 'tpv-markdown';
    article.innerHTML = DOMPurify.sanitize(marked.parse(text));
    return article;
  }

  window.TPV.registry.register({
    id: 'markdown',
    label: 'MD',
    language: 'markdown',
    extensions: ['md', 'markdown'],
    render,
  });
})();
