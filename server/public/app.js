/**
 * HackerRank Solutions Hub - Retro Digital SPA Application Controller
 */

(function () {
  // Global State
  const state = {
    currentToken: localStorage.getItem('hr_app_token') || 'hr_admin_master_token_2026',
    currentUser: null,
    solutions: [],
    activeSolution: null,
    editor: null,
    selectedCleverness: 0,
    selectedReadability: 0
  };

  // DOM Elements
  const navBtns = document.querySelectorAll('.nav-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const userInfoTag = document.getElementById('user-info-tag');
  const activeUserName = document.getElementById('active-user-name');
  const activeUserRole = document.getElementById('active-user-role');
  const openAuthModalBtn = document.getElementById('open-auth-modal-btn');
  const authModal = document.getElementById('auth-modal');
  const closeAuthModalBtn = document.getElementById('close-auth-modal-btn');
  const modalTokenInput = document.getElementById('modal-token-input');
  const btnLoginToken = document.getElementById('btn-login-token');

  // Solution Explorer DOM
  const filterSearch = document.getElementById('filter-search');
  const filterLanguage = document.getElementById('filter-language');
  const filterUser = document.getElementById('filter-user');
  const btnApplyFilters = document.getElementById('btn-apply-filters');
  const solutionsGrid = document.getElementById('solutions-grid');
  const solutionsCountBadge = document.getElementById('solutions-count-badge');

  // Solution Detail DOM
  const detailChallengeTitle = document.getElementById('detail-challenge-title');
  const detailLanguageTag = document.getElementById('detail-language-tag');
  const detailUserName = document.getElementById('detail-user-name');
  const avgClevernessVal = document.getElementById('avg-cleverness-val');
  const avgReadabilityVal = document.getElementById('avg-readability-val');
  const btnSubmitRating = document.getElementById('btn-submit-rating');
  const commentInput = document.getElementById('comment-input');
  const btnPostComment = document.getElementById('btn-post-comment');
  const commentsContainer = document.getElementById('comments-container');

  // Reviews DOM
  const reviewSolutionPicker = document.getElementById('review-solution-picker');
  const btnGenerateAiDraft = document.getElementById('btn-generate-ai-draft');
  const aiDraftOutput = document.getElementById('ai-draft-output');
  const reviewStatusSelect = document.getElementById('review-status-select');
  const adminReviewNotes = document.getElementById('admin-review-notes');
  const btnPublishReviewRound = document.getElementById('btn-publish-review-round');
  const reviewRoundsTimeline = document.getElementById('review-rounds-timeline');
  const reviewAdminStatusTag = document.getElementById('review-admin-status-tag');

  // Admin DOM
  const adminAccessWarning = document.getElementById('admin-access-warning');
  const adminDashboardBody = document.getElementById('admin-dashboard-body');
  const formCreateToken = document.getElementById('form-create-token');
  const tokenUsernameInput = document.getElementById('token-username-input');
  const tokenRoleSelect = document.getElementById('token-role-select');
  const adminUsersList = document.getElementById('admin-users-list');
  const unmappedDiscordContainer = document.getElementById('unmapped-discord-container');

  // Initialize Application
  document.addEventListener('DOMContentLoaded', async () => {
    // Check URL parameters for token or discord login
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (tokenParam) {
      state.currentToken = tokenParam;
      localStorage.setItem('hr_app_token', tokenParam);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    initMonaco();
    setupEventListeners();
    await verifyAuth();
    await loadSolutions();
  });

  // Monaco Editor Initialization
  function initMonaco() {
    if (typeof require !== 'undefined') {
      require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
      require(['vs/editor/editor.main'], function () {
        state.editor = monaco.editor.create(document.getElementById('monaco-editor'), {
          value: '// Select a solution to view source code',
          language: 'python',
          theme: 'vs-dark',
          readOnly: true,
          minimap: { enabled: false },
          automaticLayout: true,
          fontFamily: "'Fira Code', 'Share Tech Mono', monospace",
          fontSize: 13
        });
      });
    }
  }

  // Event Listeners
  function setupEventListeners() {
    // Navigation tabs
    navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        navBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(targetTab).classList.add('active');

        if (targetTab === 'tab-detail' && state.editor) {
          setTimeout(() => state.editor.layout(), 100);
        }
        if (targetTab === 'tab-admin') {
          loadAdminPanel();
        }
      });
    });

    // Modal controls
    openAuthModalBtn.addEventListener('click', () => authModal.classList.add('active'));
    closeAuthModalBtn.addEventListener('click', () => authModal.classList.remove('active'));
    
    btnLoginToken.addEventListener('click', async () => {
      const token = modalTokenInput.value.trim();
      if (!token) return alert('Please enter a valid token');
      state.currentToken = token;
      localStorage.setItem('hr_app_token', token);
      authModal.classList.remove('active');
      await verifyAuth();
      await loadSolutions();
    });

    // Filters
    btnApplyFilters.addEventListener('click', () => loadSolutions());

    // Star Selectors
    setupStarSelectors();

    // Rating Submit
    btnSubmitRating.addEventListener('click', submitRating);

    // Comment Submit
    btnPostComment.addEventListener('click', postComment);

    // Review picker
    reviewSolutionPicker.addEventListener('change', (e) => loadReviewSolutionDetails(e.target.value));

    // AI Draft Generator
    btnGenerateAiDraft.addEventListener('click', generateAiDraft);

    // Publish Review Round
    btnPublishReviewRound.addEventListener('click', publishReviewRound);

    // Admin Token Form
    formCreateToken.addEventListener('submit', createToken);
  }

  // Star Rating Input Logic
  function setupStarSelectors() {
    const cleverStars = document.querySelectorAll('#star-cleverness-selector .star-btn');
    const readStars = document.querySelectorAll('#star-readability-selector .star-btn');

    cleverStars.forEach(btn => {
      btn.addEventListener('click', () => {
        state.selectedCleverness = parseInt(btn.dataset.val);
        cleverStars.forEach(b => b.classList.toggle('active', parseInt(b.dataset.val) <= state.selectedCleverness));
      });
    });

    readStars.forEach(btn => {
      btn.addEventListener('click', () => {
        state.selectedReadability = parseInt(btn.dataset.val);
        readStars.forEach(b => b.classList.toggle('active', parseInt(b.dataset.val) <= state.selectedReadability));
      });
    });
  }

  // Auth Verification
  async function verifyAuth() {
    try {
      const res = await fetch('/api/auth/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: state.currentToken })
      });
      const data = await res.json();
      if (res.ok && data.user) {
        state.currentUser = data.user;
        activeUserName.textContent = `@${data.user.username}`;
        activeUserRole.textContent = data.user.role;
        activeUserRole.className = `role-badge ${data.user.role.toLowerCase()}`;
      } else {
        // Fallback to guest
        state.currentUser = { username: 'Guest', role: 'USER' };
        activeUserName.textContent = 'Guest User';
        activeUserRole.textContent = 'USER';
      }
    } catch (err) {
      console.warn('Auth check error:', err);
    }
  }

  // Fetch Solutions
  async function loadSolutions() {
    solutionsGrid.innerHTML = '<div class="glass-panel" style="grid-column: 1 / -1; text-align: center;">Loading solutions...</div>';

    const params = new URLSearchParams();
    if (filterSearch.value.trim()) params.append('search', filterSearch.value.trim());
    if (filterLanguage.value) params.append('language', filterLanguage.value);
    if (filterUser.value.trim()) params.append('userId', filterUser.value.trim());

    try {
      const res = await fetch(`/api/solutions?${params.toString()}`);
      const data = await res.json();
      state.solutions = data.solutions || [];
      solutionsCountBadge.textContent = `${state.solutions.length} Solutions Found`;

      renderSolutionsGrid(state.solutions);
      populateReviewPicker(state.solutions);
    } catch (err) {
      solutionsGrid.innerHTML = `<div class="glass-panel" style="grid-column: 1 / -1; color: var(--neon-pink);">Failed to load solutions: ${err.message}</div>`;
    }
  }

  // Render Solutions Grid Cards
  function renderSolutionsGrid(solutions) {
    if (solutions.length === 0) {
      solutionsGrid.innerHTML = '<div class="glass-panel" style="grid-column: 1 / -1; text-align: center; color: var(--text-muted);">No solutions match the specified filters.</div>';
      return;
    }

    solutionsGrid.innerHTML = '';
    solutions.forEach(sol => {
      const card = document.createElement('div');
      card.className = 'solution-card';
      
      const cleverStars = sol.clevernessAvg ? `★ ${sol.clevernessAvg}` : 'Unrated';
      const readStars = sol.readabilityAvg ? `★ ${sol.readabilityAvg}` : 'Unrated';
      const reviewsCount = sol._count?.reviewRounds || 0;

      card.innerHTML = `
        <div>
          <div class="sol-header">
            <div class="sol-title">${escapeHtml(sol.challengeTitle)}</div>
            <span class="lang-tag">${escapeHtml(sol.language)}</span>
          </div>
          <div class="sol-meta">
            <span>By <strong>@${escapeHtml(sol.user?.username || 'unknown')}</strong></span>
            <span>•</span>
            <span>Score: ${sol.score || 1.0}</span>
          </div>
        </div>

        <div class="sol-ratings-summary">
          <div class="rating-badge">
            <span class="star-icon">🧠</span> Clever: ${cleverStars}
          </div>
          <div class="rating-badge">
            <span class="star-icon">📖</span> Read: ${readStars}
          </div>
          <div class="rating-badge" style="margin-left: auto;">
            🤖 Reviews: ${reviewsCount}
          </div>
        </div>
      `;

      card.addEventListener('click', () => openSolutionDetail(sol.id));
      solutionsGrid.appendChild(card);
    });
  }

  // Open Solution Detail Tab
  async function openSolutionDetail(id) {
    try {
      const res = await fetch(`/api/solutions/${id}`);
      const data = await res.json();
      const sol = data.solution;
      state.activeSolution = sol;

      detailChallengeTitle.textContent = sol.challengeTitle;
      detailLanguageTag.textContent = sol.language.toUpperCase();
      detailUserName.textContent = `@${sol.user?.username || 'unknown'}`;

      avgClevernessVal.textContent = sol.clevernessAvg ? `${sol.clevernessAvg} / 5` : '-- / 5';
      avgReadabilityVal.textContent = sol.readabilityAvg ? `${sol.readabilityAvg} / 5` : '-- / 5';

      // Load code into Monaco editor
      if (state.editor) {
        let monacoLang = 'python';
        if (sol.language.includes('cpp')) monacoLang = 'cpp';
        else if (sol.language.includes('java')) monacoLang = 'java';
        else if (sol.language.includes('js') || sol.language.includes('javascript')) monacoLang = 'javascript';
        
        monaco.editor.setModelLanguage(state.editor.getModel(), monacoLang);
        state.editor.setValue(sol.code || '');
      }

      renderComments(sol.comments || []);

      // Switch tab
      document.querySelector('[data-tab="tab-detail"]').click();
    } catch (err) {
      alert('Failed to load solution details: ' + err.message);
    }
  }

  // Submit Rating Handler
  async function submitRating() {
    if (!state.activeSolution) return alert('No solution selected');
    if (!state.selectedCleverness || !state.selectedReadability) {
      return alert('Please select ratings for both Cleverness and Readability (1 to 5 stars)');
    }

    try {
      const res = await fetch(`/api/solutions/${state.activeSolution.id}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.currentToken}`
        },
        body: JSON.stringify({
          cleverness: state.selectedCleverness,
          readability: state.selectedReadability
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert('Rating submitted successfully!');
        await openSolutionDetail(state.activeSolution.id);
      } else {
        alert('Rating failed: ' + data.error);
      }
    } catch (err) {
      alert('Error submitting rating: ' + err.message);
    }
  }

  // Comments Renderer & Submit Handler
  function renderComments(comments) {
    if (comments.length === 0) {
      commentsContainer.innerHTML = '<div style="font-size: 0.8rem; color: var(--text-muted); text-align: center;">No comments yet. Be the first to comment!</div>';
      return;
    }

    commentsContainer.innerHTML = '';
    comments.forEach(c => {
      const item = document.createElement('div');
      item.className = 'comment-item';
      item.innerHTML = `
        <div class="comment-header">
          <span class="comment-user">@${escapeHtml(c.user?.username || 'User')} ${c.user?.role === 'ADMIN' ? '<span class="role-badge admin">ADMIN</span>' : ''}</span>
          <span>${new Date(c.createdAt).toLocaleString()}</span>
        </div>
        <div style="color: #fff;">${escapeHtml(c.content)}</div>
      `;
      commentsContainer.appendChild(item);
    });
  }

  async function postComment() {
    if (!state.activeSolution) return alert('No solution selected');
    const content = commentInput.value.trim();
    if (!content) return;

    try {
      const res = await fetch(`/api/solutions/${state.activeSolution.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.currentToken}`
        },
        body: JSON.stringify({ content })
      });

      const data = await res.json();
      if (res.ok) {
        commentInput.value = '';
        await openSolutionDetail(state.activeSolution.id);
      } else {
        alert('Failed to post comment: ' + data.error);
      }
    } catch (err) {
      alert('Error posting comment: ' + err.message);
    }
  }

  // CODE REVIEWS
  function populateReviewPicker(solutions) {
    reviewSolutionPicker.innerHTML = '<option value="">-- Choose a Solution from Database --</option>';
    solutions.forEach(sol => {
      const opt = document.createElement('option');
      opt.value = sol.id;
      opt.textContent = `${sol.challengeTitle} (@${sol.user?.username || 'unknown'} - ${sol.language})`;
      reviewSolutionPicker.appendChild(opt);
    });
  }

  async function loadReviewSolutionDetails(solutionId) {
    if (!solutionId) return;

    try {
      const res = await fetch(`/api/solutions/${solutionId}`);
      const data = await res.json();
      const sol = data.solution;

      renderReviewRoundsTimeline(sol.reviewRounds || []);
    } catch (err) {
      console.error('Error loading review details:', err);
    }
  }

  function renderReviewRoundsTimeline(rounds) {
    if (rounds.length === 0) {
      reviewRoundsTimeline.innerHTML = '<div style="font-size: 0.85rem; color: var(--text-muted); text-align: center;">No review rounds recorded yet. Use the Gemini AI Assistant on the left to start Round 1.</div>';
      return;
    }

    reviewRoundsTimeline.innerHTML = '';
    rounds.forEach(r => {
      const item = document.createElement('div');
      item.className = `timeline-item ${r.status.toLowerCase()}`;
      
      let parsedGemini = null;
      try {
        if (r.geminiDraft) parsedGemini = JSON.parse(r.geminiDraft);
      } catch (e) {}

      item.innerHTML = `
        <div class="timeline-header">
          <strong>Round ${r.roundNumber} - ${r.status}</strong>
          <span style="color: var(--text-muted);">${new Date(r.createdAt).toLocaleDateString()}</span>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.4rem;">Reviewed by @${r.reviewer?.username || 'Admin'}</div>
        <div style="color: #fff; font-size: 0.85rem; background: rgba(0,0,0,0.3); padding: 0.5rem; border-radius: 4px; margin-bottom: 0.4rem;">
          ${escapeHtml(r.adminNotes)}
        </div>
        ${parsedGemini && parsedGemini.complexity ? `<div style="font-size: 0.75rem; color: var(--neon-cyan);">Complexity: ${escapeHtml(parsedGemini.complexity)}</div>` : ''}
      `;
      reviewRoundsTimeline.appendChild(item);
    });
  }

  async function generateAiDraft() {
    const solutionId = reviewSolutionPicker.value;
    if (!solutionId) return alert('Please select a solution from the dropdown first');

    aiDraftOutput.textContent = ' querying Gemini 1.5 Flash AI Assistant for code analysis...';

    try {
      const res = await fetch(`/api/solutions/${solutionId}/review/draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.currentToken}`
        }
      });

      const data = await res.json();
      if (res.ok) {
        aiDraftOutput.textContent = data.draft;
        adminReviewNotes.value = `Gemini AI Analysis:\n${data.draft}`;
      } else {
        aiDraftOutput.textContent = `Error: ${data.error}`;
      }
    } catch (err) {
      aiDraftOutput.textContent = `Failed to generate draft: ${err.message}`;
    }
  }

  async function publishReviewRound() {
    const solutionId = reviewSolutionPicker.value;
    if (!solutionId) return alert('Please select a solution to review');
    
    const status = reviewStatusSelect.value;
    const adminNotes = adminReviewNotes.value.trim();

    if (!adminNotes) return alert('Please write feedback notes in the box before publishing');

    try {
      // Get current round count
      const roundsRes = await fetch(`/api/solutions/${solutionId}/reviews`, {
        headers: { 'Authorization': `Bearer ${state.currentToken}` }
      });
      const roundsData = await roundsRes.json();
      const nextRoundNumber = (roundsData.rounds?.length || 0) + 1;

      const res = await fetch(`/api/solutions/${solutionId}/review/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.currentToken}`
        },
        body: JSON.stringify({
          roundNumber: nextRoundNumber,
          status,
          adminNotes,
          geminiDraft: aiDraftOutput.textContent
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert(`Published Review Round ${nextRoundNumber} successfully!`);
        adminReviewNotes.value = '';
        await loadReviewSolutionDetails(solutionId);
      } else {
        alert('Failed to publish review: ' + data.error);
      }
    } catch (err) {
      alert('Error publishing review: ' + err.message);
    }
  }

  // ADMIN CONTROL PANEL
  async function loadAdminPanel() {
    if (!state.currentUser || state.currentUser.role !== 'ADMIN') {
      adminAccessWarning.style.display = 'block';
      adminDashboardBody.style.display = 'none';
      return;
    }

    adminAccessWarning.style.display = 'none';
    adminDashboardBody.style.display = 'block';

    await loadAdminUsers();
    await loadUnmappedDiscords();
  }

  async function loadAdminUsers() {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${state.currentToken}` }
      });
      const data = await res.json();
      
      if (data.users) {
        renderAdminUsersList(data.users);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    }
  }

  function renderAdminUsersList(users) {
    adminUsersList.innerHTML = '';
    users.forEach(u => {
      const item = document.createElement('div');
      item.style.cssText = 'background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); padding: 0.6rem 0.8rem; border-radius: var(--radius-sm); font-size: 0.8rem; display: flex; justify-content: space-between; align-items: center;';
      
      item.innerHTML = `
        <div>
          <div><strong>@${escapeHtml(u.username)}</strong> <span class="role-badge ${u.role.toLowerCase()}">${u.role}</span></div>
          <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">Token: <code>${u.token}</code></div>
          ${u.discordUsername ? `<div style="font-size: 0.7rem; color: var(--neon-cyan);">Discord: ${escapeHtml(u.discordUsername)}</div>` : ''}
        </div>
        <button class="btn-retro btn-pink" style="font-size: 0.7rem; padding: 2px 6px;" onclick="copyToken('${u.token}')">Copy Token</button>
      `;
      adminUsersList.appendChild(item);
    });
  }

  window.copyToken = function(t) {
    navigator.clipboard.writeText(t);
    alert('Token copied to clipboard!');
  };

  async function createToken(e) {
    e.preventDefault();
    const username = tokenUsernameInput.value.trim();
    const role = tokenRoleSelect.value;

    if (!username) return;

    try {
      const res = await fetch('/api/admin/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.currentToken}`
        },
        body: JSON.stringify({ username, role })
      });

      const data = await res.json();
      if (res.ok) {
        alert(`Token created for @${data.user.username}!\nToken: ${data.user.token}`);
        tokenUsernameInput.value = '';
        await loadAdminUsers();
      } else {
        alert('Failed to create token: ' + data.error);
      }
    } catch (err) {
      alert('Error creating token: ' + err.message);
    }
  }

  async function loadUnmappedDiscords() {
    try {
      const res = await fetch('/api/admin/unmapped-discords', {
        headers: { 'Authorization': `Bearer ${state.currentToken}` }
      });
      const data = await res.json();

      if (data.unmapped) {
        renderUnmappedDiscords(data.unmapped);
      }
    } catch (err) {
      console.error('Error loading unmapped discords:', err);
    }
  }

  function renderUnmappedDiscords(unmappedList) {
    if (unmappedList.length === 0) {
      unmappedDiscordContainer.innerHTML = '<div style="font-size: 0.85rem; color: var(--text-muted); text-align: center;">No pending Discord sign-ins to map.</div>';
      return;
    }

    unmappedDiscordContainer.innerHTML = '';
    unmappedList.forEach(item => {
      const card = document.createElement('div');
      card.style.cssText = 'background: rgba(0,0,0,0.3); border: 1px solid var(--neon-pink); padding: 0.75rem; border-radius: var(--radius-sm); font-size: 0.8rem;';

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <div>
            <strong style="color: var(--neon-pink);">👾 ${escapeHtml(item.discordUsername)}</strong>
            <div style="font-size: 0.7rem; color: var(--text-muted);">ID: ${item.discordId}</div>
          </div>
          <span style="font-size: 0.7rem; color: var(--text-muted);">${new Date(item.loggedInAt).toLocaleDateString()}</span>
        </div>

        <div style="display: flex; gap: 0.4rem;">
          <input type="text" id="map-target-user-${item.discordId}" class="form-control" placeholder="Target App User ID" style="font-size: 0.75rem; padding: 4px;" />
          <button class="btn-retro btn-green" style="font-size: 0.75rem; padding: 4px 8px;" onclick="mapDiscord('${item.discordId}')">Map User</button>
        </div>
      `;
      unmappedDiscordContainer.appendChild(card);
    });
  }

  window.mapDiscord = async function(discordId) {
    const targetUserId = document.getElementById(`map-target-user-${discordId}`).value.trim();
    if (!targetUserId) return alert('Please enter target User ID to map');

    try {
      const res = await fetch('/api/admin/map-discord', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.currentToken}`
        },
        body: JSON.stringify({ discordId, userId: targetUserId })
      });

      const data = await res.json();
      if (res.ok) {
        alert('Discord user mapped successfully!');
        await loadUnmappedDiscords();
        await loadAdminUsers();
      } else {
        alert('Failed to map Discord user: ' + data.error);
      }
    } catch (err) {
      alert('Error mapping Discord user: ' + err.message);
    }
  };

  // Helper
  function escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m]));
  }
})();
