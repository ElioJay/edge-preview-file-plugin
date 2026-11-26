importScripts('src/dotenv-names.js');

const PREVIEW_PATH =
  /\.(?:toml|ya?ml|json[c5]?|txt|log|env|md|markdown|sh|bash|zsh)$/i;
const SIZE_LIMITED_PATH = /\.(?:txt|log|sh|bash|zsh)$/i;
// Same limit as maxBytes in src/renderers/txt.js, log.js and shell.js.
// Checked here only when the server reports a size; otherwise the viewer
// enforces it while reading.
const MAX_PREVIEW_BYTES = 50 * 1024 * 1024;
// URLs the viewer explicitly asked to download; the next onCreated for them
// must not be treated as a preview request.
const allowedDownloads = new Set();

function isHttpPreviewUrl(value) {
  try {
    const url = new URL(value);
    const base = url.pathname.slice(url.pathname.lastIndexOf('/') + 1);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      (PREVIEW_PATH.test(url.pathname) || TPV.dotenvNames.test(base))
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
function exceedsSizeLimit(url) {
  return fetch(url, {
    method: 'HEAD',
    credentials: 'include',
    signal: AbortSignal.timeout(5000),
  })
    .then(
      (response) =>
        response.ok &&
        Number(response.headers.get('content-length')) > MAX_PREVIEW_BYTES
    )
    .catch(() => false);
}

// The tab each recent top-level navigation to a preview URL came from. A
// download item carries no tab id; this lets the viewer replace the page the
// link was clicked on, so Back returns to it, instead of opening a new tab.
const navigationTabs = new Map();

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId < 0 || !isHttpPreviewUrl(details.url)) return;
    navigationTabs.set(details.url, details.tabId);
    setTimeout(() => {
      if (navigationTabs.get(details.url) === details.tabId) {
        navigationTabs.delete(details.url);
      }
    }, 30000);
  },
  { urls: ['http://*/*', 'https://*/*'], types: ['main_frame'] }
);

// A tab with no page of its own (opened by Ctrl- or middle-click just for
// this link) is closed by the browser once the download starts, so it gets a
// new tab, as does a download whose tab is unknown.
function showViewer(tabId, url) {
  const openNewTab = () => chrome.tabs.create({ url });
  if (tabId === undefined) {
    openNewTab();
    return;
  }
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab.url) {
      openNewTab();
      return;
    }
    chrome.tabs.update(tabId, { url }, () => {
      if (chrome.runtime.lastError) openNewTab();
    });
  });
}

function openInViewer(item) {
  const tabId = navigationTabs.get(item.url);
  navigationTabs.delete(item.url);
  chrome.downloads.cancel(item.id, () => {
    void chrome.runtime.lastError;
    Promise.resolve(chrome.downloads.erase({ id: item.id })).catch(() => {});
    showViewer(
      tabId,
      chrome.runtime.getURL('viewer.html') +
        '?src=' +
        encodeURIComponent(item.url)
    );
  });
}

chrome.downloads.onCreated.addListener((item) => {
  if (allowedDownloads.delete(item.url)) return;
  if (item.byExtensionId) return;
  if (!isHttpPreviewUrl(item.url)) return;
  if (!SIZE_LIMITED_PATH.test(new URL(item.url).pathname)) {
    openInViewer(item);
    return;
  }

  // totalBytes is still 0 when a download is created, so hold the download
  // while asking the server. Over the limit it resumes as a normal download.
  chrome.downloads.pause(item.id, () => {
    void chrome.runtime.lastError;
    exceedsSizeLimit(item.url).then((tooLarge) => {
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
