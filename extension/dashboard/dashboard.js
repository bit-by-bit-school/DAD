/**
 * HackerRank Solutions Explorer - Full Page Dashboard Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Storage & State
  let problemsMap = {};
  let solutionsMap = {};
  let usersList = [];
  let problemSlugs = [];

  let selectedProblemSlug = null;
  let selectedUsername = null;
  let activeTab = 'code'; // 'code' | 'statement' | 'comparison'

  // DOM References
  const headerProblemCount = document.getElementById('header-problem-count');
  const headerSolutionCount = document.getElementById('header-solution-count');
  const headerUserCount = document.getElementById('header-user-count');
  const filteredProblemCount = document.getElementById('filtered-problem-count');

  const problemSearchInput = document.getElementById('problem-search');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const userFilter = document.getElementById('user-filter');
  const statusFilter = document.getElementById('status-filter');
  const difficultyFilter = document.getElementById('difficulty-filter');
  const languageFilter = document.getElementById('language-filter');
  const searchInCodeCheckbox = document.getElementById('search-in-code-checkbox');
  const problemListContainer = document.getElementById('problem-list');

  // Main Viewer
  const activeProblemTitle = document.getElementById('active-problem-title');
  const activeProblemDiff = document.getElementById('active-problem-difficulty');
  const activeProblemCat = document.getElementById('active-problem-category');
  const activeProblemLink = document.getElementById('active-problem-link');
  const activeSolveCount = document.getElementById('active-solve-count');
  const activeUserTags = document.getElementById('active-user-tags');

  // Tabs
  const tabCodeBtn = document.getElementById('tab-code-btn');
  const tabStatementBtn = document.getElementById('tab-statement-btn');
  const tabComparisonBtn = document.getElementById('tab-comparison-btn');
  const viewCode = document.getElementById('view-code');
  const viewStatement = document.getElementById('view-statement');
  const viewComparison = document.getElementById('view-comparison');

  const solutionUserTabs = document.getElementById('solution-user-tabs');
  const codeViewerContainer = document.getElementById('code-viewer-container');
  const statementContainer = document.getElementById('statement-container');
  const diffViewerContainer = document.getElementById('diff-viewer-container');
  const diffUserA = document.getElementById('diff-user-a');
  const diffUserB = document.getElementById('diff-user-b');

  const activeCodeLang = document.getElementById('active-code-lang');
  const activeCodeLines = document.getElementById('active-code-lines');
  const copyCodeBtn = document.getElementById('copy-code-btn');
  const copyBtnText = document.getElementById('copy-btn-text');
  const downloadCodeBtn = document.getElementById('download-code-btn');
  const emptyState = document.getElementById('empty-state');

  // Header Actions & Modal
  const headerFetchBtn = document.getElementById('header-fetch-btn');
  const exportBtn = document.getElementById('export-btn');
  const exportMenu = document.getElementById('export-menu');
  const exportJsonBtn = document.getElementById('export-json-btn');
  const importFileInput = document.getElementById('import-file-input');
  const resetSeedBtn = document.getElementById('reset-seed-btn');

  const fetchModal = document.getElementById('fetch-modal');
  const closeFetchModalBtn = document.getElementById('close-fetch-modal-btn');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  const modalFetchForm = document.getElementById('modal-fetch-form');
  const modalUsernameInput = document.getElementById('modal-username-input');
  const modalProgress = document.getElementById('modal-progress');
  const modalProgressStatus = document.getElementById('modal-progress-status');
  const modalProgressPercent = document.getElementById('modal-progress-percent');
  const modalProgressFill = document.getElementById('modal-progress-fill');
  const modalStatSolved = document.getElementById('modal-stat-solved');
  const modalStatSkipped = document.getElementById('modal-stat-skipped');
  const modalStatCurrent = document.getElementById('modal-stat-current');
  const modalStatTotal = document.getElementById('modal-stat-total');
  const modalAlert = document.getElementById('modal-alert');
  const modalSubmitBtn = document.getElementById('modal-submit-btn');

  // Initialize App
  await HRStorage.init();
  await loadData();

  // Check URL parameters for initial filter/selection
  const urlParams = new URLSearchParams(window.location.search);
  const initialUser = urlParams.get('user');
  const initialProblem = urlParams.get('problem');

  if (initialUser) {
    userFilter.value = initialUser;
  }

  renderFilters();
  renderProblemList();

  // Select initial problem
  if (initialProblem && problemsMap[initialProblem]) {
    selectProblem(initialProblem, initialUser);
  } else {
    // Select first problem in list that has solutions
    const firstSolved = Object.keys(problemsMap).find(slug => solutionsMap[slug] && Object.keys(solutionsMap[slug]).length > 0);
    if (firstSolved) {
      selectProblem(firstSolved, initialUser);
    } else if (problemSlugs.length > 0) {
      selectProblem(problemSlugs[0], initialUser);
    }
  }

  // Load Data from Storage
  async function loadData() {
    problemsMap = await HRStorage.getProblems();
    solutionsMap = await HRStorage.getSolutions();
    usersList = await HRStorage.getUsers();

    if (typeof HR_PROBLEM_SLUGS !== 'undefined' && Array.isArray(HR_PROBLEM_SLUGS)) {
      problemSlugs = HR_PROBLEM_SLUGS;
    } else {
      problemSlugs = Object.keys(problemsMap);
    }

    // Ensure all slugs exist in problemsMap
    for (const slug of problemSlugs) {
      if (!problemsMap[slug]) {
        problemsMap[slug] = {
          slug,
          title: slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          category: 'Algorithms',
          difficulty: 'Medium',
          url: `https://www.hackerrank.com/challenges/${slug}/problem`,
          solvedUsers: [],
          solvedCount: 0,
          hasStatement: false
        };
      }
    }

    updateHeaderMetrics();
  }

  function updateHeaderMetrics() {
    const totalProblems = Object.keys(problemsMap).length;
    let totalSolutions = 0;
    for (const slug of Object.keys(solutionsMap)) {
      totalSolutions += Object.keys(solutionsMap[slug]).length;
    }

    headerProblemCount.textContent = totalProblems;
    headerSolutionCount.textContent = totalSolutions;
    headerUserCount.textContent = usersList.length;
  }

  // Render Filter Dropdowns
  function renderFilters() {
    // Populate user filter
    const currentUserVal = userFilter.value;
    userFilter.innerHTML = '<option value="all">All Users (Any)</option>';
    usersList.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.username;
      opt.textContent = `@${u.username} (${u.solvedCount})`;
      userFilter.appendChild(opt);
    });
    if (currentUserVal) userFilter.value = currentUserVal;
  }

  // Filter and Render Problem List
  function renderProblemList() {
    const query = problemSearchInput.value.trim().toLowerCase();
    const selectedUser = userFilter.value;
    const selectedStatus = statusFilter.value;
    const selectedDiff = difficultyFilter.value;
    const selectedLang = languageFilter.value;
    const searchInCode = searchInCodeCheckbox.checked;

    clearSearchBtn.classList.toggle('hidden', !query);

    const filtered = problemSlugs.filter(slug => {
      const p = problemsMap[slug];
      const solObj = solutionsMap[slug] || {};
      const solvedUsers = Object.keys(solObj);
      const isSolved = solvedUsers.length > 0;

      // Status Filter
      if (selectedStatus === 'solved' && !isSolved) return false;
      if (selectedStatus === 'unsolved' && isSolved) return false;

      // User Filter
      if (selectedUser !== 'all') {
        if (!solObj[selectedUser]) return false;
      }

      // Difficulty Filter
      if (selectedDiff !== 'all') {
        if ((p.difficulty || 'Medium').toLowerCase() !== selectedDiff.toLowerCase()) return false;
      }

      // Language Filter
      if (selectedLang !== 'all') {
        const hasLang = Object.values(solObj).some(s => (s.language || '').toLowerCase() === selectedLang.toLowerCase());
        if (!hasLang) return false;
      }

      // Search Query
      if (query) {
        const titleMatch = (p.title || '').toLowerCase().includes(query);
        const slugMatch = slug.toLowerCase().includes(query);

        if (titleMatch || slugMatch) return true;

        if (searchInCode) {
          const codeMatch = Object.values(solObj).some(s => (s.code || '').toLowerCase().includes(query));
          if (codeMatch) return true;
        }

        return false;
      }

      return true;
    });

    filteredProblemCount.textContent = `Showing ${filtered.length} of ${problemSlugs.length} problems`;

    problemListContainer.innerHTML = '';

    if (filtered.length === 0) {
      problemListContainer.innerHTML = `
        <div class="empty-state" style="padding: 20px;">
          <p>No problems match your current filters.</p>
        </div>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();

    filtered.forEach(slug => {
      const p = problemsMap[slug];
      const solObj = solutionsMap[slug] || {};
      const solvedUsers = Object.keys(solObj);
      const isSolved = solvedUsers.length > 0;

      const item = document.createElement('div');
      item.className = `problem-item ${selectedProblemSlug === slug ? 'active' : ''}`;
      item.dataset.slug = slug;

      const diffClass = (p.difficulty || 'Medium').toLowerCase() === 'easy'
        ? 'badge-easy'
        : (p.difficulty || 'Medium').toLowerCase() === 'hard'
          ? 'badge-hard'
          : 'badge-medium';

      const userTagsHtml = solvedUsers.slice(0, 3).map(u => `<span class="user-mini-tag">@${escapeHtml(u)}</span>`).join('');
      const moreUsersCount = solvedUsers.length > 3 ? `<span class="user-mini-tag">+${solvedUsers.length - 3}</span>` : '';

      item.innerHTML = `
        <div class="problem-item-top">
          <span class="problem-item-title">${escapeHtml(p.title || slug)}</span>
          <span class="diff-badge ${diffClass}">${escapeHtml(p.difficulty || 'Med')}</span>
        </div>
        <div class="problem-item-bottom">
          <div class="problem-item-users">
            ${userTagsHtml}
            ${moreUsersCount}
          </div>
          <span class="solve-count-badge ${isSolved ? '' : 'unsolved'}">
            ${isSolved ? `✓ ${solvedUsers.length}` : '—'}
          </span>
        </div>
      `;

      item.addEventListener('click', () => {
        selectProblem(slug);
      });

      fragment.appendChild(item);
    });

    problemListContainer.appendChild(fragment);
  }

  // Select and Display a Problem
  async function selectProblem(slug, preferredUser = null) {
    selectedProblemSlug = slug;
    const p = problemsMap[slug];
    if (!p) return;

    // Highlight in list
    document.querySelectorAll('.problem-item').forEach(el => {
      el.classList.toggle('active', el.dataset.slug === slug);
    });

    emptyState.classList.add('hidden');

    // Update Header
    activeProblemTitle.textContent = p.title || slug;
    activeProblemDiff.textContent = p.difficulty || 'Medium';
    activeProblemDiff.className = `diff-badge ${
      (p.difficulty || 'Medium').toLowerCase() === 'easy'
        ? 'badge-easy'
        : (p.difficulty || 'Medium').toLowerCase() === 'hard'
          ? 'badge-hard'
          : 'badge-medium'
    }`;
    activeProblemCat.textContent = p.category || 'Algorithms';
    activeProblemLink.href = p.url || `https://www.hackerrank.com/challenges/${slug}/problem`;

    const solObj = solutionsMap[slug] || {};
    const solvedUsers = Object.keys(solObj);
    activeSolveCount.textContent = solvedUsers.length;

    // Render User Avatar Tags
    activeUserTags.innerHTML = '';
    if (solvedUsers.length === 0) {
      activeUserTags.innerHTML = '<span class="user-pill">No local solutions saved</span>';
    } else {
      solvedUsers.forEach(u => {
        const pill = document.createElement('span');
        pill.className = 'user-pill';
        pill.textContent = `@${u} (${solObj[u].language || 'py'})`;
        activeUserTags.appendChild(pill);
      });
    }

    // Determine active user for solution view
    if (preferredUser && solObj[preferredUser]) {
      selectedUsername = preferredUser;
    } else if (userFilter.value !== 'all' && solObj[userFilter.value]) {
      selectedUsername = userFilter.value;
    } else if (solvedUsers.length > 0) {
      selectedUsername = solvedUsers[0];
    } else {
      selectedUsername = null;
    }

    renderSolutionUserTabs(slug, solvedUsers);
    renderActiveSolutionCode(slug);
    renderProblemStatement(slug);
    renderDiffViewer(slug);
  }

  // Render Solution User Tabs
  function renderSolutionUserTabs(slug, solvedUsers) {
    solutionUserTabs.innerHTML = '';

    if (solvedUsers.length === 0) {
      solutionUserTabs.innerHTML = `
        <div style="font-size: 12px; color: var(--text-dim); padding: 4px;">
          No solutions recorded for this challenge. Click <strong>Fetch User Solutions</strong> to download.
        </div>
      `;
      return;
    }

    const solObj = solutionsMap[slug] || {};

    solvedUsers.forEach(u => {
      const sol = solObj[u];
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = `user-sol-tab ${selectedUsername === u ? 'active' : ''}`;
      tab.innerHTML = `
        <span>@${escapeHtml(u)}</span>
        <span class="user-lang-chip">${escapeHtml(sol.language || 'code')}</span>
      `;

      tab.addEventListener('click', () => {
        selectedUsername = u;
        document.querySelectorAll('.user-sol-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderActiveSolutionCode(slug);
      });

      solutionUserTabs.appendChild(tab);
    });
  }

  // Render Active Code
  function renderActiveSolutionCode(slug) {
    const solObj = solutionsMap[slug] || {};
    const solution = selectedUsername ? solObj[selectedUsername] : null;

    if (!solution || !solution.code) {
      codeViewerContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <h3>No Solution Available</h3>
          <p>No solution code found for the selected problem and user.</p>
        </div>
      `;
      activeCodeLang.textContent = 'None';
      activeCodeLines.textContent = '0 lines';
      return;
    }

    const code = solution.code;
    const lang = solution.language || HRAPI.detectLanguage(code);
    const lineCount = code.split('\n').length;

    activeCodeLang.textContent = lang;
    activeCodeLines.textContent = `${lineCount} lines`;

    codeViewerContainer.innerHTML = HRHighlighter.renderCodeWithLines(code, lang);
  }

  // Render Problem Statement
  async function renderProblemStatement(slug) {
    const p = problemsMap[slug];
    if (p && p.statementHtml) {
      statementContainer.innerHTML = p.statementHtml;
    } else {
      statementContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📖</div>
          <h3>Problem Statement</h3>
          <p>The problem statement has not been saved locally yet.</p>
          <div style="margin-top: 14px;">
            <a href="https://www.hackerrank.com/challenges/${slug}/problem" target="_blank" rel="noopener noreferrer" class="btn btn-emerald">
              Open Problem on HackerRank ↗
            </a>
          </div>
        </div>
      `;
    }
  }

  // Render Diff View
  function renderDiffViewer(slug) {
    const solObj = solutionsMap[slug] || {};
    const solvedUsers = Object.keys(solObj);

    diffUserA.innerHTML = '';
    diffUserB.innerHTML = '';

    if (solvedUsers.length < 2) {
      diffViewerContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚖️</div>
          <h3>Comparison Requires 2+ Solutions</h3>
          <p>This problem has ${solvedUsers.length} solution recorded. Fetch solutions from another user to compare them side-by-side.</p>
        </div>
      `;
      return;
    }

    solvedUsers.forEach(u => {
      const optA = document.createElement('option');
      optA.value = u;
      optA.textContent = `@${u} (${solObj[u].language})`;
      diffUserA.appendChild(optA);

      const optB = document.createElement('option');
      optB.value = u;
      optB.textContent = `@${u} (${solObj[u].language})`;
      diffUserB.appendChild(optB);
    });

    diffUserA.selectedIndex = 0;
    diffUserB.selectedIndex = 1;

    updateDiffComparison(slug);
  }

  function updateDiffComparison(slug) {
    const solObj = solutionsMap[slug] || {};
    const userA = diffUserA.value;
    const userB = diffUserB.value;

    const solA = solObj[userA];
    const solB = solObj[userB];

    if (!solA || !solB) return;

    diffViewerContainer.innerHTML = HRHighlighter.renderSideBySideDiff(
      solA.code,
      solB.code,
      solA.language,
      solB.language,
      `@${userA}`,
      `@${userB}`
    );
  }

  diffUserA.addEventListener('change', () => selectedProblemSlug && updateDiffComparison(selectedProblemSlug));
  diffUserB.addEventListener('change', () => selectedProblemSlug && updateDiffComparison(selectedProblemSlug));

  // Tab Navigation
  tabCodeBtn.addEventListener('click', () => switchTab('code'));
  tabStatementBtn.addEventListener('click', () => switchTab('statement'));
  tabComparisonBtn.addEventListener('click', () => switchTab('comparison'));

  function switchTab(tabName) {
    activeTab = tabName;

    tabCodeBtn.classList.toggle('active', tabName === 'code');
    tabStatementBtn.classList.toggle('active', tabName === 'statement');
    tabComparisonBtn.classList.toggle('active', tabName === 'comparison');

    viewCode.classList.toggle('active', tabName === 'code');
    viewStatement.classList.toggle('active', tabName === 'statement');
    viewComparison.classList.toggle('active', tabName === 'comparison');
  }

  // Copy Code Button
  copyCodeBtn.addEventListener('click', async () => {
    if (!selectedProblemSlug || !selectedUsername) return;
    const solObj = solutionsMap[selectedProblemSlug] || {};
    const sol = solObj[selectedUsername];
    if (sol && sol.code) {
      await navigator.clipboard.writeText(sol.code);
      copyBtnText.textContent = 'Copied!';
      copyCodeBtn.style.borderColor = 'var(--accent-green)';
      copyCodeBtn.style.color = 'var(--accent-green)';
      setTimeout(() => {
        copyBtnText.textContent = 'Copy Code';
        copyCodeBtn.style.borderColor = '';
        copyCodeBtn.style.color = '';
      }, 1500);
    }
  });

  // Download Code File
  downloadCodeBtn.addEventListener('click', () => {
    if (!selectedProblemSlug || !selectedUsername) return;
    const solObj = solutionsMap[selectedProblemSlug] || {};
    const sol = solObj[selectedUsername];
    if (!sol || !sol.code) return;

    const extMap = { python: 'py', javascript: 'js', cpp: 'cpp', java: 'java', c: 'c', ruby: 'rb', go: 'go', rust: 'rs' };
    const ext = extMap[(sol.language || '').toLowerCase()] || 'txt';
    const filename = `${selectedProblemSlug}_${selectedUsername}.${ext}`;

    const blob = new Blob([sol.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Search & Filter Event Listeners
  problemSearchInput.addEventListener('input', () => renderProblemList());
  clearSearchBtn.addEventListener('click', () => {
    problemSearchInput.value = '';
    renderProblemList();
    problemSearchInput.focus();
  });
  userFilter.addEventListener('change', () => renderProblemList());
  statusFilter.addEventListener('change', () => renderProblemList());
  difficultyFilter.addEventListener('change', () => renderProblemList());
  languageFilter.addEventListener('change', () => renderProblemList());
  searchInCodeCheckbox.addEventListener('change', () => renderProblemList());

  // Export / Backup Menu
  exportBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    exportMenu.classList.toggle('hidden');
  });

  document.addEventListener('click', () => {
    exportMenu.classList.add('hidden');
  });

  exportJsonBtn.addEventListener('click', async () => {
    const data = await HRStorage.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hackerrank_solutions_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  importFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await HRStorage.importData(json);
      await loadData();
      renderFilters();
      renderProblemList();
      alert('Data backup imported successfully!');
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    }
  });

  resetSeedBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset the database to original seed data?')) {
      await HRStorage.resetToSeed();
      await loadData();
      renderFilters();
      renderProblemList();
      if (selectedProblemSlug) selectProblem(selectedProblemSlug);
      alert('Database restored to default seed.');
    }
  });

  // Fetch Modal Handlers
  headerFetchBtn.addEventListener('click', () => {
    fetchModal.classList.remove('hidden');
    modalUsernameInput.focus();
  });

  closeFetchModalBtn.addEventListener('click', () => fetchModal.classList.add('hidden'));
  modalCancelBtn.addEventListener('click', () => fetchModal.classList.add('hidden'));

  modalFetchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = modalUsernameInput.value.trim();
    if (!username) return;

    modalAlert.classList.add('hidden');
    modalProgress.classList.remove('hidden');
    modalSubmitBtn.disabled = true;
    modalSubmitBtn.textContent = 'Fetching...';

    modalProgressFill.style.width = '0%';
    modalProgressPercent.textContent = '0%';
    modalStatSolved.textContent = '0';
    modalStatSkipped.textContent = '0';
    modalStatCurrent.textContent = '0';
    modalStatTotal.textContent = String(problemSlugs.length);
    modalProgressStatus.textContent = `Fetching solutions for @${username}...`;

    try {
      const result = await HRAPI.fetchUserSolutionsBatch(
        username,
        problemSlugs,
        (p) => {
          modalProgressFill.style.width = `${p.percent}%`;
          modalProgressPercent.textContent = `${p.percent}%`;
          modalStatSolved.textContent = String(p.solvedCount);
          modalStatSkipped.textContent = String(p.notFoundCount);
          modalStatCurrent.textContent = String(p.current);
          modalProgressStatus.textContent = `Checking: ${p.currentSlug}`;
        },
        { concurrency: 6, delayMs: 25 }
      );

      const saveResult = await HRStorage.saveUserSolutions(username, result.solutions);
      await loadData();
      renderFilters();
      renderProblemList();

      modalAlert.className = 'alert success';
      modalAlert.textContent = `Completed! Saved ${result.solvedCount} solutions (${saveResult.newlyAddedCount} new, ${saveResult.updatedCount} updated).`;
      modalAlert.classList.remove('hidden');

      userFilter.value = username;
      renderProblemList();
      if (selectedProblemSlug) selectProblem(selectedProblemSlug, username);
    } catch (err) {
      modalAlert.className = 'alert error';
      modalAlert.textContent = err.message || 'Download failed. Ensure you are logged into HackerRank.';
      modalAlert.classList.remove('hidden');
    } finally {
      modalSubmitBtn.disabled = false;
      modalSubmitBtn.textContent = 'Start Fetching';
    }
  });

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
