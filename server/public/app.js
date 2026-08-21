/**
 * HackerRank Solutions Hub - Retro Digital SPA Application Controller
 */

(function () {
  // Global State
  const state = {
    currentToken: localStorage.getItem('hr_app_token') || null,
    currentUser: null,
    solutions: [],
    activeSolution: null,
    editor: null,
    editorDecorations: [],
    editorDraftDecorations: [],
    editorHoverDecorations: [],
    viewZoneIds: [],
    collapsedZones: new Set(),
    activeDraftComments: [],
    activeInlineLine: null,
    showSelectionTooltip: false,
    currentSelection: { startLine: 1, endLine: 1 },
    commentFilter: 'all', // 'all', 'line', 'general'
    selectedCleverness: 0,
    selectedReadability: 0,
    // Infinite Scroll & Offset State
    offset: 0,
    limit: 30,
    hasMore: true,
    isLoading: false,
    totalCount: 0
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
  const btnLogoutToken = document.getElementById('btn-logout-token');

  // Solution Explorer DOM
  const filterSearch = document.getElementById('filter-search');
  const filterLanguage = document.getElementById('filter-language');
  const btnApplyFilters = document.getElementById('btn-apply-filters');
  const solutionsGrid = document.getElementById('solutions-grid');
  const solutionsCountBadge = document.getElementById('solutions-count-badge');
  const infiniteScrollSentinel = document.getElementById('infinite-scroll-sentinel');

  // Multiselect Users Controller
  const multiselectUser = {
    wrapper: document.getElementById('multiselect-user-wrapper'),
    btn: document.getElementById('multiselect-user-btn'),
    label: document.getElementById('multiselect-user-label'),
    dropdown: document.getElementById('multiselect-user-dropdown'),
    searchInput: document.getElementById('multiselect-user-search'),
    selectAllBtn: document.getElementById('multiselect-select-all'),
    clearAllBtn: document.getElementById('multiselect-clear-all'),
    optionsContainer: document.getElementById('multiselect-user-options'),
    usersList: [],
    selectedUsernames: new Set(),

    async init() {
      if (!this.wrapper) return;
      this.btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = this.dropdown.classList.contains('hidden');
        if (isHidden) {
          this.dropdown.classList.remove('hidden');
          this.wrapper.classList.add('open');
          this.searchInput.focus();
        } else {
          this.close();
        }
      });

      document.addEventListener('click', (e) => {
        if (!this.wrapper.contains(e.target)) {
          this.close();
        }
      });

      this.searchInput.addEventListener('input', () => {
        this.renderOptions();
      });

      this.selectAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.usersList.forEach(u => this.selectedUsernames.add(u.username));
        this.renderOptions();
        this.updateButtonLabel();
      });

      this.clearAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedUsernames.clear();
        this.renderOptions();
        this.updateButtonLabel();
      });

      await this.fetchUsers();
    },

    close() {
      if (this.dropdown) this.dropdown.classList.add('hidden');
      if (this.wrapper) this.wrapper.classList.remove('open');
    },

    async fetchUsers() {
      try {
        const res = await fetch('/api/users');
        const data = await res.json();
        this.usersList = data.users || [];
        this.renderOptions();
        this.updateButtonLabel();
      } catch (e) {
        console.warn('Error fetching users for multiselect:', e);
      }
    },

    renderOptions() {
      if (!this.optionsContainer) return;
      const searchTerm = this.searchInput.value.trim().toLowerCase();
      this.optionsContainer.innerHTML = '';

      const filtered = this.usersList.filter(u => u.username.toLowerCase().includes(searchTerm));

      if (filtered.length === 0) {
        this.optionsContainer.innerHTML = '<div style="font-size: 0.75rem; color: var(--text-muted); padding: 0.4rem; text-align: center;">No users found</div>';
        return;
      }

      filtered.forEach(u => {
        const isChecked = this.selectedUsernames.has(u.username);
        const label = document.createElement('label');
        label.className = 'multiselect-option';

        const solCount = u._count?.solutions !== undefined ? ` (${u._count.solutions})` : '';

        label.innerHTML = `
          <input type="checkbox" value="${escapeHtml(u.username)}" ${isChecked ? 'checked' : ''}>
          <span>@${escapeHtml(u.username)}${solCount}</span>
        `;

        const cb = label.querySelector('input');
        cb.addEventListener('change', (e) => {
          if (e.target.checked) {
            this.selectedUsernames.add(u.username);
          } else {
            this.selectedUsernames.delete(u.username);
          }
          this.updateButtonLabel();
        });

        this.optionsContainer.appendChild(label);
      });
    },

    updateButtonLabel() {
      if (!this.label) return;
      const count = this.selectedUsernames.size;
      if (count === 0 || count === this.usersList.length) {
        this.label.textContent = 'All Users (Any)';
      } else if (count === 1) {
        const singleName = Array.from(this.selectedUsernames)[0];
        this.label.textContent = `@${singleName}`;
      } else {
        this.label.innerHTML = `${count} Users Selected <span class="multiselect-badge-count">${count}</span>`;
      }
    },

    getSelectedUsernames() {
      return Array.from(this.selectedUsernames);
    }
  };

  // Merged Solution & Review Workspace DOM
  const detailChallengeTitle = document.getElementById('detail-challenge-title');
  const detailLanguageTag = document.getElementById('detail-language-tag');
  const detailUserName = document.getElementById('detail-user-name');
  const detailReviewStatusBadge = document.getElementById('detail-review-status-badge');
  const monacoSelectionBadge = document.getElementById('monaco-selection-badge');
  const avgClevernessVal = document.getElementById('avg-cleverness-val');
  const avgReadabilityVal = document.getElementById('avg-readability-val');
  const btnSubmitRating = document.getElementById('btn-submit-rating');
  const commentInput = document.getElementById('comment-input');
  const btnPostComment = document.getElementById('btn-post-comment');
  const commentsContainer = document.getElementById('comments-container');
  const btnGenerateAiDraft = document.getElementById('btn-generate-ai-draft');
  const aiDraftOutput = document.getElementById('ai-draft-output');
  const reviewStatusSelect = document.getElementById('review-status-select');
  const adminReviewNotes = document.getElementById('admin-review-notes');
  const btnPublishReviewRound = document.getElementById('btn-publish-review-round');
  const reviewRoundsTimeline = document.getElementById('review-rounds-timeline');

  // AI Draft Line Comments DOM
  const aiDraftCommentsWrapper = document.getElementById('ai-draft-comments-wrapper');
  const aiDraftCommentsList = document.getElementById('ai-draft-comments-list');
  const draftCommentsCount = document.getElementById('draft-comments-count');
  const btnApproveAllDrafts = document.getElementById('btn-approve-all-drafts');
  const btnRejectAllDrafts = document.getElementById('btn-reject-all-drafts');

  // Admin DOM
  const navAdminBtn = document.getElementById('nav-admin-btn');
  const adminDashboardBody = document.getElementById('admin-dashboard-body');
  const formCreateToken = document.getElementById('form-create-token');
  const tokenUsernameInput = document.getElementById('token-username-input');
  const tokenDiscordInput = document.getElementById('token-discord-input');
  const tokenRoleSelect = document.getElementById('token-role-select');
  const adminUsersList = document.getElementById('admin-users-list');
  const unmappedDiscordContainer = document.getElementById('unmapped-discord-container');
  const formAdvanceDiscordMap = document.getElementById('form-advance-discord-map');
  const advanceMapUserSelect = document.getElementById('advance-map-user-select');
  const advanceMapDiscordUsername = document.getElementById('advance-map-discord-username');

  // Initialize Application
  document.addEventListener('DOMContentLoaded', async () => {
    // Check URL parameters for token or discord login
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (tokenParam) {
      state.currentToken = tokenParam;
      localStorage.setItem('hr_app_token', tokenParam);
    }

    initMonaco();
    setupEventListeners();
    await multiselectUser.init();
    await verifyAuth();
    initNotificationSystem();
    virtualGrid.init();
    setupInfiniteScroll();

    await restoreStateFromUrl();
    await loadSolutions({ append: false });
  });

  window.addEventListener('popstate', () => {
    restoreStateFromUrl();
  });

  // URL State Management Helpers
  function updateUrlState(options = {}) {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    const activeTabEl = document.querySelector('.tab-content.active');
    const activeTabId = options.tab || (activeTabEl ? activeTabEl.id : 'tab-explorer');
    const tabShortName = activeTabId.replace('tab-', '');

    const newParams = new URLSearchParams();

    if (token) {
      newParams.set('token', token);
    }

    newParams.set('tab', tabShortName);

    const solId = options.solutionId !== undefined ? options.solutionId : (state.activeSolution ? state.activeSolution.id : null);
    if (tabShortName === 'detail' && solId) {
      newParams.set('solutionId', solId);

      const activeSubtabEl = document.querySelector('.sidebar-subtab-content.active');
      if (activeSubtabEl) {
        newParams.set('subtab', activeSubtabEl.id.replace('subtab-', ''));
      }
    }

    if (filterSearch && filterSearch.value.trim()) {
      newParams.set('search', filterSearch.value.trim());
    }
    if (filterLanguage && filterLanguage.value) {
      newParams.set('language', filterLanguage.value);
    }
    if (multiselectUser) {
      const selectedUsers = multiselectUser.getSelectedUsernames();
      if (selectedUsers.length > 0 && selectedUsers.length < multiselectUser.usersList.length) {
        newParams.set('users', selectedUsers.join(','));
      }
    }

    const newQuery = newParams.toString();
    const newUrl = window.location.pathname + (newQuery ? `?${newQuery}` : '');
    if (window.location.search !== `?${newQuery}`) {
      if (options.replace) {
        window.history.replaceState(null, '', newUrl);
      } else {
        window.history.pushState(null, '', newUrl);
      }
    }
  }

  function activateTab(targetTabId, updateUrl = true) {
    const btn = document.querySelector(`.nav-btn[data-tab="${targetTabId}"]`);
    navBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const content = document.getElementById(targetTabId);
    if (content) content.classList.add('active');

    if (targetTabId === 'tab-detail' && state.editor) {
      setTimeout(() => state.editor.layout(), 100);
    }
    if (targetTabId === 'tab-admin') {
      loadAdminPanel();
    }
    if (updateUrl) {
      updateUrlState({ tab: targetTabId });
    }
  }

  function activateSidebarSubtab(targetSubtabId, updateUrl = true) {
    const btn = document.querySelector(`.sidebar-tab-btn[data-subtab="${targetSubtabId}"]`);
    document.querySelectorAll('.sidebar-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.sidebar-subtab-content').forEach(s => s.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const activeContent = document.getElementById(targetSubtabId);
    if (activeContent) activeContent.classList.add('active');

    if (updateUrl) {
      updateUrlState();
    }
  }

  async function restoreStateFromUrl() {
    const params = new URLSearchParams(window.location.search);

    const searchVal = params.get('search') || '';
    if (filterSearch) filterSearch.value = searchVal;

    const langVal = params.get('language') || '';
    if (filterLanguage) filterLanguage.value = langVal;

    const usersVal = params.get('users') || '';
    if (usersVal && multiselectUser) {
      const usernames = usersVal.split(',').map(u => u.trim()).filter(Boolean);
      multiselectUser.selectedUsernames = new Set(usernames);
      multiselectUser.renderOptions();
      multiselectUser.updateButtonLabel();
    }

    const solutionId = params.get('solutionId') || params.get('solution') || params.get('id');
    const tabParam = params.get('tab') || (solutionId ? 'detail' : 'explorer');
    const targetTabId = tabParam.startsWith('tab-') ? tabParam : `tab-${tabParam}`;

    activateTab(targetTabId, false);

    if (solutionId) {
      await openSolutionDetail(solutionId, false);
    }

    const subtabParam = params.get('subtab');
    if (subtabParam) {
      const targetSubtabId = subtabParam.startsWith('subtab-') ? subtabParam : `subtab-${subtabParam}`;
      activateSidebarSubtab(targetSubtabId, false);
    }
  }

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
          glyphMargin: true,
          fontFamily: "'Fira Code', 'Share Tech Mono', monospace",
          fontSize: 13
        });

        setupSelectionTooltipWidget();

        // Gutter click listener: clicking line numbers or glyph dots opens inline review comment thread
        state.editor.onMouseDown((e) => {
          if (e && e.target && (
            e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS ||
            e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN
          )) {
            const lineNum = e.target.position?.lineNumber;
            if (lineNum) {
              openInlineCommentBox(lineNum, lineNum);
            }
          }
        });

        // Track active line selection for code review comments
        state.editor.onDidChangeCursorSelection((e) => {
          const sel = e.selection;
          const start = sel.startLineNumber;
          const end = sel.endLineNumber;
          state.currentSelection = { startLine: start, endLine: end };

          if (monacoSelectionBadge) {
            if (start === end) {
              monacoSelectionBadge.textContent = `📍 Line ${start} selected`;
            } else {
              monacoSelectionBadge.textContent = `📍 Lines ${start} - ${end} selected (${end - start + 1} lines)`;
            }
          }

          // Trigger floating popup tooltip over active line selection
          showSelectionTooltip();
        });

        state.editor.onDidScrollChange(() => hideSelectionTooltip());

        // Track hover over lines with comments in editor
        state.editor.onMouseMove((e) => {
          if (e && e.target && e.target.position) {
            const lineNum = e.target.position.lineNumber;
            const comments = state.activeSolution?.comments || [];
            const drafts = state.activeDraftComments || [];

            const matchedComment = comments.find(c => c.startLine && lineNum >= parseInt(c.startLine) && lineNum <= (parseInt(c.endLine) || parseInt(c.startLine)));
            const matchedDraft = drafts.find(d => d.startLine && lineNum >= parseInt(d.startLine) && lineNum <= (parseInt(d.endLine) || parseInt(d.startLine)));

            if (matchedComment) {
              highlightMonacoLines(matchedComment.startLine, matchedComment.endLine || matchedComment.startLine, false);
            } else if (matchedDraft) {
              highlightMonacoLines(matchedDraft.startLine, matchedDraft.endLine || matchedDraft.startLine, true);
            } else {
              clearMonacoLineHighlight();
            }
          }
        });

        state.editor.onMouseLeave(() => clearMonacoLineHighlight());

        // Global debounced resize listener for Monaco editor responsiveness
        let resizeTimer = null;
        window.addEventListener('resize', () => {
          if (resizeTimer) clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            if (state.editor) {
              state.editor.layout();
            }
          }, 100);
        });
      });
    }
  }

  // Monaco Selection Floating Popup Tooltip Widget
  let selectionTooltipWidget = null;

  function setupSelectionTooltipWidget() {
    if (!state.editor || typeof monaco === 'undefined') return;

    selectionTooltipWidget = {
      domNode: null,
      getId: function() { return 'monaco.selection.comment.tooltip'; },
      getDomNode: function() {
        if (!this.domNode) {
          this.domNode = document.createElement('div');
          this.domNode.className = 'monaco-selection-tooltip';
          this.domNode.innerHTML = `<button type="button" class="btn-tooltip-comment">💬 Add Comment</button>`;

          this.domNode.querySelector('button').addEventListener('click', (e) => {
            e.stopPropagation();
            if (state.currentSelection) {
              openInlineCommentBox(state.currentSelection.startLine, state.currentSelection.endLine);
              hideSelectionTooltip();
            }
          });
        }
        return this.domNode;
      },
      getPosition: function() {
        if (!state.showSelectionTooltip || !state.currentSelection) return null;
        return {
          position: {
            lineNumber: state.currentSelection.endLine,
            column: 1
          },
          preference: [
            monaco.editor.ContentWidgetPositionPreference.BELOW
          ]
        };
      }
    };

    state.editor.addContentWidget(selectionTooltipWidget);
  }

  function showSelectionTooltip() {
    state.showSelectionTooltip = true;
    if (state.editor && selectionTooltipWidget) {
      state.editor.layoutContentWidget(selectionTooltipWidget);
    }
  }

  function hideSelectionTooltip() {
    state.showSelectionTooltip = false;
    if (state.editor && selectionTooltipWidget) {
      state.editor.layoutContentWidget(selectionTooltipWidget);
    }
  }

  // Event Listeners
  function setupEventListeners() {
    // Navigation tabs
    navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        activateTab(targetTab, true);
      });
    });

    // Sidebar navigation sub-tabs (Comments / Reviews / Ratings)
    document.querySelectorAll('.sidebar-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetSubtab = btn.dataset.subtab;
        activateSidebarSubtab(targetSubtab, true);
      });
    });

    // Comment Filter Pills
    document.querySelectorAll('.comment-filter-pills .pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.comment-filter-pills .pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.commentFilter = btn.dataset.filter;
        if (state.activeSolution) {
          renderComments(state.activeSolution.comments || []);
        }
      });
    });

    if (btnApproveAllDrafts) btnApproveAllDrafts.addEventListener('click', approveAllDraftComments);
    if (btnRejectAllDrafts) btnRejectAllDrafts.addEventListener('click', rejectAllDraftComments);

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

    if (btnLogoutToken) {
      btnLogoutToken.addEventListener('click', async () => {
        state.currentToken = null;
        localStorage.removeItem('hr_app_token');
        authModal.classList.remove('active');
        await verifyAuth();
        await loadSolutions();
        if (state.currentUser && state.currentUser.role !== 'ADMIN' && document.getElementById('tab-admin').classList.contains('active')) {
          document.getElementById('nav-explorer-btn').click();
        }
      });
    }

    // Filters
    btnApplyFilters.addEventListener('click', () => {
      updateUrlState();
      loadSolutions({ append: false });
    });

    // Star Selectors
    setupStarSelectors();

    // Rating Submit
    btnSubmitRating.addEventListener('click', submitRating);

    // Comment Submit
    btnPostComment.addEventListener('click', postComment);

    // AI Draft Generator
    btnGenerateAiDraft.addEventListener('click', generateAiDraft);

    // Publish Review Round
    btnPublishReviewRound.addEventListener('click', publishReviewRound);

    // Admin Token Form
    if (formCreateToken) formCreateToken.addEventListener('submit', createToken);

    // Advance Discord Pre-Mapping Form
    if (formAdvanceDiscordMap) {
      formAdvanceDiscordMap.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = advanceMapUserSelect ? advanceMapUserSelect.value : '';
        const discordUsername = advanceMapDiscordUsername ? advanceMapDiscordUsername.value.trim() : '';
        if (!userId || !discordUsername) return alert('Please select a user and enter a Discord username');

        try {
          const res = await fetch('/api/admin/advance-map-discord', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${state.currentToken}`
            },
            body: JSON.stringify({ userId, discordUsername })
          });
          const data = await res.json();
          if (res.ok) {
            alert(`Discord username @${discordUsername} pre-assigned to user @${data.user.username}!`);
            if (advanceMapDiscordUsername) advanceMapDiscordUsername.value = '';
            await loadAdminUsers();
          } else {
            alert('Failed to pre-map Discord username: ' + data.error);
          }
        } catch (err) {
          alert('Error saving Discord pre-mapping: ' + err.message);
        }
      });
    }
  }

  // Accessible & High-Fidelity Star Rating UX
  const clevernessLabels = ['Not rated', '1/5 - Basic', '2/5 - Fair', '3/5 - Good', '4/5 - Clever', '5/5 - Brilliant!'];
  const readabilityLabels = ['Not rated', '1/5 - Hard to follow', '2/5 - Acceptable', '3/5 - Readable', '4/5 - Clean', '5/5 - Pristine!'];

  function updateStarVisuals(type, score, isHover = false) {
    const container = document.getElementById(`star-${type}-selector`);
    const label = document.getElementById(`${type}-rating-label`);
    if (!container) return;

    const stars = container.querySelectorAll('.star-btn');
    const labels = type === 'cleverness' ? clevernessLabels : readabilityLabels;

    stars.forEach(btn => {
      const val = parseInt(btn.dataset.val);
      if (isHover) {
        btn.classList.toggle('hover-highlight', val <= score);
      } else {
        btn.classList.remove('hover-highlight');
        btn.classList.toggle('active', val <= score);
        btn.setAttribute('aria-checked', val === score ? 'true' : 'false');
      }
    });

    if (label) {
      label.textContent = labels[score] || 'Not rated';
      if (score > 0) {
        label.style.color = type === 'cleverness' ? 'var(--neon-amber)' : 'var(--neon-green)';
        label.style.borderColor = type === 'cleverness' ? 'rgba(255, 183, 0, 0.4)' : 'rgba(0, 255, 157, 0.4)';
      } else {
        label.style.color = 'var(--neon-cyan)';
        label.style.borderColor = 'rgba(0, 243, 255, 0.25)';
      }
    }
  }

  function setupStarSelector(type) {
    const container = document.getElementById(`star-${type}-selector`);
    if (!container) return;

    const stars = container.querySelectorAll('.star-btn');

    stars.forEach(btn => {
      const val = parseInt(btn.dataset.val);

      // Hover Preview Chaining
      btn.addEventListener('mouseenter', () => {
        updateStarVisuals(type, val, true);
        const label = document.getElementById(`${type}-rating-label`);
        const labels = type === 'cleverness' ? clevernessLabels : readabilityLabels;
        if (label) label.textContent = labels[val];
      });

      // Click Selection (click same star toggles to 0)
      btn.addEventListener('click', () => {
        const currentScore = type === 'cleverness' ? state.selectedCleverness : state.selectedReadability;
        const newScore = (currentScore === val) ? 0 : val;

        if (type === 'cleverness') state.selectedCleverness = newScore;
        else state.selectedReadability = newScore;

        updateStarVisuals(type, newScore, false);
      });

      // Keyboard Accessibility
      btn.addEventListener('keydown', (e) => {
        let currentScore = type === 'cleverness' ? state.selectedCleverness : state.selectedReadability;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          e.preventDefault();
          const next = Math.min(5, (currentScore || 0) + 1);
          if (type === 'cleverness') state.selectedCleverness = next;
          else state.selectedReadability = next;
          updateStarVisuals(type, next, false);
          container.querySelector(`[data-val="${next}"]`)?.focus();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          e.preventDefault();
          const prev = Math.max(0, (currentScore || 1) - 1);
          if (type === 'cleverness') state.selectedCleverness = prev;
          else state.selectedReadability = prev;
          updateStarVisuals(type, prev, false);
          if (prev > 0) container.querySelector(`[data-val="${prev}"]`)?.focus();
        }
      });
    });

    // Container Mouseleave
    container.addEventListener('mouseleave', () => {
      const currentScore = type === 'cleverness' ? state.selectedCleverness : state.selectedReadability;
      stars.forEach(b => b.classList.remove('hover-highlight'));
      updateStarVisuals(type, currentScore, false);
    });
  }

  function setupStarSelectors() {
    setupStarSelector('cleverness');
    setupStarSelector('readability');
  }

  function updateRoleUI() {
    const isAdmin = state.currentUser && state.currentUser.role === 'ADMIN';
    if (window.setFeedbackInspectorAdminState) {
      window.setFeedbackInspectorAdminState(isAdmin);
    }
    if (navAdminBtn) {
      navAdminBtn.style.display = isAdmin ? 'inline-block' : 'none';
    }
    if (!isAdmin && document.getElementById('tab-admin')?.classList.contains('active')) {
      document.getElementById('nav-explorer-btn')?.click();
    }
  }

  // Auth Verification
  async function verifyAuth() {
    try {
      if (!state.currentToken) {
        state.currentUser = { username: 'Guest', role: 'USER' };
        activeUserName.textContent = 'Guest User';
        activeUserRole.textContent = 'USER';
        activeUserRole.className = 'role-badge user';
        updateRoleUI();
        return;
      }
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
        state.currentToken = null;
        localStorage.removeItem('hr_app_token');
        state.currentUser = { username: 'Guest', role: 'USER' };
        activeUserName.textContent = 'Guest User';
        activeUserRole.textContent = 'USER';
        activeUserRole.className = 'role-badge user';
      }
    } catch (err) {
      console.warn('Auth check error:', err);
      state.currentUser = { username: 'Guest', role: 'USER' };
      activeUserName.textContent = 'Guest User';
      activeUserRole.textContent = 'USER';
      activeUserRole.className = 'role-badge user';
    }
    updateRoleUI();
  }

  // ==========================================================================
  // Notification System Controller
  // ==========================================================================
  let notificationPollTimer = null;
  let previousUnreadCount = -1;

  function initNotificationSystem() {
    const notificationBellBtn = document.getElementById('notification-bell-btn');
    const notificationDropdown = document.getElementById('notification-dropdown');
    const notificationWrapper = document.getElementById('notification-wrapper');
    const btnMarkAllRead = document.getElementById('btn-mark-all-read');

    if (notificationBellBtn && notificationDropdown) {
      notificationBellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = notificationDropdown.classList.contains('hidden');
        if (isHidden) {
          fetchNotifications();
          notificationDropdown.classList.remove('hidden');
        } else {
          notificationDropdown.classList.add('hidden');
        }
      });

      document.addEventListener('click', (e) => {
        if (notificationWrapper && !notificationWrapper.contains(e.target)) {
          notificationDropdown.classList.add('hidden');
        }
      });
    }

    if (btnMarkAllRead) {
      btnMarkAllRead.addEventListener('click', async (e) => {
        e.stopPropagation();
        await markAllNotificationsAsRead();
      });
    }

    fetchNotifications();
    if (notificationPollTimer) clearInterval(notificationPollTimer);
    notificationPollTimer = setInterval(fetchNotifications, 15000);
  }

  async function fetchNotifications() {
    if (!state.currentToken || (state.currentUser && state.currentUser.username === 'Guest')) {
      updateNotificationUI([], 0);
      return;
    }

    try {
      const res = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${state.currentToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        const notifications = data.notifications || [];
        const unreadCount = data.unreadCount || 0;

        previousUnreadCount = unreadCount;
        updateNotificationUI(notifications, unreadCount);
      }
    } catch (err) {
      console.warn('Error fetching notifications:', err);
    }
  }

  function updateNotificationUI(notifications, unreadCount) {
    const notificationBadge = document.getElementById('notification-badge');
    const notificationCountSub = document.getElementById('notification-count-sub');
    const notificationList = document.getElementById('notification-list');

    if (notificationBadge) {
      if (unreadCount > 0) {
        notificationBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        notificationBadge.classList.remove('hidden');
      } else {
        notificationBadge.classList.add('hidden');
      }
    }

    if (notificationCountSub) {
      notificationCountSub.textContent = `${unreadCount} unread`;
    }

    if (!notificationList) return;

    if (!notifications || notifications.length === 0) {
      notificationList.innerHTML = `<div class="notification-empty">No notifications yet</div>`;
      return;
    }

    notificationList.innerHTML = '';
    notifications.forEach(n => {
      const item = document.createElement('div');
      item.className = `notification-item ${n.isRead ? 'read' : 'unread'}`;

      const icon = n.type === 'COMMENT' ? '💬' : '📑';
      const timeAgo = formatTimeAgo(n.createdAt);

      item.innerHTML = `
        <div class="notification-icon">${icon}</div>
        <div class="notification-body">
          <div class="notification-msg">${escapeHtml(n.message)}</div>
          <div class="notification-meta">
            <span class="notification-type-tag ${n.type}">${n.type}</span>
            <span>${timeAgo}</span>
          </div>
        </div>
      `;

      item.addEventListener('click', async () => {
        if (!n.isRead) {
          await markNotificationAsRead(n.id);
        }
        const dropdown = document.getElementById('notification-dropdown');
        if (dropdown) dropdown.classList.add('hidden');

        if (n.solutionId) {
          activateTab('tab-detail', true);
          await openSolutionDetail(n.solutionId);
        }
      });

      notificationList.appendChild(item);
    });
  }

  async function markNotificationAsRead(id) {
    if (!state.currentToken) return;
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${state.currentToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.warn('Error marking notification read:', err);
    }
  }

  async function markAllNotificationsAsRead() {
    if (!state.currentToken) return;
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${state.currentToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.warn('Error marking all notifications read:', err);
    }
  }

  function showRetroToast(message, icon = '🔔') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'retro-toast';
    toast.innerHTML = `
      <span style="font-size: 1.2rem;">${icon}</span>
      <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function formatTimeAgo(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  // DOM Virtualization Controller (Virtual Window)
  const virtualGrid = {
    cardMinWidth: 320,
    cardGap: 20, // 1.25rem = 20px
    estimatedRowHeight: 145,
    overscanRows: 2,
    rafId: null,

    init() {
      window.addEventListener('scroll', () => this.onScroll(), { passive: true });
      window.addEventListener('resize', () => this.onScroll(), { passive: true });
    },

    onScroll() {
      if (this.rafId) cancelAnimationFrame(this.rafId);
      this.rafId = requestAnimationFrame(() => {
        this.render();
      });
    },

    render() {
      if (!solutionsGrid) return;

      if (state.solutions.length === 0) {
        if (!state.isLoading) {
          solutionsGrid.innerHTML = '<div class="glass-panel" style="grid-column: 1 / -1; text-align: center; color: var(--text-muted);">No solutions match the specified filters.</div>';
        }
        return;
      }

      const totalItems = state.solutions.length;
      const gridWidth = solutionsGrid.clientWidth || 1200;
      
      const columnsCount = Math.max(1, Math.floor((gridWidth + this.cardGap) / (this.cardMinWidth + this.cardGap)));
      const totalRows = Math.ceil(totalItems / columnsCount);

      let rowHeight = this.estimatedRowHeight;
      const sampleCard = solutionsGrid.querySelector('.solution-card');
      if (sampleCard && sampleCard.offsetHeight > 50) {
        rowHeight = sampleCard.offsetHeight + this.cardGap;
        this.estimatedRowHeight = rowHeight;
      }

      const gridRect = solutionsGrid.getBoundingClientRect();
      const gridTopAbsolute = gridRect.top + window.scrollY;
      const relativeScrollTop = Math.max(0, window.scrollY - gridTopAbsolute);
      const viewportHeight = window.innerHeight;

      const visibleStartRow = Math.max(0, Math.floor(relativeScrollTop / rowHeight) - this.overscanRows);
      const visibleEndRow = Math.min(totalRows - 1, Math.ceil((relativeScrollTop + viewportHeight) / rowHeight) + this.overscanRows);

      const startIndex = visibleStartRow * columnsCount;
      const endIndex = Math.min(totalItems, (visibleEndRow + 1) * columnsCount);

      const topHeight = visibleStartRow * rowHeight;
      const bottomHeight = Math.max(0, (totalRows - (visibleEndRow + 1)) * rowHeight);

      solutionsGrid.innerHTML = '';

      if (topHeight > 0) {
        const topSpacer = document.createElement('div');
        topSpacer.className = 'virtual-spacer';
        topSpacer.style.height = `${topHeight}px`;
        solutionsGrid.appendChild(topSpacer);
      }

      const visibleSlice = state.solutions.slice(startIndex, endIndex);
      visibleSlice.forEach(sol => {
        solutionsGrid.appendChild(createSolutionCard(sol));
      });

      if (bottomHeight > 0) {
        const bottomSpacer = document.createElement('div');
        bottomSpacer.className = 'virtual-spacer';
        bottomSpacer.style.height = `${bottomHeight}px`;
        solutionsGrid.appendChild(bottomSpacer);
      }
    }
  };

  // Infinite Scroll Observer Setup
  function setupInfiniteScroll() {
    if (!infiniteScrollSentinel) return;

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && state.hasMore && !state.isLoading) {
        loadSolutions({ append: true });
      }
    }, {
      root: null,
      rootMargin: '300px',
      threshold: 0.1
    });

    observer.observe(infiniteScrollSentinel);
  }

  // Fetch Solutions (Infinite Scroll / Offset API)
  async function loadSolutions({ append = false } = {}) {
    if (state.isLoading) return;
    if (append && !state.hasMore) return;

    state.isLoading = true;

    if (!append) {
      state.offset = 0;
      state.hasMore = true;
      state.solutions = [];
      solutionsGrid.innerHTML = '<div class="glass-panel" style="grid-column: 1 / -1; text-align: center;">Loading solutions...</div>';
      if (infiniteScrollSentinel) infiniteScrollSentinel.classList.add('hidden');
    } else {
      if (infiniteScrollSentinel) infiniteScrollSentinel.classList.remove('hidden');
    }

    const params = new URLSearchParams();
    params.append('offset', state.offset);
    params.append('limit', state.limit);

    if (filterSearch.value.trim()) params.append('search', filterSearch.value.trim());
    if (filterLanguage.value) params.append('language', filterLanguage.value);

    const selectedUsers = multiselectUser.getSelectedUsernames();
    if (selectedUsers.length > 0 && selectedUsers.length < multiselectUser.usersList.length) {
      params.append('usernames', selectedUsers.join(','));
    }

    try {
      const res = await fetch(`/api/solutions?${params.toString()}`);
      const data = await res.json();

      const newSolutions = data.solutions || [];
      const pagination = data.pagination || {};

      state.totalCount = pagination.total || 0;
      state.hasMore = Boolean(pagination.hasMore);
      state.offset = pagination.nextOffset !== undefined ? pagination.nextOffset : (state.offset + newSolutions.length);

      if (!append) {
        state.solutions = newSolutions;
      } else {
        state.solutions.push(...newSolutions);
      }

      virtualGrid.render();
      solutionsCountBadge.textContent = `Loaded ${state.solutions.length} / ${state.totalCount} Solutions`;
      populateReviewPicker(state.solutions);
    } catch (err) {
      if (!append) {
        solutionsGrid.innerHTML = `<div class="glass-panel" style="grid-column: 1 / -1; color: var(--neon-pink);">Failed to load solutions: ${err.message}</div>`;
      }
    } finally {
      state.isLoading = false;
      if (infiniteScrollSentinel) {
        if (state.hasMore) {
          infiniteScrollSentinel.classList.remove('hidden');
        } else {
          infiniteScrollSentinel.classList.add('hidden');
        }
      }
    }
  }

  // Helper to render 5 star ratings HTML
  function renderStarsHtml(avgRating) {
    const score = Math.round(avgRating || 0);
    let html = '';
    for (let i = 1; i <= 5; i++) {
      if (i <= score) {
        html += '<span class="star-icon filled">★</span>';
      } else {
        html += '<span class="star-icon empty">★</span>';
      }
    }
    return `<span class="star-rating">${html}</span>`;
  }

  // Create Solution Card Element
  function createSolutionCard(sol) {
    const card = document.createElement('div');
    card.className = 'solution-card';
    
    const cleverStarsHtml = renderStarsHtml(sol.clevernessAvg);
    const readStarsHtml = renderStarsHtml(sol.readabilityAvg);
    const reviewsCount = sol._count?.reviewRounds || 0;

    card.innerHTML = `
      <div>
        <div class="sol-header">
          <div class="sol-title">${escapeHtml(sol.challengeTitle)}</div>
          <span class="lang-tag">${escapeHtml(sol.language)}</span>
        </div>
        <div class="sol-meta">
          <span>By <strong>@${escapeHtml(sol.user?.username || 'unknown')}</strong></span>
        </div>
      </div>

      <div class="sol-ratings-summary">
        <div class="rating-badge" title="Cleverness: ${sol.clevernessAvg ? sol.clevernessAvg + '/5' : 'Unrated'}">
          <span class="star-label-icon">🧠</span> ${cleverStarsHtml}
        </div>
        <div class="rating-badge" title="Readability: ${sol.readabilityAvg ? sol.readabilityAvg + '/5' : 'Unrated'}">
          <span class="star-label-icon">📖</span> ${readStarsHtml}
        </div>
        <div class="rating-badge" style="margin-left: auto;" title="Reviews: ${reviewsCount}">
          <span class="review-icon">💬</span> ${reviewsCount}
        </div>
      </div>
    `;

    card.addEventListener('click', () => openSolutionDetail(sol.id));
    return card;
  }

  // Open Solution Detail Tab (Merged Workspace)
  async function openSolutionDetail(id, updateUrl = true) {
    try {
      const res = await fetch(`/api/solutions/${id}`);
      const data = await res.json();
      const sol = data.solution;
      if (!sol) return;
      state.activeSolution = sol;

      detailChallengeTitle.textContent = sol.challengeTitle;
      detailLanguageTag.textContent = sol.language.toUpperCase();
      detailUserName.textContent = `@${sol.user?.username || 'unknown'}`;

      // Update Review Status badge on header
      if (detailReviewStatusBadge) {
        const latestRound = sol.reviewRounds && sol.reviewRounds.length > 0
          ? sol.reviewRounds[sol.reviewRounds.length - 1]
          : null;

        if (latestRound) {
          detailReviewStatusBadge.style.display = 'inline-block';
          detailReviewStatusBadge.textContent = `${latestRound.status} (R${latestRound.roundNumber})`;
          detailReviewStatusBadge.className = `role-badge ${latestRound.status.toLowerCase().includes('approved') ? 'admin' : 'user'}`;
        } else {
          detailReviewStatusBadge.style.display = 'inline-block';
          detailReviewStatusBadge.textContent = 'UNREVIEWED';
          detailReviewStatusBadge.className = 'role-badge user';
        }
      }

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

        updateMonacoDecorations(sol.comments || []);
      }

      // Reset active AI draft comments, ratings & view zones on new solution selection
      state.activeDraftComments = [];
      state.activeInlineLine = null;
      state.selectedCleverness = 0;
      state.selectedReadability = 0;
      if (typeof updateStarVisuals === 'function') {
        updateStarVisuals('cleverness', 0, false);
        updateStarVisuals('readability', 0, false);
      }
      state.collapsedZones.clear();
      closeInlineCommentBox();
      renderAiDraftComments();
      updateMonacoDraftDecorations();
      updateMonacoViewZones();

      renderComments(sol.comments || []);
      renderReviewRoundsTimeline(sol.reviewRounds || []);

      // Switch tab and update URL
      activateTab('tab-detail', false);
      if (updateUrl) {
        updateUrlState({ solutionId: id, tab: 'tab-detail' });
      }
    } catch (err) {
      alert('Failed to load solution details: ' + err.message);
    }
  }

  // Dynamic Hover Line Highlight Helper Functions for Comments
  function highlightMonacoLines(startLine, endLine, isDraft = false) {
    if (!state.editor || typeof monaco === 'undefined' || !startLine) return;
    const sLine = parseInt(startLine);
    const eLine = parseInt(endLine) || sLine;
    const className = isDraft ? 'monaco-draft-line-highlight' : 'monaco-comment-line-highlight';

    state.editorHoverDecorations = state.editor.deltaDecorations(
      state.editorHoverDecorations || [],
      [{
        range: new monaco.Range(sLine, 1, eLine, 1000),
        options: {
          isWholeLine: true,
          className: className
        }
      }]
    );
  }
  window.highlightMonacoLines = highlightMonacoLines;

  function clearMonacoLineHighlight() {
    if (!state.editor || typeof monaco === 'undefined') return;
    if (state.editorHoverDecorations && state.editorHoverDecorations.length > 0) {
      state.editorHoverDecorations = state.editor.deltaDecorations(state.editorHoverDecorations, []);
    }
  }
  window.clearMonacoLineHighlight = clearMonacoLineHighlight;

  // Monaco line decorations for line-targeted code review comments (Glyph margin indicator only by default)
  function updateMonacoDecorations(comments) {
    if (!state.editor || typeof monaco === 'undefined') return;

    const newDecorations = [];
    (comments || []).forEach(c => {
      if (c.startLine) {
        const sLine = parseInt(c.startLine);
        const eLine = parseInt(c.endLine) || sLine;
        newDecorations.push({
          range: new monaco.Range(sLine, 1, eLine, 1000),
          options: {
            isWholeLine: true,
            glyphMarginClassName: 'monaco-comment-glyph-margin',
            hoverMessage: { value: `💬 **@${c.user?.username || 'User'}**: ${c.content}` }
          }
        });
      }
    });

    state.editorDecorations = state.editor.deltaDecorations(state.editorDecorations, newDecorations);
  }

  // Scroll editor to target line range and open inline ViewZone thread
  window.scrollToMonacoLines = function(startLine, endLine) {
    if (!state.editor) return;
    const sLine = parseInt(startLine);
    const eLine = parseInt(endLine) || sLine;
    state.editor.revealLineInCenter(sLine);
    state.editor.setSelection(new monaco.Range(sLine, 1, eLine, 1000));
    state.editor.focus();

    openInlineCommentBox(sLine, eLine);
  };

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
    if (!commentsContainer) return;

    let filtered = comments || [];
    if (state.commentFilter === 'line') {
      filtered = filtered.filter(c => c.startLine !== null && c.startLine !== undefined);
    } else if (state.commentFilter === 'general') {
      filtered = filtered.filter(c => !c.startLine);
    }

    if (filtered.length === 0) {
      commentsContainer.innerHTML = `<div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 1rem 0;">No ${state.commentFilter !== 'all' ? state.commentFilter : ''} comments yet. Be the first to add review feedback!</div>`;
      return;
    }

    commentsContainer.innerHTML = '';
    filtered.forEach(c => {
      const item = document.createElement('div');
      item.className = 'comment-item';

      let lineBadgeHtml = '';
      if (c.startLine) {
        const lineText = (c.endLine && c.endLine > c.startLine) 
          ? `Lines ${c.startLine}-${c.endLine}` 
          : `Line ${c.startLine}`;
        lineBadgeHtml = `<button class="line-tag-badge" onclick="scrollToMonacoLines(${c.startLine}, ${c.endLine || c.startLine})" title="Jump to code line in editor">🎯 ${lineText}</button>`;
      }

      const isAuthorOrAdmin = state.currentUser && (state.currentUser.id === c.userId || state.currentUser.role === 'ADMIN');
      const deleteBtnHtml = isAuthorOrAdmin ? `<button class="btn-micro" style="color: var(--neon-pink); border-color: rgba(255,0,85,0.3); font-size: 0.65rem;" onclick="deleteComment('${c.id}')">Delete</button>` : '';

      item.innerHTML = `
        <div class="comment-header">
          <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
            <span class="comment-user">@${escapeHtml(c.user?.username || 'User')} ${c.user?.role === 'ADMIN' ? '<span class="role-badge admin">ADMIN</span>' : ''}</span>
            ${lineBadgeHtml}
          </div>
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <span>${new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            ${deleteBtnHtml}
          </div>
        </div>
        <div style="color: #fff; line-height: 1.4; white-space: pre-wrap;">${escapeHtml(c.content)}</div>
      `;

      if (c.startLine) {
        item.addEventListener('mouseenter', () => highlightMonacoLines(c.startLine, c.endLine || c.startLine, false));
        item.addEventListener('mouseleave', () => clearMonacoLineHighlight());
      }

      commentsContainer.appendChild(item);
    });
  }

  window.deleteComment = async function(commentId) {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${state.currentToken}` }
      });
      if (res.ok) {
        if (state.activeSolution) {
          await openSolutionDetail(state.activeSolution.id);
        }
      } else {
        const data = await res.json();
        alert('Failed to delete comment: ' + data.error);
      }
    } catch (e) {
      alert('Error deleting comment: ' + e.message);
    }
  };

  async function postComment() {
    if (!state.activeSolution) return alert('Please select a solution first');
    const content = commentInput.value.trim();
    if (!content) return alert('Comment content cannot be empty');

    try {
      const res = await fetch(`/api/solutions/${state.activeSolution.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.currentToken}`
        },
        body: JSON.stringify({
          content,
          startLine: null,
          endLine: null
        })
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

  // CODE REVIEWS (Integrated into Active Solution Workspace)
  function renderReviewRoundsTimeline(rounds) {
    if (!reviewRoundsTimeline) return;

    if (rounds.length === 0) {
      reviewRoundsTimeline.innerHTML = '<div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 0.5rem 0;">No review rounds recorded yet. Use the Gemini AI Assistant above to start Round 1.</div>';
      return;
    }

    reviewRoundsTimeline.innerHTML = '';
    rounds.forEach(r => {
      const item = document.createElement('div');
      item.className = `timeline-item ${r.status.toLowerCase()}`;
      
      let parsedGemini = null;
      try {
        if (r.geminiDraft) parsedGemini = typeof r.geminiDraft === 'string' ? JSON.parse(r.geminiDraft) : r.geminiDraft;
      } catch (e) {}

      item.innerHTML = `
        <div class="timeline-header">
          <strong>Round ${r.roundNumber} - ${r.status}</strong>
          <span style="color: var(--text-muted);">${new Date(r.createdAt).toLocaleDateString()}</span>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.4rem;">Reviewed by @${r.reviewer?.username || 'Admin'}</div>
        <div style="color: #fff; font-size: 0.85rem; background: rgba(0,0,0,0.3); padding: 0.5rem; border-radius: 4px; margin-bottom: 0.4rem; white-space: pre-wrap;">
          ${escapeHtml(r.adminNotes)}
        </div>
        ${parsedGemini && (typeof parsedGemini === 'string' ? parsedGemini : parsedGemini.complexity) ? `<div style="font-size: 0.75rem; color: var(--neon-cyan); background: rgba(0,243,255,0.05); padding: 4px; border-radius: 3px; font-family: monospace;">Gemini AI Draft Included</div>` : ''}
      `;
      reviewRoundsTimeline.appendChild(item);
    });
  }

  // Inline Review ViewZone Handlers
  function openInlineCommentBox(startLine, endLine) {
    const sLine = parseInt(startLine) || state.currentSelection?.startLine || 1;
    const eLine = parseInt(endLine) || state.currentSelection?.endLine || sLine;

    state.currentSelection = { startLine: sLine, endLine: eLine };
    state.activeInlineLine = eLine;
    state.collapsedZones.delete(eLine);

    updateMonacoViewZones();
    setTimeout(() => {
      const input = document.getElementById(`zone-input-${eLine}`);
      if (input) {
        input.focus();
        input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 80);
  }

  function closeInlineCommentBox() {
    state.activeInlineLine = null;
    hideSelectionTooltip();
    updateMonacoViewZones();
  }

  window.closeLineViewZone = function(lineNum) {
    const num = parseInt(lineNum);
    state.collapsedZones.add(num);
    if (state.activeInlineLine === num) {
      state.activeInlineLine = null;
    }
    hideSelectionTooltip();
    updateMonacoViewZones();
  };

  window.postViewZoneComment = async function(lineNum) {
    const textarea = document.getElementById(`zone-input-${lineNum}`);
    const content = textarea ? textarea.value.trim() : '';
    if (!content) return alert('Comment content cannot be empty');

    const num = parseInt(lineNum);
    let sLine = num;
    let eLine = num;

    if (state.currentSelection && parseInt(state.currentSelection.endLine) === num && state.currentSelection.startLine) {
      sLine = parseInt(state.currentSelection.startLine);
      eLine = num;
    }

    try {
      const res = await fetch(`/api/solutions/${state.activeSolution.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.currentToken}`
        },
        body: JSON.stringify({
          content,
          startLine: sLine,
          endLine: eLine
        })
      });

      const data = await res.json();
      if (res.ok) {
        state.activeInlineLine = null;
        state.collapsedZones.delete(num);
        await openSolutionDetail(state.activeSolution.id);
      } else {
        alert('Failed to post inline comment: ' + data.error);
      }
    } catch (err) {
      alert('Error posting inline comment: ' + err.message);
    }
  };

  // Monaco ViewZones Manager for GitHub / Bitbucket style embedded inline threads
  function updateMonacoViewZones() {
    if (!state.editor || typeof monaco === 'undefined') return;

    const comments = state.activeSolution?.comments || [];
    const drafts = state.activeDraftComments || [];

    // Collect all line numbers that need an embedded ViewZone
    const lineMap = new Map();

    // 1. Group published line comments by target line number
    comments.forEach(c => {
      if (c.startLine) {
        const lineNum = parseInt(c.endLine) || parseInt(c.startLine);
        if (!lineMap.has(lineNum)) lineMap.set(lineNum, { comments: [], drafts: [], isInputOpen: false });
        lineMap.get(lineNum).comments.push(c);
      }
    });

    // 2. Group pending AI draft comments by target line number
    drafts.forEach(d => {
      const lineNum = parseInt(d.endLine) || parseInt(d.startLine) || 1;
      if (!lineMap.has(lineNum)) lineMap.set(lineNum, { comments: [], drafts: [], isInputOpen: false });
      lineMap.get(lineNum).drafts.push(d);
    });

    // 3. Include actively targeted inline line number if user opened comment creation
    if (state.activeInlineLine) {
      const activeLineNum = parseInt(state.activeInlineLine);
      if (!lineMap.has(activeLineNum)) lineMap.set(activeLineNum, { comments: [], drafts: [], isInputOpen: true });
      else lineMap.get(activeLineNum).isInputOpen = true;
    }

    state.editor.changeViewZones(function(accessor) {
      // Clear previously registered ViewZones
      if (state.viewZoneIds && state.viewZoneIds.length > 0) {
        state.viewZoneIds.forEach(id => accessor.removeZone(id));
      }
      state.viewZoneIds = [];

      const lineNumbers = Array.from(lineMap.keys())
        .filter(lNum => {
          // If collapsed and user didn't explicitly click to open input for this line, hide zone
          if (state.collapsedZones.has(lNum) && state.activeInlineLine !== lNum) {
            return false;
          }
          return true;
        })
        .sort((a, b) => a - b);

      lineNumbers.forEach(lineNum => {
        const data = lineMap.get(lineNum);
        const hasDraft = data.drafts.length > 0;

        let isSelectedRange = false;
        let sLine = lineNum;
        if (state.currentSelection && parseInt(state.currentSelection.endLine) === lineNum && parseInt(state.currentSelection.startLine) < lineNum) {
          sLine = parseInt(state.currentSelection.startLine);
          isSelectedRange = true;
        }

        const titleText = isSelectedRange 
          ? `💬 Lines ${sLine}-${lineNum} Code Review Thread`
          : `💬 Line ${lineNum} Code Review Thread`;
        const placeholderText = isSelectedRange
          ? `Write inline review comment on lines ${sLine}-${lineNum}...`
          : `Write inline review comment on line ${lineNum}...`;

        const zoneNode = document.createElement('div');
        zoneNode.className = `monaco-inline-thread-zone ${hasDraft ? 'has-draft' : ''}`;

        // Build HTML content for thread
        let publishedCommentsHtml = '';
        data.comments.forEach(c => {
          const isAuthorOrAdmin = state.currentUser && (state.currentUser.id === c.userId || state.currentUser.role === 'ADMIN');
          const deleteBtnHtml = isAuthorOrAdmin 
            ? `<button class="btn-micro" style="color: var(--neon-pink); border-color: rgba(255,0,85,0.3); font-size: 0.65rem;" onclick="deleteComment('${c.id}')">Delete</button>` 
            : '';

          publishedCommentsHtml += `
            <div class="monaco-thread-item">
              <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 0.2rem; color: var(--text-muted);">
                <span class="comment-user">@${escapeHtml(c.user?.username || 'User')} ${c.user?.role === 'ADMIN' ? '<span class="role-badge admin">ADMIN</span>' : ''}</span>
                <div style="display: flex; gap: 0.4rem; align-items: center;">
                  <span>${new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  ${deleteBtnHtml}
                </div>
              </div>
              <div style="color: #fff; line-height: 1.4; white-space: pre-wrap;">${escapeHtml(c.content)}</div>
            </div>
          `;
        });

        let draftCommentsHtml = '';
        data.drafts.forEach(d => {
          draftCommentsHtml += `
            <div class="draft-comment-card" style="margin-bottom: 0.4rem;">
              <div class="draft-comment-header">
                <div style="display: flex; align-items: center; gap: 0.4rem;">
                  <span class="draft-badge">🤖 AI DRAFT</span>
                  <span style="font-size: 0.72rem; color: var(--neon-pink); font-weight: 600;">${escapeHtml(d.type)}</span>
                </div>
              </div>
              <div class="draft-comment-content">${escapeHtml(d.content)}</div>
              <div class="draft-comment-actions">
                <button type="button" class="btn-reject" onclick="rejectDraftComment('${d.id}')">❌ Reject</button>
                <button type="button" class="btn-approve" onclick="approveDraftComment('${d.id}')">✅ Approve</button>
              </div>
            </div>
          `;
        });

        const inputFormHtml = `
          <div class="monaco-thread-input-row">
            <textarea id="zone-input-${lineNum}" class="form-control" rows="2" placeholder="${placeholderText}"></textarea>
            <div style="display: flex; justify-content: flex-end; gap: 0.4rem;">
              <button type="button" class="btn-micro btn-zone-cancel" data-line="${lineNum}">Cancel</button>
              <button type="button" class="btn-retro btn-green btn-zone-post" style="font-size: 0.75rem; padding: 3px 8px;" data-line="${lineNum}">Post Comment</button>
            </div>
          </div>
        `;

        zoneNode.innerHTML = `
          <div class="monaco-thread-header">
            <span>${titleText}</span>
            <button type="button" class="btn-micro btn-zone-close" data-line="${lineNum}" style="font-size: 0.65rem;">✕ Close</button>
          </div>
          ${publishedCommentsHtml ? `<div class="monaco-thread-comments">${publishedCommentsHtml}</div>` : ''}
          ${draftCommentsHtml ? `<div style="margin-bottom: 0.5rem;">${draftCommentsHtml}</div>` : ''}
          ${inputFormHtml}
        `;

        // Direct event bindings to guarantee Monaco click propagation
        const closeBtn = zoneNode.querySelector('.btn-zone-close');
        if (closeBtn) {
          closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeLineViewZone(lineNum);
          });
        }

        const cancelBtn = zoneNode.querySelector('.btn-zone-cancel');
        if (cancelBtn) {
          cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (data.comments.length === 0 && data.drafts.length === 0) {
              closeLineViewZone(lineNum);
            } else {
              const input = document.getElementById(`zone-input-${lineNum}`);
              if (input) input.value = '';
              state.activeInlineLine = null;
              updateMonacoViewZones();
            }
          });
        }

        const postBtn = zoneNode.querySelector('.btn-zone-post');
        if (postBtn) {
          postBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            postViewZoneComment(lineNum);
          });
        }

        zoneNode.querySelectorAll('.monaco-thread-item').forEach((threadItem, index) => {
          const comment = data.comments[index];
          if (comment && comment.startLine) {
            threadItem.addEventListener('mouseenter', () => highlightMonacoLines(comment.startLine, comment.endLine || comment.startLine, false));
            threadItem.addEventListener('mouseleave', () => clearMonacoLineHighlight());
          }
        });

        zoneNode.querySelectorAll('.draft-comment-card').forEach((draftCard, index) => {
          const draft = data.drafts[index];
          if (draft && draft.startLine) {
            draftCard.addEventListener('mouseenter', () => highlightMonacoLines(draft.startLine, draft.endLine, true));
            draftCard.addEventListener('mouseleave', () => clearMonacoLineHighlight());
          }
        });

        // Dynamic height calculation ensuring content fits cleanly without clipping
        let dynamicHeight = 70 + 110; // header + input row
        data.comments.forEach(c => {
          const lines = (c.content || '').split('\n').length;
          dynamicHeight += 45 + Math.max(lines, 1) * 22;
        });
        data.drafts.forEach(d => {
          const lines = (d.content || '').split('\n').length;
          dynamicHeight += 75 + Math.max(lines, 1) * 22;
        });

        const zoneId = accessor.addZone({
          afterLineNumber: lineNum,
          heightInPx: dynamicHeight,
          domNode: zoneNode,
          suppressMouseDown: false
        });

        state.viewZoneIds.push(zoneId);
      });
    });
  }

  // AI Draft Comments Renderer & Approve/Reject Handlers
  function renderAiDraftComments() {
    if (!aiDraftCommentsWrapper || !aiDraftCommentsList) return;

    const pendingDrafts = state.activeDraftComments || [];
    if (draftCommentsCount) draftCommentsCount.textContent = pendingDrafts.length;

    if (pendingDrafts.length === 0) {
      aiDraftCommentsWrapper.style.display = 'none';
      return;
    }

    aiDraftCommentsWrapper.style.display = 'block';
    aiDraftCommentsList.innerHTML = '';

    pendingDrafts.forEach(d => {
      const card = document.createElement('div');
      card.className = 'draft-comment-card';

      const lineText = (d.endLine && d.endLine > d.startLine)
        ? `Lines ${d.startLine}-${d.endLine}`
        : `Line ${d.startLine}`;

      card.innerHTML = `
        <div class="draft-comment-header">
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <span class="draft-badge">🤖 AI DRAFT</span>
            <button class="line-tag-badge" onclick="scrollToMonacoLines(${d.startLine}, ${d.endLine})">🎯 ${lineText}</button>
          </div>
          <span style="font-size: 0.7rem; color: var(--neon-pink);">${escapeHtml(d.type)}</span>
        </div>
        <div class="draft-comment-content">${escapeHtml(d.content)}</div>
        <div class="draft-comment-actions">
          <button type="button" class="btn-reject" onclick="rejectDraftComment('${d.id}')">❌ Reject</button>
          <button type="button" class="btn-approve" onclick="approveDraftComment('${d.id}')">✅ Approve</button>
        </div>
      `;

      if (d.startLine) {
        card.addEventListener('mouseenter', () => highlightMonacoLines(d.startLine, d.endLine, true));
        card.addEventListener('mouseleave', () => clearMonacoLineHighlight());
      }

      aiDraftCommentsList.appendChild(card);
    });
  }

  function updateMonacoDraftDecorations() {
    if (!state.editor || typeof monaco === 'undefined') return;

    const newDraftDecorations = [];
    (state.activeDraftComments || []).forEach(d => {
      const sLine = parseInt(d.startLine);
      const eLine = parseInt(d.endLine) || sLine;
      newDraftDecorations.push({
        range: new monaco.Range(sLine, 1, eLine, 1000),
        options: {
          isWholeLine: true,
          glyphMarginClassName: 'monaco-draft-glyph-margin',
          hoverMessage: { value: `🤖 **AI Draft (${d.type})**: ${d.content}` }
        }
      });
    });

    state.editorDraftDecorations = state.editor.deltaDecorations(state.editorDraftDecorations || [], newDraftDecorations);
  }

  window.approveDraftComment = async function(draftId) {
    const draft = (state.activeDraftComments || []).find(d => d.id === draftId);
    if (!draft || !state.activeSolution) return;

    try {
      const res = await fetch(`/api/solutions/${state.activeSolution.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.currentToken}`
        },
        body: JSON.stringify({
          content: `[AI Review] ${draft.content}`,
          startLine: draft.startLine,
          endLine: draft.endLine
        })
      });

      if (res.ok) {
        state.activeDraftComments = (state.activeDraftComments || []).filter(d => d.id !== draftId);
        renderAiDraftComments();
        updateMonacoDraftDecorations();
        updateMonacoViewZones();
        await openSolutionDetail(state.activeSolution.id);
      } else {
        const data = await res.json();
        alert('Failed to approve draft comment: ' + data.error);
      }
    } catch (err) {
      alert('Error approving draft comment: ' + err.message);
    }
  };

  window.rejectDraftComment = function(draftId) {
    state.activeDraftComments = (state.activeDraftComments || []).filter(d => d.id !== draftId);
    renderAiDraftComments();
    updateMonacoDraftDecorations();
    updateMonacoViewZones();
  };

  async function approveAllDraftComments() {
    if (!state.activeDraftComments || state.activeDraftComments.length === 0) return;
    const draftsToApprove = [...state.activeDraftComments];

    for (const draft of draftsToApprove) {
      await window.approveDraftComment(draft.id);
    }
  }

  function rejectAllDraftComments() {
    state.activeDraftComments = [];
    renderAiDraftComments();
    updateMonacoDraftDecorations();
    updateMonacoViewZones();
  }

  async function generateAiDraft() {
    if (!state.activeSolution) return alert('Please select a solution first');

    aiDraftOutput.textContent = '⚡ Querying Gemini AI Assistant for automated complexity & edge-case analysis...';
    if (aiDraftCommentsWrapper) aiDraftCommentsWrapper.style.display = 'none';

    try {
      const res = await fetch(`/api/solutions/${state.activeSolution.id}/review/draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.currentToken}`
        }
      });

      const data = await res.json();
      if (res.ok) {
        aiDraftOutput.textContent = data.draft;
        if (adminReviewNotes) adminReviewNotes.value = `Gemini AI Analysis:\n${data.draft}`;

        // Parse line-targeted draft comments
        const parsed = data.parsedDraft;
        let draftComments = [];
        if (parsed && Array.isArray(parsed.lineComments)) {
          draftComments = parsed.lineComments;
        } else {
          try {
            const match = data.draft.match(/\{[\s\S]*\}/);
            if (match) {
              const obj = JSON.parse(match[0]);
              if (Array.isArray(obj.lineComments)) draftComments = obj.lineComments;
            }
          } catch (e) {}
        }

        state.activeDraftComments = draftComments.map((c, idx) => ({
          id: `draft_${Date.now()}_${idx}`,
          startLine: parseInt(c.startLine) || 1,
          endLine: parseInt(c.endLine) || parseInt(c.startLine) || 1,
          type: c.type || 'SUGGESTION',
          content: c.content || 'AI review suggestion'
        }));

        renderAiDraftComments();
        updateMonacoDraftDecorations();
        updateMonacoViewZones();
      } else {
        aiDraftOutput.textContent = `Error: ${data.error}`;
      }
    } catch (err) {
      aiDraftOutput.textContent = `Failed to generate draft: ${err.message}`;
    }
  }

  async function publishReviewRound() {
    if (!state.activeSolution) return alert('Please select a solution to review');
    
    const status = reviewStatusSelect.value;
    const adminNotes = adminReviewNotes.value.trim();

    if (!adminNotes) return alert('Please write feedback notes in the box before publishing');

    try {
      const roundsRes = await fetch(`/api/solutions/${state.activeSolution.id}/reviews`, {
        headers: { 'Authorization': `Bearer ${state.currentToken}` }
      });
      const roundsData = await roundsRes.json();
      const nextRoundNumber = (roundsData.rounds?.length || 0) + 1;

      const res = await fetch(`/api/solutions/${state.activeSolution.id}/review/publish`, {
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
        await openSolutionDetail(state.activeSolution.id);
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
      const explorerBtn = document.getElementById('nav-explorer-btn');
      if (explorerBtn) explorerBtn.click();
      return;
    }

    if (adminDashboardBody) adminDashboardBody.style.display = 'block';

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
          ${u.discordUsername ? `<div style="font-size: 0.7rem; color: #5865F2; font-weight: 600; margin-top: 2px;">👾 Discord: @${escapeHtml(u.discordUsername)}</div>` : ''}
        </div>
        <button class="btn-retro btn-pink" style="font-size: 0.7rem; padding: 2px 6px;" onclick="copyToken('${u.token}')">Copy Token</button>
      `;
      adminUsersList.appendChild(item);
    });

    // Populate Advance Discord Mapping User Select dropdown
    if (advanceMapUserSelect) {
      advanceMapUserSelect.innerHTML = '<option value="">-- Choose User Profile --</option>' + 
        users.map(u => `<option value="${u.id}">@${escapeHtml(u.username)} (${u.role})${u.discordUsername ? ' [Mapped: ' + escapeHtml(u.discordUsername) + ']' : ''}</option>`).join('');
    }
  }

  window.copyToken = function(t) {
    navigator.clipboard.writeText(t);
    alert('Token copied to clipboard!');
  };

  async function createToken(e) {
    e.preventDefault();
    const username = tokenUsernameInput.value.trim();
    const discordUsername = tokenDiscordInput ? tokenDiscordInput.value.trim() : null;
    const role = tokenRoleSelect.value;

    if (!username) return;

    try {
      const res = await fetch('/api/admin/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.currentToken}`
        },
        body: JSON.stringify({ username, role, discordUsername })
      });

      const data = await res.json();
      if (res.ok) {
        alert(`Token created for @${data.user.username}!\nToken: ${data.user.token}`);
        tokenUsernameInput.value = '';
        if (tokenDiscordInput) tokenDiscordInput.value = '';
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
