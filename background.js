const PREVIEW_PATH = /\.(?:toml|ya?ml)$/i;
// URLs the viewer explicitly asked to download; the next onCreated for them
// must not be treated as a preview request.
const allowedDownloads = new Set();

function isHttpPreviewUrl(value) {
  try {
    const url = new URL(value);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      PREVIEW_PATH.test(url.pathname)
    );
  } catch {
    return false;
  }
}

function allowDownload(url) {
  allowedDownloads.add(url);
  setTimeout(() => allowedDownloads.delete(url), 15000);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== 'download' || typeof message.url !== 'string') {
    return;
  }
  let parsed;
  try {
    parsed = new URL(message.url);
  } catch {
    return;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;

  allowDownload(message.url);
  chrome.downloads.download({ url: message.url }, (id) => {
    const error = chrome.runtime.lastError;
    if (error) allowedDownloads.delete(message.url);
    sendResponse({ ok: !error, id });
  });
  return true;
});

chrome.downloads.onCreated.addListener((item) => {
  if (allowedDownloads.delete(item.url)) return;
  if (item.byExtensionId) return;
  if (!isHttpPreviewUrl(item.url)) return;

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
