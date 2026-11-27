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

  function highlightLimit(renderer) {
    return renderer.highlightLimit || MAX_HIGHLIGHT_LENGTH;
  }

  function highlight(text, renderer) {
    if (text.length > highlightLimit(renderer)) return null;
    const language = renderer.language;
    if (!window.Prism || !Prism.languages[language]) return null;
    try {
      return Prism.highlight(text, Prism.languages[language], language);
    } catch {
      return null;
    }
  }

  // Must match contain-intrinsic-size of .tpv-lines > div in viewer.css.
  const LINES_PER_CHUNK = 200;

  function escapeHtml(value) {
    return value.replace(/[&<]/g, (c) => (c === '&' ? '&amp;' : '&lt;'));
  }

  // Splits Prism's HTML into lines. A token can span lines (multi-line
  // strings, comments), so the spans open at a line break are closed there
  // and reopened on the next line.
  function splitLines(html) {
    const lines = [];
    const open = [];
    let line = '';
    let last = 0;
    for (const match of html.matchAll(/<span[^>]*>|<\/span>|\n/g)) {
      line += html.slice(last, match.index);
      last = match.index + match[0].length;
      if (match[0] === '\n') {
        lines.push(line + '</span>'.repeat(open.length));
        line = open.join('');
        continue;
      }
      if (match[0] === '</span>') open.pop();
      else open.push(match[0]);
      line += match[0];
    }
    lines.push(line + html.slice(last));
    return lines;
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

    const notes = note ? [note] : [];

    // What the code view and the copy button show: the file text, or its
    // formatted form for renderers with format() (JSON).
    let shown = text;
    let html = null;
    let raw = false;
    // Renderers with a rendered view (Markdown) open on it; the code view is
    // one click away.
    const preview =
      renderer && renderer.render ? renderer.render(text, url) : null;
    let source = preview === null;

    const button = (label, onClick) => {
      const node = el('button', 'tpv-btn', label);
      node.type = 'button';
      node.addEventListener('click', onClick);
      actions.appendChild(node);
      return node;
    };

    const copyButton = button('复制', () => {
      copyText(shown).then((ok) => {
        copyButton.textContent = ok ? '已复制' : '复制失败';
        setTimeout(() => {
          copyButton.textContent = '复制';
        }, 1200);
      });
    });

    const viewButton =
      preview &&
      button('', () => {
        source = !source;
        layout();
      });

    let formatted = null;
    if (renderer && renderer.format) {
      try {
        formatted = renderer.format(text);
      } catch (error) {
        notes.push(error.message);
      }
    }
    const formatButton =
      formatted !== null &&
      formatted !== text.trim() &&
      button('', () => {
        show(shown === formatted ? text : formatted);
        layout();
      });

    // Only renderers with a grammar can switch highlighting off.
    const toggle =
      renderer && renderer.language
        ? button('', () => {
            raw = !raw;
            paint();
          })
        : null;

    if (download && typeof chrome !== 'undefined' && chrome.runtime) {
      const downloadButton = button('下载原文件', () => {
        chrome.runtime.sendMessage({ type: 'download', url }, (response) => {
          void chrome.runtime.lastError;
          downloadButton.textContent =
            response && response.ok ? '已开始下载' : '下载失败';
          setTimeout(() => {
            downloadButton.textContent = '下载原文件';
          }, 1500);
        });
      });
    }

    root.appendChild(header);

    for (const message of notes) root.appendChild(el('div', 'tpv-note', message));

    const main = el('main', 'tpv-main');
    const wrap = el('div', 'tpv-code-wrap');
    const gutter = el('div', 'tpv-gutter');
    const pre = el('pre', 'tpv-code');
    const code = el('code');
    pre.appendChild(code);
    wrap.appendChild(gutter);
    wrap.appendChild(pre);
    main.appendChild(wrap);

    // Wrapped view (Alt+Z): one block per line, so a wrapped line keeps its
    // number on its first row. Built on first use and again after the content
    // changes; chunks off screen skip layout, so switching stays fast for
    // large files.
    const lines = el('pre', 'tpv-code tpv-lines');
    let wrapped = false;
    let linesStale = true;
    main.appendChild(lines);

    if (preview) main.appendChild(preview);
    root.appendChild(main);

    function fillLines() {
      const rows =
        raw || html === null
          ? shown.split('\n').map(escapeHtml)
          : splitLines(html);
      let out = '';
      for (let i = 0; i < rows.length; i += LINES_PER_CHUNK) {
        out += '<div>';
        const end = Math.min(i + LINES_PER_CHUNK, rows.length);
        for (let j = i; j < end; j++) {
          out +=
            '<span class="tpv-line" data-n="' + (j + 1) + '">' + rows[j] +
            '</span>';
        }
        out += '</div>';
      }
      lines.innerHTML = out;
      lines.style.setProperty('--tpv-digits', String(rows.length).length);
      linesStale = false;
    }

    // Line heights differ between the two views, so the line at the top of
    // the view is carried over instead of the scroll offset.
    function topLine() {
      if (!wrapped) {
        const style = getComputedStyle(pre);
        const offset = main.scrollTop - parseFloat(style.paddingTop);
        return Math.max(0, Math.floor(offset / parseFloat(style.lineHeight)));
      }
      const box = main.getBoundingClientRect();
      const hit = document.elementFromPoint(
        box.left + box.width / 2,
        box.top + 1
      );
      const line = hit && hit.closest('.tpv-line');
      return line ? Number(line.dataset.n) - 1 : 0;
    }

    function scrollToLine(index) {
      if (!index) {
        main.scrollTop = 0;
      } else if (!wrapped) {
        const style = getComputedStyle(pre);
        main.scrollTop =
          parseFloat(style.paddingTop) + index * parseFloat(style.lineHeight);
      } else {
        const chunk = lines.children[Math.floor(index / LINES_PER_CHUNK)];
        const line = chunk && chunk.children[index % LINES_PER_CHUNK];
        if (line) {
          // An off-screen chunk takes its estimated height, which would put
          // the line in the wrong place; lay it out for real before measuring.
          // It goes back to auto only after a frame has recorded that height
          // (contain-intrinsic-size: auto), or it would shrink to the estimate.
          chunk.style.contentVisibility = 'visible';
          main.scrollTop +=
            line.getBoundingClientRect().top - main.getBoundingClientRect().top;
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              chunk.style.contentVisibility = '';
            })
          );
        }
      }
    }

    function toggleWrap() {
      const top = source ? topLine() : null;
      wrapped = !wrapped;
      if (wrapped && linesStale) fillLines();
      layout();
      if (top !== null) scrollToLine(top);
    }

    // event.code rather than key: Option+Z types a character on macOS.
    document.addEventListener('keydown', (event) => {
      if (
        event.code === 'KeyZ' &&
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey
      ) {
        event.preventDefault();
        toggleWrap();
      }
    });

    function paint() {
      if (raw || html === null) {
        code.textContent = shown;
      } else {
        code.innerHTML = html;
      }
      if (toggle) toggle.textContent = raw ? '高亮' : '原始文本';
      linesStale = true;
      if (wrapped) {
        const top = topLine();
        fillLines();
        scrollToLine(top);
      }
    }

    function show(value) {
      shown = value;
      html = renderer ? highlight(shown, renderer) : null;
      gutter.textContent = Array.from(
        { length: shown.split('\n').length },
        (_, index) => index + 1
      ).join('\n');
      paint();
    }

    // Visibility only; never re-renders the code, which is slow for big files.
    function layout() {
      wrap.hidden = !source || wrapped;
      lines.hidden = !source || !wrapped;
      if (preview) preview.hidden = source;
      if (viewButton) viewButton.textContent = source ? '预览' : '源码';
      if (formatButton) {
        formatButton.hidden = !source;
        formatButton.textContent = shown === formatted ? '原文' : '格式化';
      }
      if (toggle) toggle.hidden = !source || html === null;
    }

    // Minified (single-line) JSON is unreadable as is, so it opens formatted.
    show(formatButton && !text.trim().includes('\n') ? formatted : text);
    layout();

    return root;
  }

  TPV.app = {
    renderPage(options) {
      const target = options.container || document.body;
      target.replaceChildren(build(options));
      document.documentElement.classList.add('tpv-active');
    },
    el,
    highlightLimit,
  };
})();
