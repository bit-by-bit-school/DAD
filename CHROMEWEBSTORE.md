# HackerRank Solutions Hub - Chrome Web Store Package Details

## Extension Information
- **Name**: HackerRank Solutions Hub
- **Version**: 1.0.0
- **Category**: Developer Tools / Productivity
- **Short Description**: Download, archive, browse, search, and compare HackerRank problem solutions categorized by challenges and users.

---

## Detailed Store Description
**HackerRank Solutions Hub** is the ultimate companion tool for competitive programmers, interview prep students, and software engineers. Seamlessly download, store, search, and compare all your HackerRank submissions directly in your browser.

### 🌟 Key Features
- 📥 **One-Click Solution Downloader**: Download solved submissions for any HackerRank username in seconds with real-time progress indicators.
- 📂 **Categorized & Pre-Indexed**: Browse 440+ curated HackerRank algorithmic challenges categorized by tracks, difficulty (Easy, Medium, Hard), and solved status.
- 👥 **Multi-User Solution Tracking**: Store submissions from multiple accounts or classmates/peers simultaneously under each problem.
- ⚖️ **Side-by-Side Code Comparator**: Compare two solutions to the same challenge with side-by-side split panes and line-by-line diff highlighting.
- 💡 **Smart Syntax Highlighting & Line Numbers**: Clean, zero-dependency offline code viewer supporting Python, JavaScript, C++, Java, C, Ruby, Go, and Rust.
- 🔍 **Full-Text Code & Title Search**: Instant search across challenge titles, slugs, and source code content.
- 💾 **Local Offline Storage**: Works completely offline after download with `chrome.storage.local`.
- 📦 **Export & Backup**: Export your entire solution library as a single JSON file or download individual source code files anytime.

---

## Single Purpose Statement & Permission Justifications
In accordance with Google Chrome Web Store Developer Policies:

1. **Single Purpose**:
   The single purpose of this extension is to provide a local dashboard and downloader for users to archive, manage, search, and compare HackerRank coding challenge solutions.

2. **Permissions Justifications**:
   - `storage` & `unlimitedStorage`:
     *Required to store problem statements, metadata, and hundreds of solution source code files locally in the browser so users can view and compare their solutions offline without data loss.*
   - `cookies`:
     *Required to verify the active `_hrank_session` authentication cookie on `hackerrank.com` so the extension can download the authenticated user's private solutions.*
   - `tabs`:
     *Required to launch the full-page solutions dashboard in a new tab when the user clicks the "Open Dashboard" button from the popup.*
   - `host_permissions: ["https://*.hackerrank.com/*"]`:
     *Required to communicate with HackerRank's REST API endpoints (`/rest/contests/master/challenges/.../hackers/.../download_solution`) to retrieve problem details and solution code on behalf of the logged-in user.*

---

## How to Install (Developer / Unpacked Mode)
1. Open Google Chrome.
2. Navigate to `chrome://extensions` in your URL bar.
3. Toggle **Developer mode** in the top right corner.
4. Click **Load unpacked** in the top left corner.
5. Select the `extension/` directory from this repository:
   `c:\Users\rammm\Desktop\code\HackerRank\extension`
6. The **HackerRank Solutions Hub** icon will appear in your Chrome toolbar!

---

## How to Use
1. **Login to HackerRank**: Open [hackerrank.com](https://www.hackerrank.com) in Chrome and sign in to your account.
2. **Open Extension Popup**: Click the HackerRank extension icon in your Chrome toolbar.
3. **Fetch Solutions**: Enter a target username (e.g. your username or peers like `nmeera2024`, `rammmukul`) and click **⚡ Fetch Solutions**.
4. **Open Dashboard**: Click **Open Full Solutions Dashboard** to explore all problems, view statements, switch code tabs between solved users, and compare implementations side-by-side.
