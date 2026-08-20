/**
 * HackerRank Solutions - Popup Controller
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

  const metricTotalProblems = document.getElementById('metric-total-problems');
  const metricTotalSolutions = document.getElementById('metric-total-solutions');
  const metricTotalUsers = document.getElementById('metric-total-users');
  const openDashboardBtn = document.getElementById('open-dashboard-btn');

  let abortController = null;

  // Initialize Storage
  await HRStorage.init();
  await refreshDatabaseStats();
  checkAuth();

  // Load problem slugs list
  let problemSlugs = [];
  if (typeof HR_PROBLEM_SLUGS !== 'undefined' && Array.isArray(HR_PROBLEM_SLUGS)) {
    problemSlugs = HR_PROBLEM_SLUGS;
  } else {
    const problems = await HRStorage.getProblems();
    problemSlugs = Object.keys(problems);
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

  // Check HackerRank Authentication
  async function checkAuth() {
    authBadge.className = 'auth-badge checking';
    authBadge.innerHTML = '<span class="status-dot"></span><span class="status-text">Checking login...</span>';

    try {
      const auth = await HRAPI.checkAuthStatus();
      if (auth.isLoggedIn) {
        authBadge.className = 'auth-badge logged-in';
        authBadge.innerHTML = `<span class="status-dot"></span><span class="status-text">${auth.user ? escapeHtml(auth.user) : 'HackerRank Active'}</span>`;
        authBadge.title = 'Logged in to HackerRank. Ready to fetch solutions!';
      } else {
        authBadge.className = 'auth-badge logged-out';
        authBadge.innerHTML = '<span class="status-dot"></span><span class="status-text">Not Logged In</span>';
        authBadge.title = 'Click to open HackerRank login page in a new tab';
      }
    } catch (e) {
      authBadge.className = 'auth-badge logged-out';
      authBadge.innerHTML = '<span class="status-dot"></span><span class="status-text">Login Required</span>';
    }
  }

  // Click on auth badge to open HackerRank
  authBadge.addEventListener('click', () => {
    if (authBadge.classList.contains('logged-out')) {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.create({ url: 'https://www.hackerrank.com/login' });
      } else {
        window.open('https://www.hackerrank.com/login', '_blank');
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
    statTotalCount.textContent = String(problemSlugs.length);
    progressStatusText.textContent = `Downloading solutions for @${username}...`;

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

      // Save and merge solutions into storage
      const saveResult = await HRStorage.saveUserSolutions(username, result.solutions);
      await refreshDatabaseStats();

      // Notify background worker to refresh badge
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ type: 'REFRESH_BADGE' });
      }

      showAlert(
        `Success! Found ${result.solvedCount} solutions for @${username} (${saveResult.newlyAddedCount} new, ${saveResult.updatedCount} updated).`,
        'success'
      );
    } catch (err) {
      if (err.name === 'AbortError' || (abortController && abortController.signal.aborted)) {
        showAlert('Download cancelled by user.', 'error');
      } else {
        showAlert(err.message || 'Failed to fetch solutions. Ensure you are logged into HackerRank.', 'error');
      }
    } finally {
      fetchBtn.disabled = false;
      fetchBtn.innerHTML = '<span class="btn-icon">⚡</span><span class="btn-label">Fetch Solutions</span>';
      cancelBtn.classList.add('hidden');
      currentChallengeLabel.textContent = 'Completed';
    }
  });

  // Handle Cancel
  cancelBtn.addEventListener('click', () => {
    if (abortController) {
      abortController.abort();
    }
  });

  // Handle Open Dashboard
  openDashboardBtn.addEventListener('click', () => {
    const targetUser = usernameInput.value.trim();
    const query = targetUser ? `?user=${encodeURIComponent(targetUser)}` : '';
    const dashboardUrl = chrome.runtime ? chrome.runtime.getURL(`dashboard/dashboard.html${query}`) : `../dashboard/dashboard.html${query}`;

    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: dashboardUrl });
    } else {
      window.open(dashboardUrl, '_blank');
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
