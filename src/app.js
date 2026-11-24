(function () {
  const TPV = (window.TPV = window.TPV || {});
  const MAX_HIGHLIGHT_LENGTH = 1024 * 1024;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function highlight(text, language) {
    if (text.length > MAX_HIGHLIGHT_LENGTH) return null;
    if (!window.Prism || !Prism.languages[language]) return null;
    try {
      return Prism.highlight(text, Prism.languages[language], language);
    } catch {
      return null;
    }
  }

  function fallbackCopy(value) {
    const area = el('textarea');
    area.value = value;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }

  function copyText(value) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard
        .writeText(value)
        .then(() => true, () => fallbackCopy(value));
    }
    return Promise.resolve(fallbackCopy(value));
  }

  function build({ text, url, title, renderer, download, note }) {
    const root = el('div', 'tpv-root');
    const header = el('header', 'tpv-header');

    const titleBox = el('div', 'tpv-title');
    if (renderer) titleBox.appendChild(el('span', 'tpv-badge', renderer.label));
    titleBox.appendChild(el('span', 'tpv-filename', title || 'untitled'));
    const lineCount = text.split('\n').length;
    const byteCount = new TextEncoder().encode(text).length;
    titleBox.appendChild(
      el('span', 'tpv-meta', lineCount + ' 行 · ' + formatBytes(byteCount))
    );
    header.appendChild(titleBox);

    const actions = el('div', 'tpv-actions');
    header.appendChild(actions);

    const copyButton = el('button', 'tpv-btn', '复制');
    copyButton.type = 'button';
    copyButton.addEventListener('click', () => {
      copyText(text).then((ok) => {
        copyButton.textContent = ok ? '已复制' : '复制失败';
        setTimeout(() => {
          copyButton.textContent = '复制';
        }, 1200);
      });
    });
    actions.appendChild(copyButton);

    const html = renderer ? highlight(text, renderer.language) : null;
    const code = el('code');
    let raw = html === null;
    if (raw) {
      code.textContent = text;
    } else {
      code.innerHTML = html;
    }

    if (!raw) {
      const toggle = el('button', 'tpv-btn', '原始文本');
      toggle.type = 'button';
      toggle.addEventListener('click', () => {
        raw = !raw;
        if (raw) {
          code.textContent = text;
        } else {
          code.innerHTML = html;
        }
        toggle.textContent = raw ? '高亮' : '原始文本';
      });
      actions.appendChild(toggle);
    }

    if (download && typeof chrome !== 'undefined' && chrome.runtime) {
      const downloadButton = el('button', 'tpv-btn', '下载原文件');
      downloadButton.type = 'button';
      downloadButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'download', url }, (response) => {
          void chrome.runtime.lastError;
          downloadButton.textContent =
            response && response.ok ? '已开始下载' : '下载失败';
          setTimeout(() => {
            downloadButton.textContent = '下载原文件';
          }, 1500);
        });
      });
      actions.appendChild(downloadButton);
    }

    root.appendChild(header);

    if (note) root.appendChild(el('div', 'tpv-note', note));

    const main = el('main', 'tpv-main');
    const wrap = el('div', 'tpv-code-wrap');
    const gutter = el('div', 'tpv-gutter');
    gutter.textContent = Array.from(
      { length: lineCount },
      (_, index) => index + 1
    ).join('\n');
    const pre = el('pre', 'tpv-code');
    pre.appendChild(code);
    wrap.appendChild(gutter);
    wrap.appendChild(pre);
    main.appendChild(wrap);
    root.appendChild(main);

    return root;
  }

  TPV.app = {
    renderPage(options) {
      const target = options.container || document.body;
      target.replaceChildren(build(options));
      document.documentElement.classList.add('tpv-active');
    },
    el,
  };
})();
