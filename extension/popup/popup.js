/**
 * Solutions Hub - Popup Controller with HackerRank and LeetCode Support
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const authBadge = document.getElementById('auth-status-badge');
  const fetchForm = document.getElementById('fetch-form');
  const usernameInput = document.getElementById('username-input');
  const userChipsContainer = document.getElementById('user-chips-container');
  const fetchBtn = document.getElementById('fetch-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const progressSection = document.getElementById('progress-section');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const progressStatusText = document.getElementById('progress-status-text');
  const progressPercent = document.getElementById('progress-percent');
  const statSolvedCount = document.getElementById('stat-solved-count');
  const statSkippedCount = document.getElementById('stat-skipped-count');
  const statCurrentIndex = document.getElementById('stat-current-index');
  const statTotalCount = document.getElementById('stat-total-count');
  const currentChallengeLabel = document.getElementById('current-challenge-label');
  const fetchAlert = document.getElementById('fetch-alert');
  const alertMessage = document.getElementById('alert-message');

  const serverUrlInput = document.getElementById('server-url-input');
  const serverTokenInput = document.getElementById('server-token-input');
  const saveTokenBtn = document.getElementById('save-token-btn');
  const syncNowBtn = document.getElementById('sync-now-btn');
  const syncStatusBadge = document.getElementById('sync-status-badge');
  const syncAlert = document.getElementById('sync-alert');

  const metricTotalProblems = document.getElementById('metric-total-problems');
  const metricTotalSolutions = document.getElementById('metric-total-solutions');
  const metricTotalUsers = document.getElementById('metric-total-users');
  const openDashboardBtn = document.getElementById('open-dashboard-btn');

  // Platform Tabs
  const tabHackerRank = document.getElementById('tab-hackerrank');
  const tabLeetCode = document.getElementById('tab-leetcode');
  const tabAll = document.getElementById('tab-all');

  let currentPlatform = 'hackerrank';
  let abortController = null;

  // Initialize Storage & Server Settings
  await HRStorage.init();
  await refreshDatabaseStats();
  await loadServerSettings();
  checkAuth();

  // Load HackerRank problem slugs list
  let problemSlugs = [];
  if (typeof HR_PROBLEM_SLUGS !== 'undefined' && Array.isArray(HR_PROBLEM_SLUGS)) {
    problemSlugs = HR_PROBLEM_SLUGS;
  } else {
    const problems = await HRStorage.getProblems();
    problemSlugs = Object.keys(problems);
  }

  // Handle Platform Tab Switch
  function setPlatform(platform) {
    currentPlatform = platform;
    [tabHackerRank, tabLeetCode, tabAll].forEach(t => t && t.classList.remove('active'));

    if (platform === 'hackerrank' && tabHackerRank) tabHackerRank.classList.add('active');
    if (platform === 'leetcode' && tabLeetCode) tabLeetCode.classList.add('active');
    if (platform === 'all' && tabAll) tabAll.classList.add('active');

    const inputLabel = fetchForm.querySelector('label[for="username-input"]');
    if (inputLabel) {
      if (platform === 'leetcode') inputLabel.textContent = 'LeetCode Username';
      else if (platform === 'all') inputLabel.textContent = 'Username (HR & LeetCode)';
      else inputLabel.textContent = 'HackerRank Username';
    }

    if (usernameInput) {
      if (platform === 'leetcode') usernameInput.placeholder = 'e.g. leetcode_user';
      else usernameInput.placeholder = 'e.g. nmeera2024';
    }

    checkAuth();
  }

  if (tabHackerRank) tabHackerRank.addEventListener('click', () => setPlatform('hackerrank'));
  if (tabLeetCode) tabLeetCode.addEventListener('click', () => setPlatform('leetcode'));
  if (tabAll) tabAll.addEventListener('click', () => setPlatform('all'));

  // Load server settings into popup
  async function loadServerSettings() {
    const settings = await HRStorage.getSettings();
    if (serverUrlInput) {
      serverUrlInput.value = settings.serverUrl || 'http://localhost:3000';
    }
    if (settings.authToken) {
      serverTokenInput.value = settings.authToken;
      const isLocal = (settings.serverUrl || '').includes('localhost') || (settings.serverUrl || '').includes('127.0.0.1');
      syncStatusBadge.textContent = isLocal ? 'Local Server' : 'Prod Server';
      syncStatusBadge.style.color = '#00EA64';
    } else {
      syncStatusBadge.textContent = 'Token Unset';
      syncStatusBadge.style.color = '#ff9900';
    }
  }

  // Save server config handler
  saveTokenBtn.addEventListener('click', async () => {
    let url = serverUrlInput ? serverUrlInput.value.trim() : '';
    if (url && !/^https?:\/\//i.test(url)) {
      url = `http://${url}`;
      if (serverUrlInput) serverUrlInput.value = url;
    }
    const token = serverTokenInput.value.trim();
    await HRStorage.saveSettings({ serverUrl: url || 'http://localhost:3000', authToken: token });
    showSyncAlert(token ? `Server config saved! Target: ${url || 'http://localhost:3000'}` : 'Config updated.', 'success');
    await loadServerSettings();
  });

  // Sync now button handler
  syncNowBtn.addEventListener('click', async () => {
    syncNowBtn.disabled = true;
    syncNowBtn.textContent = 'Syncing...';

    // Save inputs automatically before syncing
    let url = serverUrlInput ? serverUrlInput.value.trim() : '';
    if (url && !/^https?:\/\//i.test(url)) {
      url = `http://${url}`;
      if (serverUrlInput) serverUrlInput.value = url;
    }
    const token = serverTokenInput.value.trim();
    if (url || token) {
      await HRStorage.saveSettings({ serverUrl: url || 'http://localhost:3000', authToken: token });
    }

    const settings = await HRStorage.getSettings();
    const activeUrl = settings.serverUrl || 'http://localhost:3000';
    showSyncAlert(`Syncing solutions to ${activeUrl}...`, 'info');

    try {
      const result = await HRSync.pushToServer();
      if (result.success) {
        showSyncAlert(`Synced ${result.syncedCount} solutions to server (@${result.syncedUser})!`, 'success');
      } else {
        showSyncAlert(`Sync failed: ${result.error}`, 'error');
      }
    } catch (err) {
      showSyncAlert(`Sync error: ${err.message}`, 'error');
    } finally {
      syncNowBtn.disabled = false;
      syncNowBtn.textContent = 'Sync Now';
    }
  });

  function showSyncAlert(msg, type = 'success') {
    syncAlert.textContent = msg;
    syncAlert.style.color = type === 'success' ? '#00EA64' : (type === 'info' ? '#00d2ff' : '#ff4d4d');
    syncAlert.classList.remove('hidden');
  }

  // Refresh summary stats and user chips
  async function refreshDatabaseStats() {
    const problems = await HRStorage.getProblems();
    const solutions = await HRStorage.getSolutions();
    const users = await HRStorage.getUsers();

    const totalProblems = Object.keys(problems).length;
    let totalSolutions = 0;
    for (const slug of Object.keys(solutions)) {
      totalSolutions += Object.keys(solutions[slug]).length;
    }

    metricTotalProblems.textContent = totalProblems;
    metricTotalSolutions.textContent = totalSolutions;
    metricTotalUsers.textContent = users.length;

    // Render User Chips
    userChipsContainer.innerHTML = '';
    if (users.length === 0) {
      userChipsContainer.innerHTML = '<span class="recent-label">None yet</span>';
    } else {
      users.slice(0, 5).forEach((u) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'user-chip';
        chip.innerHTML = `${escapeHtml(u.username)}<strong>(${u.solvedCount})</strong>`;
        chip.addEventListener('click', () => {
          usernameInput.value = u.username;
          usernameInput.focus();
        });
        userChipsContainer.appendChild(chip);
      });
    }
  }

  // Check Platform Authentication Status
  async function checkAuth() {
    authBadge.className = 'auth-badge checking';
    authBadge.innerHTML = '<span class="status-dot"></span><span class="status-text">Checking login...</span>';

    try {
      if (currentPlatform === 'leetcode') {
        if (typeof LCAPI !== 'undefined') {
          const auth = await LCAPI.checkAuthStatus();
          if (auth.isLoggedIn) {
            authBadge.className = 'auth-badge logged-in';
            authBadge.innerHTML = `<span class="status-dot"></span><span class="status-text">${auth.user ? escapeHtml(auth.user) : 'LeetCode Active'}</span>`;
            authBadge.title = 'Logged into LeetCode. Ready to fetch solutions!';
          } else {
            authBadge.className = 'auth-badge logged-out';
            authBadge.innerHTML = '<span class="status-dot"></span><span class="status-text">Not Logged In</span>';
            authBadge.title = 'Click to open LeetCode login page';
          }
        }
      } else {
        const auth = await HRAPI.checkAuthStatus();
        if (auth.isLoggedIn) {
          authBadge.className = 'auth-badge logged-in';
          authBadge.innerHTML = `<span class="status-dot"></span><span class="status-text">${auth.user ? escapeHtml(auth.user) : 'HackerRank Active'}</span>`;
          authBadge.title = 'Logged in to HackerRank. Ready to fetch solutions!';
        } else {
          authBadge.className = 'auth-badge logged-out';
          authBadge.innerHTML = '<span class="status-dot"></span><span class="status-text">Not Logged In</span>';
          authBadge.title = 'Click to open HackerRank login page';
        }
      }
    } catch (e) {
      authBadge.className = 'auth-badge logged-out';
      authBadge.innerHTML = '<span class="status-dot"></span><span class="status-text">Login Required</span>';
    }
  }

  // Click on auth badge to open login page
  authBadge.addEventListener('click', () => {
    if (authBadge.classList.contains('logged-out')) {
      const loginUrl = currentPlatform === 'leetcode' ? 'https://leetcode.com/accounts/login/' : 'https://www.hackerrank.com/login';
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.create({ url: loginUrl });
      } else {
        window.open(loginUrl, '_blank');
      }
    }
  });

  // Handle Fetch Form Submission
  fetchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    if (!username) return;

    hideAlert();
    abortController = new AbortController();

    // UI state
    fetchBtn.disabled = true;
    fetchBtn.innerHTML = '<span class="btn-label">Fetching...</span>';
    cancelBtn.classList.remove('hidden');
    progressSection.classList.remove('hidden');

    progressBarFill.style.width = '0%';
    progressPercent.textContent = '0%';
    statSolvedCount.textContent = '0';
    statSkippedCount.textContent = '0';
    statCurrentIndex.textContent = '0';
    statTotalCount.textContent = '...';

    if (currentPlatform === 'leetcode') {
      progressStatusText.textContent = `Fetching LeetCode solutions for @${username}...`;
      try {
        const result = await LCAPI.fetchUserSolutionsBatch(
          username,
          (progress) => {
            if (progress.phase === 'listing') {
              progressStatusText.textContent = progress.message;
            } else {
              progressBarFill.style.width = `${progress.percent}%`;
              progressPercent.textContent = `${progress.percent}%`;
              statSolvedCount.textContent = String(progress.solvedCount);
              statSkippedCount.textContent = String(progress.errorCount || 0);
              statCurrentIndex.textContent = String(progress.current);
              statTotalCount.textContent = String(progress.total);
              currentChallengeLabel.textContent = `Downloading: ${progress.currentSlug}`;
            }
          },
          {
            concurrency: 3,
            maxSubmissions: 200,
            signal: abortController.signal
          }
        );

        // Save into storage
        const saveResult = await HRStorage.saveUserSolutions(username, result.solutions);
        await refreshDatabaseStats();

        // Trigger server sync automatically
        const syncRes = await HRSync.pushToServer();

        showAlert(
          `Success! Found ${result.solvedCount} LeetCode solutions for @${username}. ${syncRes.success ? 'Synced to server!' : ''}`,
          'success'
        );
      } catch (err) {
        if (err.name === 'AbortError' || (abortController && abortController.signal.aborted)) {
          showAlert('Download cancelled by user.', 'error');
        } else {
          showAlert(err.message || 'Failed to fetch LeetCode solutions. Ensure you are logged in on leetcode.com.', 'error');
        }
      }
    } else {
      // HackerRank or All
      progressStatusText.textContent = `Downloading solutions for @${username}...`;
      statTotalCount.textContent = String(problemSlugs.length);

      try {
        const result = await HRAPI.fetchUserSolutionsBatch(
          username,
          problemSlugs,
          (progress) => {
            progressBarFill.style.width = `${progress.percent}%`;
            progressPercent.textContent = `${progress.percent}%`;
            statSolvedCount.textContent = String(progress.solvedCount);
            statSkippedCount.textContent = String(progress.notFoundCount);
            statCurrentIndex.textContent = String(progress.current);
            currentChallengeLabel.textContent = `Checking: ${progress.currentSlug}`;
          },
          {
            concurrency: 6,
            delayMs: 25,
            signal: abortController.signal
          }
        );

        // Save into storage
        const saveResult = await HRStorage.saveUserSolutions(username, result.solutions);
        await refreshDatabaseStats();

        // Trigger server sync automatically
        const syncRes = await HRSync.pushToServer();

        showAlert(
          `Success! Found ${result.solvedCount} solutions for @${username}. ${syncRes.success ? 'Synced to server!' : ''}`,
          'success'
        );
      } catch (err) {
        if (err.name === 'AbortError' || (abortController && abortController.signal.aborted)) {
          showAlert('Download cancelled by user.', 'error');
        } else {
          showAlert(err.message || 'Failed to fetch solutions. Ensure you are logged into HackerRank.', 'error');
        }
      }
    }

    fetchBtn.disabled = false;
    fetchBtn.innerHTML = `
      <span class="btn-icon">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      </span>
      <span class="btn-label">Fetch Solutions</span>
    `;
    cancelBtn.classList.add('hidden');
    currentChallengeLabel.textContent = 'Completed';
  });

  // Handle Cancel
  cancelBtn.addEventListener('click', () => {
    if (abortController) {
      abortController.abort();
    }
  });

  // Handle Open Local Server Dashboard
  openDashboardBtn.addEventListener('click', async () => {
    const settings = await HRStorage.getSettings();
    const serverUrl = settings.serverUrl || 'http://localhost:3000';
    const token = settings.authToken || '';
    const targetUrl = token ? `${serverUrl}?token=${encodeURIComponent(token)}` : serverUrl;

    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: targetUrl });
    } else {
      window.open(targetUrl, '_blank');
    }
  });

  // Helpers
  function showAlert(msg, type = 'success') {
    alertMessage.textContent = msg;
    fetchAlert.className = `alert ${type}`;
    fetchAlert.classList.remove('hidden');
  }

  function hideAlert() {
    fetchAlert.classList.add('hidden');
  }

  function escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m]));
  }
});
