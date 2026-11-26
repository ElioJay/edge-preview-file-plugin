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

  // Only restyle the browser's plain-text rendering, which Edge also uses for
  // the YAML, log, Markdown and shell text types below. A matching URL that
  // returns HTML is a normal page and must be left untouched.
  const PLAIN_TEXT_TYPES = [
    'text/plain',
    'text/yaml',
    'text/x-yaml',
    'text/x-log',
    'text/log',
    'text/markdown',
    'text/x-markdown',
    'text/x-sh',
    'text/x-shellscript',
  ];
  if (!PLAIN_TEXT_TYPES.includes(document.contentType)) return;

  const renderer = TPV.registry.getByUrl(location.href);
  if (!renderer) return;

  const pre = document.querySelector('pre');
  const shown = pre ? pre.textContent : document.body.innerText;
  if (typeof shown !== 'string' || shown.length === 0) return;

  // Over the renderer's limit, keep the browser's native view. A decoded
  // string never has more UTF-16 code units than the file has bytes, so the
  // length alone can reject huge files before anything is fetched or encoded.
  if (renderer.maxBytes && shown.length > renderer.maxBytes) return;

  // Edge decoded the page with the declared charset or its own guess. Unless
  // that produced clean UTF-8, fetch the bytes again and apply the UTF-8 / GBK
  // rule in src/decode.js.
  const cleanUtf8 =
    document.characterSet.toUpperCase() === 'UTF-8' && !shown.includes('�');

  function redecode() {
    return fetch(location.href)
      .then((response) => {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const type = response.headers.get('content-type');
        return response.arrayBuffer().then((buffer) => ({
          text: TPV.decodeText(new Uint8Array(buffer), type),
          size: buffer.byteLength,
        }));
      })
      .catch(() => ({ text: shown, size: null }));
  }

  const loaded = cleanUtf8
    ? Promise.resolve({ text: shown, size: null })
    : redecode();

  loaded.then(({ text, size }) => {
    if (
      renderer.maxBytes &&
      (size ?? new TextEncoder().encode(text).length) > renderer.maxBytes
    ) {
      return;
    }

    document.documentElement.setAttribute('data-tpv-enhanced', '1');

    TPV.app.renderPage({
      text,
      url: location.href,
      title:
        fileNameFromUrl(location.href) || document.title || 'untitled',
      renderer,
      download: false,
      note:
        renderer.language && text.length > TPV.app.highlightLimit(renderer)
          ? '文件较大，已关闭语法高亮。'
          : '',
    });
  });
})();
