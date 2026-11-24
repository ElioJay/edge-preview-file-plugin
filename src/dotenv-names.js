// Which ".env.*" file names are dotenv files. Loaded by the content script,
// the viewer and background.js (importScripts), so the rule lives in one place.
(function () {
  const TPV = (globalThis.TPV = globalThis.TPV || {});

  // A last segment naming another format means the file is that format
  // (.env.json) or binary / encrypted / compressed (.env.gpg), not dotenv.
  const OTHER_FORMATS = [
    // data and markup
    'json', 'jsonc', 'json5', 'yaml', 'yml', 'toml', 'xml', 'html', 'htm',
    'md', 'csv', 'tsv', 'ini', 'txt', 'log',
    // code
    'js', 'mjs', 'cjs', 'ts', 'py', 'rb', 'php', 'sh', 'bash', 'ps1', 'go',
    'java',
    // binary, encrypted, compressed
    'gpg', 'pgp', 'asc', 'enc', 'age', 'aes', 'gz', 'tgz', 'zip', 'tar',
    'bz2', 'xz', '7z', 'rar',
  ];

  // .env.local, .env.example, .env.development.local, ...
  TPV.dotenvNames = new RegExp(
    '^\\.env(?:\\.[^.]+)*\\.(?!(?:' + OTHER_FORMATS.join('|') + ')$)[^.]+$',
    'i'
  );
})();
