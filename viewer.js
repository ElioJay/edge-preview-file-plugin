(function () {
  const TPV = window.TPV;
  const app = document.getElementById('app');
  const src = new URLSearchParams(location.search).get('src');

  document.documentElement.classList.add('tpv-active');

  function fileName(url) {
    try {
      const base = new URL(url).pathname.split('/').pop() || 'untitled';
      return decodeURIComponent(base);
    } catch {
      return 'untitled';
    }
  }

  function download(url) {
    chrome.runtime.sendMessage({ type: 'download', url }, () => {
      void chrome.runtime.lastError;
    });
  }

  // Stops reading once the body passes maxBytes, so an oversized file is never
  // fully loaded. Content-Length is not trusted: it may be missing or count
  // compressed bytes.
  async function readText(response, maxBytes) {
    if (!maxBytes) return response.text();
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        reader.cancel().catch(() => {});
        const error = new Error('file too large');
        error.name = 'TooLargeError';
        throw error;
      }
      chunks.push(value);
    }
    return new Response(new Blob(chunks)).text();
  }

  function showError(title, detail, url) {
    const wrap = TPV.app.el('div', 'tpv-error');
    wrap.appendChild(TPV.app.el('div', 'tpv-error-title', title));
    if (detail) wrap.appendChild(TPV.app.el('div', 'tpv-error-detail', detail));
    if (url) wrap.appendChild(TPV.app.el('code', 'tpv-error-url', url));

    const actions = TPV.app.el('div', 'tpv-error-actions');
    const retry = TPV.app.el('button', 'tpv-btn', '重试');
    retry.type = 'button';
    retry.addEventListener('click', () => location.reload());
    actions.appendChild(retry);

    if (url) {
      const downloadButton = TPV.app.el('button', 'tpv-btn', '下载原文件');
      downloadButton.type = 'button';
      downloadButton.addEventListener('click', () => download(url));
      actions.appendChild(downloadButton);
    }

    wrap.appendChild(actions);
    app.replaceChildren(wrap);
  }

  if (!src) {
    showError('缺少文件地址', '请从一个 .toml / .yaml / .yml / .txt / .log / .env 下载链接重新打开预览。');
    return;
  }

  let parsed;
  try {
    parsed = new URL(src);
  } catch {
    showError('文件地址无效', '', src);
    return;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    showError('不支持的地址类型', '预览器只支持 http/https 地址。', src);
    return;
  }

  const name = fileName(src);
  const renderer = TPV.registry.getByUrl(src);
  document.title = name + ' · Preview Any File';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  fetch(src, { credentials: 'include', signal: controller.signal })
    .then((response) => {
      if (!response.ok) {
        throw new Error('HTTP ' + response.status + ' ' + response.statusText);
      }
      const type = (response.headers.get('content-type') || '').toLowerCase();
      return readText(response, renderer && renderer.maxBytes).then(
        (text) => ({ text, type })
      );
    })
    .then(({ text, type }) => {
      clearTimeout(timer);
      const isHtml = type.includes('text/html');
      TPV.app.renderPage({
        text,
        url: src,
        title: name,
        renderer: isHtml ? null : renderer,
        container: app,
        download: true,
        note: isHtml
          ? '服务器返回的是 HTML 页面（可能需要登录），已按原文显示。'
          : '',
      });
    })
    .catch((error) => {
      clearTimeout(timer);
      if (error && error.name === 'TooLargeError') {
        const limit = Math.round(renderer.maxBytes / (1024 * 1024)) + ' MB';
        showError(
          '文件过大',
          '文件超过 ' + limit + '，不在查看器中打开，请下载原文件查看。',
          src
        );
        return;
      }
      const message =
        error && error.name === 'AbortError'
          ? '请求超时（20 秒）。'
          : String((error && error.message) || error);
      showError('无法读取该文件', message, src);
    });
})();
