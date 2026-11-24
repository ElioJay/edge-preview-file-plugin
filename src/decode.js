(function () {
  const TPV = (window.TPV = window.TPV || {});

  // Declared charsets that do not settle the encoding: servers often send
  // utf-8 or iso-8859-1 (windows-1252 in the Encoding Standard) by default,
  // whatever the file really is. For these, and when nothing is declared, the
  // bytes decide: valid UTF-8 is UTF-8, anything else is GBK (via GB18030,
  // its superset). Any other declared charset is trusted.
  const UNRELIABLE = new Set(['utf-8', 'windows-1252']);

  function declaredCharset(contentType) {
    const match = /charset\s*=\s*"?([^";\s]+)/i.exec(contentType || '');
    if (!match) return null;
    try {
      return new TextDecoder(match[1]).encoding;
    } catch {
      return null;
    }
  }

  TPV.decodeText = function (bytes, contentType) {
    const declared = declaredCharset(contentType);
    if (declared && !UNRELIABLE.has(declared)) {
      return new TextDecoder(declared).decode(bytes);
    }
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      return new TextDecoder('gb18030').decode(bytes);
    }
  };
})();
