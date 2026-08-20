/**
 * HackerRank Solutions Manager - Background Service Worker
 * Manifest V3 compliant service worker
 */

// Import seed data and storage scripts in service worker
try {
  importScripts('../data/seed-data.js', '../lib/storage.js', '../lib/api.js');
} catch (e) {
  console.error('Failed to import scripts in service worker:', e);
}

// Lifecycle: onInstalled
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('HackerRank Solutions Extension installed/updated:', details.reason);
  if (typeof HRStorage !== 'undefined') {
    await HRStorage.init();
    await updateBadge();
  }
});

// Update extension icon badge with total solutions count
async function updateBadge() {
  try {
    if (typeof HRStorage !== 'undefined') {
      const solutions = await HRStorage.getSolutions();
      let total = 0;
      for (const slug of Object.keys(solutions)) {
        total += Object.keys(solutions[slug]).length;
      }
      if (total > 0) {
        await chrome.action.setBadgeText({ text: String(total) });
        await chrome.action.setBadgeBackgroundColor({ color: '#00EA64' });
      }
    }
  } catch (e) {
    console.warn('Failed to update badge:', e);
  }
}

// Listen for messages from popup or dashboard
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'OPEN_DASHBOARD') {
    const url = chrome.runtime.getURL('dashboard/dashboard.html') + (message.params ? `?${new URLSearchParams(message.params).toString()}` : '');
    chrome.tabs.create({ url });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'REFRESH_BADGE') {
    updateBadge().then(() => sendResponse({ success: true }));
    return true;
  }

  return true;
});
