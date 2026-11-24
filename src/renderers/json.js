(function () {
  // Strings, structural characters, and everything else (numbers, literals).
  const TOKEN = /"(?:[^"\\]|\\.)*"|[{}[\],:]|[^\s{}[\],:"]+/g;

  // Re-indents with two spaces. Values are copied as written instead of going
  // through JSON.parse / JSON.stringify, so integers beyond 2^53 and string
  // escapes stay exactly as in the file. JSON.parse only validates.
  function format(text) {
    try {
      JSON.parse(text);
    } catch (error) {
      throw new Error('不是合法的 JSON，已按原文显示：' + error.message);
    }
    let out = '';
    let depth = 0;
    let afterOpen = false;
    const indent = () => '\n' + '  '.repeat(depth);
    for (const [token] of text.matchAll(TOKEN)) {
      if (token === '}' || token === ']') {
        depth--;
        // An empty {} or [] stays on one line.
        out += (afterOpen ? '' : indent()) + token;
        afterOpen = false;
        continue;
      }
      if (afterOpen) out += indent();
      afterOpen = false;
      if (token === '{' || token === '[') {
        out += token;
        depth++;
        afterOpen = true;
      } else if (token === ',') {
        out += ',' + indent();
      } else if (token === ':') {
        out += ': ';
      } else {
        out += token;
      }
    }
    return out;
  }

  window.TPV.registry.register({
    id: 'json',
    label: 'JSON',
    language: 'json',
    extensions: ['json'],
    format,
  });

  // Not strict JSON (comments, trailing commas, unquoted keys), so these are
  // highlighted only.
  window.TPV.registry.register({
    id: 'jsonc',
    label: 'JSONC',
    language: 'json',
    extensions: ['jsonc'],
  });

  window.TPV.registry.register({
    id: 'json5',
    label: 'JSON5',
    language: 'json5',
    extensions: ['json5'],
  });
})();
