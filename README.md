# HackerRank Solutions Chrome Extension

A Google Chrome Extension (Manifest V3) for downloading, storing, searching, and comparing HackerRank problem solutions categorized by challenges and users.

---

## 🌟 Highlights

- **442 Pre-indexed Challenges & 404 Seed Solutions**: Immediate access to solutions across multiple users without needing to re-fetch existing ones.
- **Fast Batch Downloader**: Download all solved problems for any user in seconds with live progress and cancel support.
- **Incremental Merging**: Stores data in `chrome.storage.local` (`unlimitedStorage`), adding newer solutions and updating existing ones.
- **Full-Page Solution Explorer**:
  - Filter by track, difficulty, user, and language.
  - Search by problem title, slug, or inside source code.
  - Multi-user code tabs for viewing different solutions to the same challenge.
  - Side-by-side comparison mode with line-by-line diff.
  - Formatted problem statement viewer.
  - Copy code to clipboard and download single solution files.
  - Export and import full database backups as JSON.

---

## 🚀 Quick Start (Load Unpacked Extension)

1. Open Google Chrome and go to `chrome://extensions`.
2. Toggle on **Developer mode** in the top right.
3. Click **Load unpacked** and select the `extension/` folder in this repository.
4. Log into [hackerrank.com](https://www.hackerrank.com) in your browser.
5. Click the extension icon in your Chrome toolbar to fetch solutions or open the full dashboard.

---

## 🛠️ Project Structure

```
HackerRank/
├── extension/                     # Chrome Extension source (Load Unpacked here)
│   ├── manifest.json              # Chrome Manifest V3 configuration
│   ├── icons/                     # 16px, 48px, 128px PNG icons
│   ├── background/
│   │   └── service-worker.js      # Background worker & badge updater
│   ├── lib/
│   │   ├── storage.js             # Storage management & upsert logic
│   │   ├── sync.js                # Local server background sync module
│   │   └── api.js                 # HackerRank REST API client
│   ├── data/
│   │   ├── seed-data.js           # Pre-compiled database with 442 problems & 404 solutions
│   │   └── problems-list.js       # Array of 442 challenge slugs
│   └── popup/
│       ├── popup.html             # Downloader popup UI
│       ├── popup.css              # Dark theme styling
│       └── popup.js               # Popup controller & fetch handler
├── initFiles/                     # Archived initial crawler files, problem folders & solutions
├── scripts/
│   ├── generate-icons.js          # Icon generator script
│   ├── generate-seed.js           # Seed compiler script
│   └── verify-extension.js        # Automated verification test suite
├── CHROMEWEBSTORE.md              # Web Store metadata and descriptions
└── README.md
```
