const PREVIEW_PATH = /\.(?:toml|ya?ml|txt)$/i;
const TXT_PATH = /\.txt$/i;
// Same limit as maxBytes in src/renderers/txt.js. Checked here only when the
// server reports a size; otherwise the viewer enforces it while reading.
const MAX_TXT_BYTES = 50 * 1024 * 1024;
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

// Resolves false when the server gives no usable size or does not answer in
// time, so the file falls back to the viewer.
function exceedsTxtLimit(url) {
  return fetch(url, {
    method: 'HEAD',
    credentials: 'include',
    signal: AbortSignal.timeout(5000),
  })
    .then(
      (response) =>
        response.ok &&
        Number(response.headers.get('content-length')) > MAX_TXT_BYTES
    )
    .catch(() => false);
}

function openInViewer(item) {
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
}

chrome.downloads.onCreated.addListener((item) => {
  if (allowedDownloads.delete(item.url)) return;
  if (item.byExtensionId) return;
  if (!isHttpPreviewUrl(item.url)) return;
  if (!TXT_PATH.test(new URL(item.url).pathname)) {
    openInViewer(item);
    return;
  }

  // totalBytes is still 0 when a download is created, so hold the download
  // while asking the server. Over the limit it resumes as a normal download.
  chrome.downloads.pause(item.id, () => {
    void chrome.runtime.lastError;
    exceedsTxtLimit(item.url).then((tooLarge) => {
      if (!tooLarge) {
        openInViewer(item);
        return;
      }
      chrome.downloads.resume(item.id, () => {
        void chrome.runtime.lastError;
      });
    });
  });
});
