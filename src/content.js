(function () {
  const TPV = window.TPV;
  if (!TPV || !TPV.registry || !TPV.app) return;
  if (document.documentElement.hasAttribute('data-tpv-enhanced')) return;

  function fileNameFromUrl(value) {
    try {
      const base = new URL(value).pathname.split('/').pop();
      return base ? decodeURIComponent(base) : '';
    } catch {
      return '';
    }
  }

  // Only restyle the browser's plain-text rendering. A .toml URL that
  // returns HTML is a normal page and must be left untouched.
  if (
    typeof document.contentType !== 'string' ||
    !document.contentType.startsWith('text/plain')
  ) {
    return;
  }

  const renderer = TPV.registry.getByUrl(location.href);
  if (!renderer) return;

  const pre = document.querySelector('pre');
  const text = pre ? pre.textContent : document.body.innerText;
  if (typeof text !== 'string' || text.length === 0) return;

  document.documentElement.setAttribute('data-tpv-enhanced', '1');

  TPV.app.renderPage({
    text,
    url: location.href,
    title:
      fileNameFromUrl(location.href) || document.title || 'untitled',
    renderer,
    download: false,
    note: text.length > 1024 * 1024 ? '文件较大，已关闭语法高亮。' : '',
  });
})();
