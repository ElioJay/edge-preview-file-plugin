(function () {
  // Prism 1.29.0 ships no dotenv grammar. Follows the common dotenv rules:
  // "#" starts a comment only at line start or after whitespace, and only
  // double-quoted and unquoted values expand ${VAR} / $VAR. String patterns
  // come before comments so a "#" inside quotes stays part of the value.
  const variable = /\$\{[^}\r\n]*\}|\$[A-Za-z_]\w*/;

  Prism.languages.dotenv = {
    string: [
      {
        pattern: /(=[ \t]*)"(?:\\[\s\S]|[^"\\])*"/,
        lookbehind: true,
        greedy: true,
        inside: { variable },
      },
      {
        pattern: /(=[ \t]*)(?:'[^']*'|`[^`]*`)/,
        lookbehind: true,
        greedy: true,
      },
    ],
    comment: {
      pattern: /(^|\s)#.*/,
      lookbehind: true,
      greedy: true,
    },
    keyword: {
      pattern: /(^[ \t]*)export(?=[ \t]+[A-Za-z_])/m,
      lookbehind: true,
    },
    key: {
      pattern: /(^[ \t]*(?:export[ \t]+)?)[A-Za-z_][\w.-]*(?=[ \t]*=)/m,
      lookbehind: true,
    },
    value: {
      pattern: /(=[ \t]*)[^\s"'`](?:[^\r\n]*\S)?/,
      lookbehind: true,
      alias: 'string',
      inside: { variable },
    },
    punctuation: /=/,
  };

  window.TPV.registry.register({
    id: 'dotenv',
    label: 'ENV',
    language: 'dotenv',
    extensions: ['env'],
    // .env.local, .env.example, .env.development.local, ...
    filenames: /^\.env\..+$/i,
  });
})();
