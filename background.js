const TOML_PATH = /\.toml$/i;

function isHttpTomlUrl(value) {
  try {
    const url = new URL(value);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      TOML_PATH.test(url.pathname)
    );
  } catch {
    return false;
  }
}

chrome.downloads.onCreated.addListener((item) => {
  // Downloads started by an extension (including this viewer's "下载原文件")
  // are explicit intent, so leave them alone.
  if (item.byExtensionId) return;
  if (!isHttpTomlUrl(item.url)) return;

  chrome.downloads.cancel(item.id, () => {
    void chrome.runtime.lastError;
    Promise.resolve(chrome.downloads.erase({ id: item.id })).catch(() => {});
    chrome.tabs.create({
      url:
        chrome.runtime.getURL('viewer.html') +
        '?src=' +
        encodeURIComponent(item.url),
    });
  });
});
