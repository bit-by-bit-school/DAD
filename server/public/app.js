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
        this.optionsContainer.innerHTML = '<div style="font-size: 0.85rem; color: var(--text-muted); padding: 0.5rem; text-align: center; font-family: var(--font-segment);">No users found</div>';
        return;
      }

      filtered.forEach(u => {
        const isChecked = this.selectedUsernames.has(u.username);
        const label = document.createElement('label');
        label.className = `multiselect-option${isChecked ? ' active' : ''}`;
        label.style.fontFamily = "'Share Tech Mono', monospace";
        label.style.fontSize = "0.85rem";
        label.style.color = "var(--text-bright, #FFFFFF)";

        const solCount = u._count?.solutions !== undefined ? ` (${u._count.solutions})` : '';

        label.innerHTML = `
          <input type="checkbox" value="${escapeHtml(u.username)}" ${isChecked ? 'checked' : ''} style="accent-color: var(--color-brand); cursor: pointer;">
          <span style="font-family: 'Share Tech Mono', monospace; font-size: 0.85rem; color: var(--text-bright, #FFFFFF);">@${escapeHtml(u.username)}${solCount}</span>
        `;

        const cb = label.querySelector('input');
        cb.addEventListener('change', (e) => {
          if (e.target.checked) {
            this.selectedUsernames.add(u.username);
            label.classList.add('active');
          } else {
            this.selectedUsernames.delete(u.username);
            label.classList.remove('active');
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
        this.label.innerHTML = `${count} Users Selected <span class="multiselect-badge-count" style="font-family: 'Share Tech Mono', monospace;">${count}</span>`;
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
  const detailHackerrankLink = document.getElementById('detail-hackerrank-link');
  const btnQuickViewStatement = document.getElementById('btn-quick-view-statement');
  const btnSubtabStatement = document.getElementById('btn-subtab-statement');
  const detailStatementSlug = document.getElementById('detail-statement-slug');
  const detailStatementTitle = document.getElementById('detail-statement-title');
  const detailStatementExternalLink = document.getElementById('detail-statement-external-link');
  const detailStatementContainer = document.getElementById('detail-statement-container');
  const monacoSelectionBadge = document.getElementById('monaco-selection-badge');
  const avgClevernessVal = document.getElementById('avg-cleverness-val');
  const avgReadabilityVal = document.getElementById('avg-readability-val');
  const btnSubmitRating = document.getElementById('btn-submit-rating');
  const commentInput = document.getElementById('comment-input');
  const btnPostComment = document.getElementById('btn-post-comment');
  const commentsContainer = document.getElementById('comments-container');
  const adminAiAssistantPanel = document.getElementById('admin-ai-assistant-panel');
  const btnCopyReviewPrompt = document.getElementById('btn-copy-review-prompt');
  const btnTogglePromptPreview = document.getElementById('btn-toggle-prompt-preview');
  const promptPreviewDrawer = document.getElementById('prompt-preview-drawer');
  const llmReviewInput = document.getElementById('llm-review-input');
  const btnImportLlmReview = document.getElementById('btn-import-llm-review');
  const parsedReviewCard = document.getElementById('parsed-review-card');
  const parsedMetricsContainer = document.getElementById('parsed-metrics-container');
  const parsedReviewSummary = document.getElementById('parsed-review-summary');
  const parsedReviewDetails = document.getElementById('parsed-review-details');
  const adminReviewPublisherBox = document.getElementById('admin-review-publisher-box');
  const adminReviewRoundTitle = document.getElementById('admin-review-round-title');
  const reviewRoundNumberBadge = document.getElementById('review-round-number-badge');
  const reviewStatusSelect = document.getElementById('review-status-select');
  const adminReviewNotes = document.getElementById('admin-review-notes');
  const btnPublishReviewRound = document.getElementById('btn-publish-review-round');
  const btnPublishReviewRoundText = document.getElementById('btn-publish-review-round-text');
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
  const tokenCustomInput = document.getElementById('token-custom-input');
  const btnShuffleCreateToken = document.getElementById('btn-shuffle-create-token');
  const btnToggleCreateTokenEdit = document.getElementById('btn-toggle-create-token-edit');
  const btnCloseCreateTokenEdit = document.getElementById('btn-close-create-token-edit');
  const createTokenEditBox = document.getElementById('create-token-edit-box');
  const createTokenDisplayVal = document.getElementById('create-token-display-val');
  const createTokenWordCountBadge = document.getElementById('create-token-word-count-badge');
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

      const commentId = options.commentId !== undefined ? options.commentId : params.get('commentId');
      if (commentId) {
        newParams.set('commentId', commentId);
      }
    }

    if (filterSearch && filterSearch.value.trim()) {
      newParams.set('search', filterSearch.value.trim());
    }
    const filterPlatform = document.getElementById('filter-platform');
    if (filterPlatform && filterPlatform.value) {
      newParams.set('platform', filterPlatform.value);
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

    const platformVal = params.get('platform') || '';
    const filterPlatform = document.getElementById('filter-platform');
    if (filterPlatform) filterPlatform.value = platformVal;

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
    const commentId = params.get('commentId') || params.get('comment');
    const tabParam = params.get('tab') || (solutionId ? 'detail' : 'explorer');
    const targetTabId = tabParam.startsWith('tab-') ? tabParam : `tab-${tabParam}`;

    activateTab(targetTabId, false);

    if (solutionId) {
      await openSolutionDetail(solutionId, false);
      if (commentId) {
        setTimeout(() => {
          scrollToAndHighlightComment(commentId);
        }, 250);
      }
    }

    const subtabParam = params.get('subtab');
    if (subtabParam) {
      const targetSubtabId = subtabParam.startsWith('subtab-') ? subtabParam : `subtab-${subtabParam}`;
      activateSidebarSubtab(targetSubtabId, false);
    }
  }

  // Prism Read-Only Code Viewer Initialization & Event Plumbing
  function initCodeViewer() {
    setupSelectionTooltipWidget();

    // Global click outside listener to hide floating tooltip
    document.addEventListener('mousedown', (e) => {
      if (!e.target.closest('#monaco-selection-tooltip') && !e.target.closest('#code-viewer')) {
        hideSelectionTooltip();
      }
    });

    // Auto-load active solution from URL if any
    const params = new URLSearchParams(window.location.search);
    const solId = state.activeSolution ? state.activeSolution.id : (params.get('solutionId') || params.get('solution') || params.get('id'));
    if (solId) {
      openSolutionDetail(solId, false);
    }
  }

  function initMonaco() {
    initCodeViewer();
  }

  // Split Prism-highlighted HTML string safely line-by-line while preserving open token tags
  function splitHighlightedCodeIntoLines(html) {
    if (!html) return [''];
    const lines = [];
    const stack = [];
    let currentLine = '';
    let pos = 0;

    while (pos < html.length) {
      if (html[pos] === '<') {
        const closeIdx = html.indexOf('>', pos);
        if (closeIdx === -1) {
          currentLine += html.substring(pos);
          break;
        }
        const tagStr = html.substring(pos, closeIdx + 1);
        pos = closeIdx + 1;

        if (tagStr.startsWith('</')) {
          stack.pop();
          currentLine += tagStr;
        } else if (tagStr.endsWith('/>')) {
          currentLine += tagStr;
        } else {
          stack.push(tagStr);
          currentLine += tagStr;
        }
      } else if (html[pos] === '\n') {
        let closedTags = '';
        for (let i = stack.length - 1; i >= 0; i--) {
          const tagName = stack[i].match(/<([a-z0-9]+)/i)?.[1] || 'span';
          closedTags += `</${tagName}>`;
        }
        lines.push(currentLine + closedTags);

        let reopenedTags = '';
        for (let i = 0; i < stack.length; i++) {
          reopenedTags += stack[i];
        }
        currentLine = reopenedTags;
        pos++;
      } else {
        const nextLt = html.indexOf('<', pos);
        const nextNl = html.indexOf('\n', pos);
        let nextSpecial = html.length;
        if (nextLt !== -1 && nextNl !== -1) nextSpecial = Math.min(nextLt, nextNl);
        else if (nextLt !== -1) nextSpecial = nextLt;
        else if (nextNl !== -1) nextSpecial = nextNl;

        currentLine += html.substring(pos, nextSpecial);
        pos = nextSpecial;
      }
    }
    lines.push(currentLine);
    return lines;
  }

  // Render Solution Code with Prism Syntax Highlighting & Line Gutters
  function renderCodeViewer(codeText, language) {
    const container = document.getElementById('code-viewer');
    if (!container) return;

    state.activeCodeLines = (codeText || '').split('\n');
    const lines = state.activeCodeLines;
    const langClass = `language-${language}`;

    let highlightedHtml = '';
    if (typeof Prism !== 'undefined' && Prism.languages[language]) {
      highlightedHtml = Prism.highlight(codeText, Prism.languages[language], language);
    } else if (typeof Prism !== 'undefined' && Prism.languages.clike) {
      highlightedHtml = Prism.highlight(codeText, Prism.languages.clike, 'clike');
    } else {
      highlightedHtml = escapeHtml(codeText);
    }

    const highlightedLines = splitHighlightedCodeIntoLines(highlightedHtml);

    const comments = state.activeSolution?.comments || [];
    const drafts = state.activeDraftComments || [];
    const commentLineSet = new Set();
    const draftLineSet = new Set();

    comments.forEach(c => {
      if (c.startLine) {
        const s = parseInt(c.startLine);
        const e = parseInt(c.endLine) || s;
        for (let l = s; l <= e; l++) commentLineSet.add(l);
      }
    });

    drafts.forEach(d => {
      if (d.startLine) {
        const s = parseInt(d.startLine);
        const e = parseInt(d.endLine) || s;
        for (let l = s; l <= e; l++) draftLineSet.add(l);
      }
    });

    let linesHtml = '';
    lines.forEach((lineText, index) => {
      const lineNum = index + 1;
      const hasComment = commentLineSet.has(lineNum);
      const hasDraft = draftLineSet.has(lineNum);

      let dotHtml = '';
      if (hasComment) dotHtml = `<span class="comment-dot published" title="Has inline review comment"></span>`;
      else if (hasDraft) dotHtml = `<span class="comment-dot draft" title="Has pending AI draft comment"></span>`;

      const lineCodeContent = highlightedLines[index] !== undefined ? highlightedLines[index] : escapeHtml(lineText);

      linesHtml += `
        <div class="code-line ${hasComment ? 'has-comment' : ''} ${hasDraft ? 'has-draft' : ''}" data-line="${lineNum}" id="code-line-${lineNum}">
          <div class="line-gutter" data-line="${lineNum}">
            ${dotHtml}
            <span>${lineNum}</span>
          </div>
          <div class="line-code ${langClass}">${lineCodeContent || '&nbsp;'}</div>
        </div>
      `;
    });

    container.innerHTML = linesHtml;
    setupCodeLineEventListeners(container);
  }

  function setupCodeLineEventListeners(container) {
    if (!container) return;

    // Gutter Click Listener (Single Line or Shift-Click Multi-Line Range)
    container.querySelectorAll('.line-gutter').forEach(gutter => {
      gutter.addEventListener('click', (e) => {
        e.stopPropagation();
        const lineNum = parseInt(gutter.dataset.line);
        if (!lineNum) return;

        if (e.shiftKey && state.currentSelection && state.currentSelection.startLine) {
          const sLine = Math.min(state.currentSelection.startLine, lineNum);
          const eLine = Math.max(state.currentSelection.startLine, lineNum);
          openInlineCommentBox(sLine, eLine);
        } else {
          openInlineCommentBox(lineNum, lineNum);
        }
      });
    });

    // Hover effect over code lines to highlight corresponding sidebar comments or line highlights
    container.querySelectorAll('.code-line').forEach(lineEl => {
      const lineNum = parseInt(lineEl.dataset.line);

      lineEl.addEventListener('mouseenter', () => {
        const comments = state.activeSolution?.comments || [];
        const drafts = state.activeDraftComments || [];

        const matchedComment = comments.find(c => c.startLine && lineNum >= parseInt(c.startLine) && lineNum <= (parseInt(c.endLine) || parseInt(c.startLine)));
        const matchedDraft = drafts.find(d => d.startLine && lineNum >= parseInt(d.startLine) && lineNum <= (parseInt(d.endLine) || parseInt(d.startLine)));

        if (matchedComment) {
          highlightMonacoLines(matchedComment.startLine, matchedComment.endLine || matchedComment.startLine, false);
        } else if (matchedDraft) {
          highlightMonacoLines(matchedDraft.startLine, matchedDraft.endLine || matchedDraft.startLine, true);
        }
      });

      lineEl.addEventListener('mouseleave', () => clearMonacoLineHighlight());
    });

    // Selection listener inside code container for multi-line / text selection
    container.addEventListener('mouseup', () => {
      setTimeout(() => checkCodeViewerSelection(), 20);
    });
  }

  function checkCodeViewerSelection() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      hideSelectionTooltip();
      return;
    }

    const container = document.getElementById('code-viewer');
    if (!container || !container.contains(sel.anchorNode)) {
      hideSelectionTooltip();
      return;
    }

    const startLineEl = sel.anchorNode.nodeType === 1 ? sel.anchorNode.closest('.code-line') : sel.anchorNode.parentElement?.closest('.code-line');
    const endLineEl = sel.focusNode.nodeType === 1 ? sel.focusNode.closest('.code-line') : sel.focusNode.parentElement?.closest('.code-line');

    if (startLineEl && endLineEl) {
      const l1 = parseInt(startLineEl.dataset.line);
      const l2 = parseInt(endLineEl.dataset.line);
      const start = Math.min(l1, l2);
      const end = Math.max(l1, l2);

      state.currentSelection = { startLine: start, endLine: end };

      if (monacoSelectionBadge) {
        if (start === end) {
          monacoSelectionBadge.innerHTML = `${HRIcons.target(12)} <span>Line ${start} selected</span>`;
        } else {
          monacoSelectionBadge.innerHTML = `${HRIcons.target(12)} <span>Lines ${start} - ${end} selected (${end - start + 1} lines)</span>`;
        }
      }

      showSelectionTooltip(endLineEl);
    }
  }

  // Floating Selection Tooltip Widget
  let selectionTooltipEl = null;

  function setupSelectionTooltipWidget() {
    if (selectionTooltipEl) return;
    selectionTooltipEl = document.createElement('div');
    selectionTooltipEl.id = 'monaco-selection-tooltip';
    selectionTooltipEl.className = 'monaco-selection-tooltip';
    selectionTooltipEl.style.position = 'absolute';
    selectionTooltipEl.style.display = 'none';
    selectionTooltipEl.style.zIndex = '1000';
    selectionTooltipEl.innerHTML = `<button type="button" class="btn-tooltip-comment">${HRIcons.comment(13)} <span>Add Comment</span></button>`;

    selectionTooltipEl.querySelector('button').addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.currentSelection) {
        openInlineCommentBox(state.currentSelection.startLine, state.currentSelection.endLine);
        hideSelectionTooltip();
      }
    });

    const editorContainer = document.getElementById('monaco-editor') || document.body;
    editorContainer.appendChild(selectionTooltipEl);
  }

  function showSelectionTooltip(anchorEl) {
    if (!selectionTooltipEl || !state.currentSelection) return;
    state.showSelectionTooltip = true;

    const lineEl = anchorEl || document.getElementById(`code-line-${state.currentSelection.startLine}`);
    if (lineEl) {
      const editorBox = document.getElementById('monaco-editor').getBoundingClientRect();
      const lineBox = lineEl.getBoundingClientRect();

      const topPos = lineBox.top - editorBox.top - 28;
      const leftPos = Math.max(70, lineBox.left - editorBox.left + 20);

      selectionTooltipEl.style.top = `${Math.max(4, topPos)}px`;
      selectionTooltipEl.style.left = `${leftPos}px`;
      selectionTooltipEl.style.display = 'block';
    }
  }

  function hideSelectionTooltip() {
    state.showSelectionTooltip = false;
    if (selectionTooltipEl) {
      selectionTooltipEl.style.display = 'none';
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

    // Sidebar navigation sub-tabs (Comments / Description / Reviews / Ratings)
    document.querySelectorAll('.sidebar-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetSubtab = btn.dataset.subtab;
        activateSidebarSubtab(targetSubtab, true);
      });
    });

    // Quick View Problem Statement Button in Editor Toolbar
    if (btnQuickViewStatement) {
      btnQuickViewStatement.addEventListener('click', () => {
        activateSidebarSubtab('subtab-statement', true);
      });
    }

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

    const filterPlatform = document.getElementById('filter-platform');
    if (filterPlatform) {
      filterPlatform.addEventListener('change', () => {
        updateUrlState();
        loadSolutions({ append: false });
      });
    }
    if (filterLanguage) {
      filterLanguage.addEventListener('change', () => {
        updateUrlState();
        loadSolutions({ append: false });
      });
    }

    // Star Selectors
    setupStarSelectors();

    // Rating Submit
    btnSubmitRating.addEventListener('click', submitRating);

    // Comment Submit
    btnPostComment.addEventListener('click', postComment);
    if (commentInput) {
      commentInput.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          postComment();
        }
      });
    }

    // LLM Prompt Copy & Structured Import
    if (btnCopyReviewPrompt) btnCopyReviewPrompt.addEventListener('click', copyReviewPrompt);
    if (btnTogglePromptPreview) btnTogglePromptPreview.addEventListener('click', togglePromptPreview);
    if (btnImportLlmReview) btnImportLlmReview.addEventListener('click', processLlmReviewResponse);
    if (btnApproveAllDrafts) btnApproveAllDrafts.addEventListener('click', approveAllDraftComments);
    if (btnRejectAllDrafts) btnRejectAllDrafts.addEventListener('click', rejectAllDraftComments);

    // Publish Review Round & Status Change
    if (reviewStatusSelect) reviewStatusSelect.addEventListener('change', updateReviewRoundPublisherUI);
    if (btnPublishReviewRound) btnPublishReviewRound.addEventListener('click', publishReviewRound);

    // Admin Token Form & Edit Drawer
    if (formCreateToken) formCreateToken.addEventListener('submit', createToken);
    if (btnToggleCreateTokenEdit) {
      btnToggleCreateTokenEdit.addEventListener('click', () => {
        if (!createTokenEditBox) return;
        const isHidden = createTokenEditBox.style.display === 'none';
        createTokenEditBox.style.display = isHidden ? 'flex' : 'none';
        if (isHidden && tokenCustomInput) tokenCustomInput.focus();
      });
    }
    if (btnCloseCreateTokenEdit) {
      btnCloseCreateTokenEdit.addEventListener('click', () => {
        if (createTokenEditBox) createTokenEditBox.style.display = 'none';
      });
    }
    if (btnShuffleCreateToken) btnShuffleCreateToken.addEventListener('click', shuffleFormToken);
    if (tokenCustomInput) tokenCustomInput.addEventListener('input', updateTokenWordCountBadge);

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
      const isFilled = val <= score;
      if (isHover) {
        btn.classList.toggle('hover-highlight', isFilled);
      } else {
        btn.classList.remove('hover-highlight');
        btn.classList.toggle('active', isFilled);
        btn.setAttribute('aria-checked', val === score ? 'true' : 'false');
      }
      btn.innerHTML = isFilled ? HRIcons.starFilled(13) : HRIcons.star(13);
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
    updateStarVisuals('cleverness', 0, false);
    updateStarVisuals('readability', 0, false);
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

    // AI Review Assistant & Review Round Publisher panels
    if (adminAiAssistantPanel) {
      adminAiAssistantPanel.style.display = isAdmin ? 'block' : 'none';
    }
    if (adminReviewPublisherBox) {
      adminReviewPublisherBox.style.display = isAdmin ? 'block' : 'none';
    }

    // Subtab navigation label
    const reviewsTabBtnSpan = document.querySelector('.sidebar-tab-btn[data-subtab="subtab-reviews"] span');
    if (reviewsTabBtnSpan) {
      reviewsTabBtnSpan.textContent = isAdmin ? 'AI & Admin Reviews' : 'Review History';
    }

    // If not admin, purge draft comments state and decorations
    if (!isAdmin) {
      state.activeDraftComments = [];
      if (typeof updateMonacoDraftDecorations === 'function') updateMonacoDraftDecorations();
      if (typeof renderAiDraftComments === 'function') renderAiDraftComments();
    }

    // Refresh active solution workspace views with permission filters
    if (state.activeSolution) {
      renderComments(state.activeSolution.comments || []);
      renderReviewRoundsTimeline(state.activeSolution.reviewRounds || []);
      if (typeof updateMonacoViewZones === 'function') updateMonacoViewZones();
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

      const icon = n.type === 'COMMENT' ? HRIcons.comment(14) : HRIcons.document(14);
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

  function showRetroToast(message, iconSvg = null) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const iconHtml = iconSvg || HRIcons.bell(16);
    const toast = document.createElement('div');
    toast.className = 'retro-toast';
    toast.innerHTML = `
      <span class="toast-icon">${iconHtml}</span>
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

  // Infinite Scroll Observer Setup
  let infiniteScrollObserver = null;
  function setupInfiniteScroll() {
    if (!infiniteScrollSentinel) return;

    if (infiniteScrollObserver) {
      infiniteScrollObserver.disconnect();
    }

    infiniteScrollObserver = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && state.hasMore && !state.isLoading) {
        loadSolutions({ append: true });
      }
    }, {
      root: null,
      rootMargin: '400px',
      threshold: 0.05
    });

    infiniteScrollObserver.observe(infiniteScrollSentinel);
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
      solutionsGrid.innerHTML = '<div class="glass-panel" style="grid-column: 1 / -1; text-align: center; color: var(--text-dim);"><div class="spinner-retro" style="margin-bottom: 8px;"></div><br>Loading problems...</div>';
      if (infiniteScrollSentinel) infiniteScrollSentinel.classList.add('hidden');
    } else {
      if (infiniteScrollSentinel) infiniteScrollSentinel.classList.remove('hidden');
    }

    const params = new URLSearchParams();
    params.append('offset', state.offset);
    params.append('limit', state.limit);

    const filterPlatform = document.getElementById('filter-platform');
    if (filterPlatform && filterPlatform.value) params.append('platform', filterPlatform.value);
    if (filterSearch && filterSearch.value.trim()) params.append('search', filterSearch.value.trim());
    if (filterLanguage && filterLanguage.value) params.append('language', filterLanguage.value);

    if (multiselectUser) {
      const selectedUsers = multiselectUser.getSelectedUsernames();
      if (selectedUsers.length > 0 && selectedUsers.length < multiselectUser.usersList.length) {
        params.append('usernames', selectedUsers.join(','));
      }
    }

    try {
      const res = await fetch(`/api/solutions?${params.toString()}`);
      const data = await res.json();

      const newSolutions = data.solutions || [];
      const pagination = data.pagination || {};

      state.totalCount = pagination.total !== undefined ? pagination.total : (state.solutions.length + newSolutions.length);
      state.hasMore = Boolean(pagination.hasMore);
      state.offset = pagination.nextOffset !== undefined ? pagination.nextOffset : (state.offset + newSolutions.length);

      if (!append) {
        state.solutions = newSolutions;
        renderSolutionsGrid(state.solutions);
      } else {
        state.solutions.push(...newSolutions);
        renderSolutionsGrid(state.solutions);
      }
    } catch (err) {
      if (!append) {
        solutionsGrid.innerHTML = `<div class="glass-panel" style="grid-column: 1 / -1; color: var(--role-critical);">Failed to load solutions: ${err.message}</div>`;
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
        html += `<span class="star-icon filled" style="color: var(--role-attention); display: inline-flex;">${HRIcons.starFilled(10)}</span>`;
      } else {
        html += `<span class="star-icon empty" style="color: var(--text-dim); opacity: 0.35; display: inline-flex;">${HRIcons.star(10)}</span>`;
      }
    }
    return `<span class="star-rating" style="display: inline-flex; align-items: center; gap: 2px;">${html}</span>`;
  }

  // Problem Explorer & Grouped Solutions Renderer
  function renderSolutionsGrid(solutions) {
    if (!solutionsGrid) return;
    if (!solutions || solutions.length === 0) {
      solutionsGrid.innerHTML = '<div class="glass-panel" style="grid-column: 1 / -1; text-align: center; color: var(--text-muted);">No problems or solutions match the specified filters.</div>';
      return;
    }

    // Group solutions by challenge slug
    const groupedMap = new Map();
    solutions.forEach(sol => {
      const slug = sol.challengeSlug || 'unknown';
      if (!groupedMap.has(slug)) {
        groupedMap.set(slug, {
          slug: slug,
          title: sol.challengeTitle || slug,
          platform: sol.platform || 'hackerrank',
          descriptionSnippet: sol.descriptionSnippet || '',
          solutions: [],
          solvedByMap: new Map()
        });
      }
      const group = groupedMap.get(slug);
      group.solutions.push(sol);

      const username = sol.user?.username || 'unknown';
      if (!group.solvedByMap.has(username)) {
        group.solvedByMap.set(username, sol.user || { username: username, role: 'USER' });
      }
    });

    solutionsGrid.innerHTML = '';
    const searchTerm = filterSearch ? filterSearch.value.trim().toLowerCase() : '';

    let totalProblems = groupedMap.size;
    groupedMap.forEach(group => {
      solutionsGrid.appendChild(createProblemCard(group, searchTerm));
    });

    if (solutionsCountBadge) {
      solutionsCountBadge.textContent = `${totalProblems} Problem${totalProblems === 1 ? '' : 's'} (${state.solutions.length} Solutions)`;
    }
  }

  function createProblemCard(group, searchTerm = '') {
    const card = document.createElement('div');
    card.className = 'problem-card';

    const isLC = group.platform === 'leetcode';
    const platformBadge = isLC
      ? `<span class="lang-tag" style="background: rgba(255, 161, 22, 0.15); border-color: rgba(255, 161, 22, 0.4); color: #FFA116;">LeetCode</span>`
      : `<span class="lang-tag" style="background: rgba(0, 229, 255, 0.15); border-color: rgba(0, 229, 255, 0.4); color: var(--color-brand);">HackerRank</span>`;

    const totalSols = group.solutions.length;
    const countBadge = `<span class="count-badge segment-number" style="font-size: 0.72rem; padding: 2px 6px;">${totalSols} Solution${totalSols === 1 ? '' : 's'}</span>`;

    // Render Solved By User Badges
    let solvedByHtml = '';
    group.solvedByMap.forEach((u, username) => {
      const isAdmin = u.role === 'ADMIN';
      solvedByHtml += `<span class="user-badge-tag${isAdmin ? ' admin' : ''}" title="${escapeHtml(username)}'s Solution">@${escapeHtml(username)}</span>`;
    });

    const descSnippet = group.descriptionSnippet ? escapeHtml(group.descriptionSnippet) : '';

    // Primary / Latest Solution (First solution in sorted array)
    const latestSol = group.solutions[0];
    const latestUser = escapeHtml(latestSol.user?.username || 'unknown');
    const latestClever = renderStarsHtml(latestSol.clevernessAvg);
    const latestRead = renderStarsHtml(latestSol.readabilityAvg);
    const latestComments = latestSol._count?.comments !== undefined ? latestSol._count.comments : (latestSol.comments ? latestSol.comments.length : (latestSol._count?.reviewRounds || 0));

    card.innerHTML = `
      <div>
        <div class="problem-card-header">
          <div class="problem-title-group">
            <div class="problem-title">${escapeHtml(group.title)}</div>
            <div class="problem-meta-row">
              ${platformBadge}
              ${countBadge}
            </div>
          </div>
        </div>

        <div class="solved-by-container">
          <span class="solved-by-label">SOLVED BY:</span>
          ${solvedByHtml}
        </div>

        ${descSnippet ? `<div class="sol-desc-snippet" style="margin-top: 0.4rem;" title="${descSnippet}">${descSnippet}</div>` : ''}
      </div>

      <!-- Latest Solution Preview Card -->
      <div class="latest-solution-container glass-panel">
        <div class="latest-solution-header">
          <div class="latest-label">
            ${HRIcons.check(12)}
            <span>Latest Solution by @${latestUser}</span>
          </div>
          <span class="lang-tag">${escapeHtml(latestSol.language)}</span>
        </div>

        <div class="sol-ratings-summary">
          <div class="rating-badge" title="Cleverness: ${latestSol.clevernessAvg ? latestSol.clevernessAvg + '/5' : '0/5'}">
            <span style="color: var(--color-brand); display: inline-flex;">${HRIcons.brain(12)}</span>
            ${latestClever}
          </div>
          <div class="rating-badge" title="Readability: ${latestSol.readabilityAvg ? latestSol.readabilityAvg + '/5' : '0/5'}">
            <span style="color: var(--color-brand); display: inline-flex;">${HRIcons.bookOpen(12)}</span>
            ${latestRead}
          </div>
          <div class="rating-badge" title="Comments: ${latestComments}">
            <span style="color: var(--text-muted); display: inline-flex;">${HRIcons.comment(12)}</span>
            <span class="segment-number" style="font-size: 0.75rem; color: var(--text-bright);">${latestComments}</span>
          </div>
          <button type="button" class="btn-micro btn-open-latest" style="margin-left: auto; color: var(--color-brand); border-color: rgba(0, 229, 255, 0.4);">
            Open Review
          </button>
        </div>
      </div>
    `;

    // Wire up Open Review button for Latest Solution
    card.querySelector('.btn-open-latest')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openSolutionDetail(latestSol.id);
    });

    // If more than 1 solution, add "Show More" accordion toggle & container
    if (totalSols > 1) {
      const otherSols = group.solutions.slice(1);
      const accordionEl = document.createElement('div');
      accordionEl.className = 'solutions-accordion hidden';

      let autoExpand = false;

      otherSols.forEach((sol) => {
        const item = document.createElement('div');
        const solUser = escapeHtml(sol.user?.username || 'unknown');
        const solComments = sol._count?.comments !== undefined ? sol._count.comments : (sol.comments ? sol.comments.length : (sol._count?.reviewRounds || 0));

        let isMatch = false;
        if (searchTerm) {
          if (solUser.toLowerCase().includes(searchTerm) || (sol.language && sol.language.toLowerCase().includes(searchTerm)) || (sol.code && sol.code.toLowerCase().includes(searchTerm))) {
            isMatch = true;
            autoExpand = true;
          }
        }

        item.className = `accordion-solution-item${isMatch ? ' matching-search' : ''}`;
        item.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 0.8rem; font-family: var(--font-segment); color: var(--text-bright);">@${solUser}</span>
            <span class="lang-tag" style="font-size: 0.7rem;">${escapeHtml(sol.language)}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin-left: auto;">
            <div class="rating-badge" title="Comments: ${solComments}">
              <span style="color: var(--text-muted); display: inline-flex;">${HRIcons.comment(12)}</span>
              <span class="segment-number" style="font-size: 0.75rem;">${solComments}</span>
            </div>
            <button type="button" class="btn-micro" style="color: var(--color-brand);">Open</button>
          </div>
        `;

        item.addEventListener('click', (e) => {
          e.stopPropagation();
          openSolutionDetail(sol.id);
        });

        accordionEl.appendChild(item);
      });

      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'btn-show-more-solutions';

      const updateBtnText = (isExpanded) => {
        toggleBtn.innerHTML = isExpanded
          ? `${HRIcons.chevronUp(12)} <span>Hide Other Solutions (${otherSols.length})</span>`
          : `${HRIcons.chevronDown(12)} <span>Show ${otherSols.length} More Solution${otherSols.length === 1 ? '' : 's'}</span>`;
      };

      if (autoExpand) {
        accordionEl.classList.remove('hidden');
        updateBtnText(true);
      } else {
        updateBtnText(false);
      }

      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isCurrentlyHidden = accordionEl.classList.contains('hidden');
        if (isCurrentlyHidden) {
          accordionEl.classList.remove('hidden');
          updateBtnText(true);
        } else {
          accordionEl.classList.add('hidden');
          updateBtnText(false);
        }
      });

      card.appendChild(toggleBtn);
      card.appendChild(accordionEl);
    }

    card.addEventListener('click', (e) => {
      // If clicking problem card outside interactive buttons, open latest solution
      if (!e.target.closest('button') && !e.target.closest('.user-badge-tag') && !e.target.closest('.accordion-solution-item')) {
        openSolutionDetail(latestSol.id);
      }
    });

    return card;
  }

  // Load Problem Statement (Fallback / Direct)
  async function loadProblemStatement(slug) {
    if (!detailStatementContainer || !slug) return;
    detailStatementContainer.innerHTML = '<div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 2rem 1rem;"><div class="spinner-retro" style="margin-bottom: 8px;"></div><br>Loading problem statement...</div>';
    try {
      const res = await fetch(`/api/problems/${slug}`);
      const data = await res.json();
      if (data.problem && data.problem.statementHtml) {
        const isLeetCode = data.problem.platform === 'leetcode';
        const platformBadge = isLeetCode 
          ? `<div style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 4px; background: rgba(255, 161, 22, 0.15); border: 1px solid rgba(255, 161, 22, 0.4); color: #FFA116; font-size: 0.75rem; font-weight: 600; margin-bottom: 12px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: #FFA116; display: inline-block;"></span>
              LeetCode Problem
            </div>`
          : `<div style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 4px; background: rgba(0, 229, 255, 0.15); border: 1px solid rgba(0, 229, 255, 0.4); color: #00e5ff; font-size: 0.75rem; font-weight: 600; margin-bottom: 12px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: #00e5ff; display: inline-block;"></span>
              HackerRank Problem
            </div>`;
            
        const extLink = data.problem.url || (isLeetCode ? `https://leetcode.com/problems/${slug}/` : `https://www.hackerrank.com/challenges/${slug}/problem`);
        const extButtonHtml = `
          <div style="margin-top: 16px; padding-top: 12px; border-top: 1px dashed rgba(255, 255, 255, 0.15); text-align: right;">
            <a href="${extLink}" target="_blank" rel="noopener noreferrer" class="btn-retro ${isLeetCode ? 'btn-yellow' : 'btn-cyan'}" style="display: inline-flex; align-items: center; gap: 6px; text-decoration: none; font-size: 0.75rem;">
              <span>${isLeetCode ? 'Open on LeetCode' : 'View on HackerRank'}</span>
              ${HRIcons.external(12)}
            </a>
          </div>
        `;

        detailStatementContainer.innerHTML = platformBadge + `<div class="statement-content-box leetcode-statement">${data.problem.statementHtml}</div>` + extButtonHtml;
      } else {
        const isLeetCode = data.problem && data.problem.platform === 'leetcode';
        const targetUrl = data.problem?.url || (isLeetCode ? `https://leetcode.com/problems/${slug}/` : `https://www.hackerrank.com/challenges/${slug}/problem`);
        detailStatementContainer.innerHTML = `
          <div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted);">
            <p style="margin-bottom: 0.75rem;">Problem statement not available locally.</p>
            <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" class="btn-retro ${isLeetCode ? 'btn-yellow' : 'btn-cyan'}" style="display: inline-flex; align-items: center; gap: 6px; text-decoration: none;">
              <span>${isLeetCode ? 'View on LeetCode' : 'View on HackerRank'}</span>
              ${HRIcons.external(12)}
            </a>
          </div>
        `;
      }
    } catch (e) {
      detailStatementContainer.innerHTML = `<div style="color: var(--role-critical); font-size: 0.8rem; padding: 1rem;">Failed to load problem statement: ${escapeHtml(e.message)}</div>`;
    }
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

      // Render Problem Statement & Challenge Links
      const problem = sol.problemStatement || null;
      const isLC = sol.platform === 'leetcode' || problem?.platform === 'leetcode';
      const challengeUrl = problem?.url || (isLC ? `https://leetcode.com/problems/${sol.challengeSlug}/` : `https://www.hackerrank.com/challenges/${sol.challengeSlug}/problem`);

      if (detailHackerrankLink) {
        detailHackerrankLink.style.display = 'inline-flex';
        detailHackerrankLink.href = challengeUrl;
        detailHackerrankLink.style.borderColor = isLC ? 'rgba(255, 161, 22, 0.4)' : 'rgba(0, 229, 255, 0.4)';
        detailHackerrankLink.style.color = isLC ? '#FFA116' : 'var(--color-brand)';
        detailHackerrankLink.innerHTML = `<span>${isLC ? 'LeetCode' : 'HackerRank'}</span>${HRIcons.external(11)}`;
      }
      if (detailStatementSlug) {
        detailStatementSlug.textContent = isLC ? 'LEETCODE' : 'HACKERRANK';
        detailStatementSlug.style.color = isLC ? '#FFA116' : 'var(--color-brand)';
        detailStatementSlug.style.borderColor = isLC ? 'rgba(255, 161, 22, 0.4)' : 'rgba(0, 229, 255, 0.3)';
        detailStatementSlug.style.background = isLC ? 'rgba(255, 161, 22, 0.12)' : 'rgba(0, 229, 255, 0.12)';
      }
      if (detailStatementTitle) {
        detailStatementTitle.textContent = sol.challengeTitle || 'Problem Statement';
      }
      if (detailStatementExternalLink) {
        detailStatementExternalLink.href = challengeUrl;
        detailStatementExternalLink.style.borderColor = isLC ? 'rgba(255, 161, 22, 0.4)' : 'rgba(0, 229, 255, 0.4)';
        detailStatementExternalLink.style.color = isLC ? '#FFA116' : 'var(--color-brand)';
        detailStatementExternalLink.innerHTML = `<span>${isLC ? 'Open on LeetCode' : 'Open on HackerRank'}</span>${HRIcons.external(11)}`;
      }
      if (detailStatementContainer) {
        if (problem && problem.statementHtml) {
          detailStatementContainer.innerHTML = `<div class="statement-content-box ${isLC ? 'leetcode-statement' : ''}">${problem.statementHtml}</div>`;
        } else {
          loadProblemStatement(sol.challengeSlug);
        }
      }

      avgClevernessVal.textContent = sol.clevernessAvg ? `${sol.clevernessAvg} / 5` : '-- / 5';
      avgReadabilityVal.textContent = sol.readabilityAvg ? `${sol.readabilityAvg} / 5` : '-- / 5';

      // Load code into Prism Code Viewer
      let prismLang = 'python';
      if (sol.language) {
        const l = sol.language.toLowerCase();
        if (l.includes('cpp') || l.includes('c++')) prismLang = 'cpp';
        else if (l.includes('java')) prismLang = 'java';
        else if (l.includes('js') || l.includes('javascript')) prismLang = 'javascript';
        else if (l.includes('py')) prismLang = 'python';
        else if (l.includes('go')) prismLang = 'go';
        else if (l.includes('rust')) prismLang = 'rust';
        else if (l.includes('cs') || l.includes('csharp')) prismLang = 'csharp';
        else if (l.includes('ruby')) prismLang = 'ruby';
        else if (l.includes('php')) prismLang = 'php';
        else if (l.includes('swift')) prismLang = 'swift';
        else if (l.includes('kotlin')) prismLang = 'kotlin';
      }
      renderCodeViewer(sol.code || '', prismLang);

      // Initialize active solution ratings (show solid filled stars for existing ratings)
      const myRating = (sol.ratings || []).find(r => r.userId === state.currentUser?.id);
      const initialClever = myRating ? myRating.cleverness : Math.round(sol.clevernessAvg || 0);
      const initialRead = myRating ? myRating.readability : Math.round(sol.readabilityAvg || 0);
      state.selectedCleverness = initialClever;
      state.selectedReadability = initialRead;
      if (typeof updateStarVisuals === 'function') {
        updateStarVisuals('cleverness', initialClever, false);
        updateStarVisuals('readability', initialRead, false);
      }
      state.activeDraftComments = [];
      state.activeInlineLine = null;
      state.collapsedZones.clear();
      closeInlineCommentBox();
      if (promptPreviewDrawer) {
        promptPreviewDrawer.style.display = 'none';
        promptPreviewDrawer.textContent = '';
      }
      if (llmReviewInput) llmReviewInput.value = '';
      if (parsedReviewCard) parsedReviewCard.style.display = 'none';
      if (adminReviewNotes) adminReviewNotes.value = '';
      renderAiDraftComments();
      updateMonacoDraftDecorations();
      updateMonacoViewZones();

      renderComments(sol.comments || []);
      renderReviewRoundsTimeline(sol.reviewRounds || []);
      updateReviewRoundPublisherUI();

      // Switch tab and update URL
      activateTab('tab-detail', false);
      if (updateUrl) {
        updateUrlState({ solutionId: id, tab: 'tab-detail', commentId: null });
      }
    } catch (err) {
      alert('Failed to load solution details: ' + err.message);
    }
  }

  // Dynamic Hover Line Highlight Helper Functions for Comments
  function highlightMonacoLines(startLine, endLine, isDraft = false) {
    if (!startLine) return;
    const sLine = parseInt(startLine);
    const eLine = parseInt(endLine) || sLine;
    const highlightClass = isDraft ? 'highlighted-draft' : 'highlighted-comment';

    clearMonacoLineHighlight();
    for (let l = sLine; l <= eLine; l++) {
      const el = document.getElementById(`code-line-${l}`);
      if (el) el.classList.add(highlightClass);
    }
  }
  window.highlightMonacoLines = highlightMonacoLines;

  function clearMonacoLineHighlight() {
    document.querySelectorAll('.code-line.highlighted-comment, .code-line.highlighted-draft').forEach(el => {
      el.classList.remove('highlighted-comment', 'highlighted-draft');
    });
  }
  window.clearMonacoLineHighlight = clearMonacoLineHighlight;

  function scrollToMonacoLines(startLine, endLine) {
    if (!startLine) return;
    const sLine = parseInt(startLine);
    const eLine = parseInt(endLine) || sLine;

    state.collapsedZones.delete(eLine);
    if (typeof updateInlineCommentThreads === 'function') updateInlineCommentThreads();

    const targetEl = document.getElementById(`code-line-${sLine}`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      highlightMonacoLines(sLine, eLine, false);
    }
  }
  window.scrollToMonacoLines = scrollToMonacoLines;

  function replyToComment(commentId, username, startLine, endLine) {
    if (startLine) {
      const sLine = parseInt(startLine);
      const eLine = parseInt(endLine) || sLine;
      state.collapsedZones.delete(eLine);
      state.activeInlineLine = eLine;
      updateMonacoViewZones();

      setTimeout(() => {
        scrollToMonacoLines(sLine, eLine);
        const input = document.getElementById(`zone-input-${eLine}`);
        if (input) {
          if (username && !input.value.includes(`@${username}`)) {
            input.value = `@${username} ` + input.value;
          }
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }
      }, 80);
    } else {
      // General comment reply in sidebar
      if (commentInput) {
        if (username && !commentInput.value.includes(`@${username}`)) {
          commentInput.value = `@${username} ` + commentInput.value;
        }
        commentInput.focus();
        commentInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }
  window.replyToComment = replyToComment;

  // Copy Deep Link to Comment
  function copyCommentLink(commentId, event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (!commentId || !state.activeSolution) return;

    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'detail');
    url.searchParams.set('solutionId', state.activeSolution.id);
    url.searchParams.set('commentId', commentId);

    const fullUrl = url.toString();

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullUrl).then(() => {
        showRetroToast('COMMENT LINK COPIED TO CLIPBOARD', HRIcons.link ? HRIcons.link(16) : null);
      }).catch(() => {
        prompt('Copy comment link:', fullUrl);
      });
    } else {
      prompt('Copy comment link:', fullUrl);
    }

    updateUrlState({ commentId, replace: true });

    if (event && event.currentTarget) {
      const btn = event.currentTarget;
      btn.classList.add('copied');
      setTimeout(() => btn.classList.remove('copied'), 1500);
    }

    scrollToAndHighlightComment(commentId);
  }
  window.copyCommentLink = copyCommentLink;

  // Scroll and highlight deep-linked comment
  function scrollToAndHighlightComment(commentId) {
    if (!commentId || !state.activeSolution) return;
    const comments = state.activeSolution.comments || [];
    const targetComment = comments.find(c => c.id === commentId);

    if (targetComment && targetComment.startLine) {
      const sLine = parseInt(targetComment.startLine);
      const eLine = parseInt(targetComment.endLine) || sLine;

      state.collapsedZones.delete(eLine);
      updateMonacoViewZones();

      setTimeout(() => {
        scrollToMonacoLines(sLine, eLine);

        const zoneItem = document.querySelector(`.monaco-thread-item[data-comment-id="${commentId}"]`);
        if (zoneItem) {
          zoneItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          zoneItem.classList.remove('comment-highlight-pulse');
          void zoneItem.offsetWidth;
          zoneItem.classList.add('comment-highlight-pulse');
        }
      }, 150);
    }

    // Ensure Comments subtab is active in sidebar
    activateSidebarSubtab('subtab-comments', false);

    setTimeout(() => {
      const sidebarItem = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
      if (sidebarItem) {
        sidebarItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        sidebarItem.classList.remove('comment-highlight-pulse');
        void sidebarItem.offsetWidth;
        sidebarItem.classList.add('comment-highlight-pulse');
      }
    }, 120);
  }
  window.scrollToAndHighlightComment = scrollToAndHighlightComment;

  // Code viewer line decorations helper
  function updateMonacoDecorations(comments) {
    if (typeof updateInlineCommentThreads === 'function') updateInlineCommentThreads();
  }
  window.updateMonacoDecorations = updateMonacoDecorations;
  window.updateMonacoDraftDecorations = updateMonacoDecorations;

  // Submit Rating Handler
  async function submitRating() {
    if (!state.activeSolution) return alert('No solution selected');
    if (!state.currentToken || state.currentUser?.username === 'Guest') {
      alert('Please log in with a user or admin token to submit ratings.');
      if (openAuthModalBtn) openAuthModalBtn.click();
      return;
    }
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
        lineBadgeHtml = `<button class="line-tag-badge" onclick="scrollToMonacoLines(${c.startLine}, ${c.endLine || c.startLine})" title="Jump to code line in editor">${HRIcons.target(11)} ${lineText}</button>`;
      }

      const isAuthorOrAdmin = state.currentUser && state.currentUser.username !== 'Guest' && (
        (state.currentUser.id && (state.currentUser.id === c.userId || (c.user && state.currentUser.id === c.user.id))) ||
        (state.currentUser.username && (state.currentUser.username === c.user?.username)) ||
        state.currentUser.role === 'ADMIN'
      );
      const deleteBtnHtml = isAuthorOrAdmin ? `<button class="btn-micro" style="color: var(--role-critical); border-color: rgba(239,68,68,0.3); font-size: 0.65rem;" onclick="deleteComment('${c.id}')">Delete</button>` : '';
      const replyBtnHtml = `<button class="btn-micro" style="color: var(--neon-cyan); border-color: rgba(0,243,255,0.3); font-size: 0.65rem;" onclick="replyToComment('${c.id}', '${escapeHtml(c.user?.username || 'User')}', ${c.startLine || 'null'}, ${c.endLine || 'null'})">Reply</button>`;

      item.innerHTML = `
        <div class="comment-header">
          <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
            <span class="comment-user">@${escapeHtml(c.user?.username || 'User')} ${c.user?.role === 'ADMIN' ? '<span class="role-badge admin">ADMIN</span>' : ''}</span>
            <button type="button" class="btn-comment-copy-link" onclick="copyCommentLink('${c.id}', event)" title="Copy link to comment">
              ${HRIcons.link(12)}
            </button>
            ${lineBadgeHtml}
          </div>
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <span>${new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            ${replyBtnHtml}
            ${deleteBtnHtml}
          </div>
        </div>
        <div style="color: #fff; line-height: 1.4; white-space: pre-wrap;">${escapeHtml(c.content)}</div>
      `;
      item.setAttribute('data-comment-id', c.id);
      item.id = `comment-${c.id}`;

      if (c.startLine) {
        item.addEventListener('mouseenter', () => highlightMonacoLines(c.startLine, c.endLine || c.startLine, false));
        item.addEventListener('mouseleave', () => clearMonacoLineHighlight());
      }

      commentsContainer.appendChild(item);
    });
  }

  async function reloadSolutionComments(solutionId) {
    if (!solutionId) return;
    try {
      const res = await fetch(`/api/solutions/${solutionId}`, {
        headers: { 'Authorization': `Bearer ${state.currentToken}` }
      });
      const data = await res.json();
      if (res.ok && data.solution) {
        state.activeSolution.comments = data.solution.comments || [];
        state.activeSolution.reviewRounds = data.solution.reviewRounds || [];
        renderComments(state.activeSolution.comments);
        renderReviewRoundsTimeline(state.activeSolution.reviewRounds);
        updateReviewRoundPublisherUI();
        updateMonacoDecorations(state.activeSolution.comments);
        updateMonacoDraftDecorations();
        updateMonacoViewZones();
      }
    } catch (err) {
      console.error('Failed to reload solution comments:', err);
    }
  }

  function updateReviewRoundPublisherUI() {
    if (!state.activeSolution) return;
    const nextRound = (state.activeSolution.reviewRounds?.length || 0) + 1;
    const status = reviewStatusSelect ? reviewStatusSelect.value : 'APPROVED';

    if (reviewRoundNumberBadge) {
      reviewRoundNumberBadge.textContent = `ROUND ${nextRound}`;
    }

    if (btnPublishReviewRound) {
      btnPublishReviewRound.classList.remove('btn-green', 'btn-amber', 'btn-attention', 'btn-cyan');
      let statusLabel = 'Approved';
      if (status === 'CHANGES_REQUESTED') {
        btnPublishReviewRound.classList.add('btn-amber');
        statusLabel = 'Changes Requested';
      } else if (status === 'DRAFT') {
        btnPublishReviewRound.classList.add('btn-cyan');
        statusLabel = 'Draft';
      } else {
        btnPublishReviewRound.classList.add('btn-green');
        statusLabel = 'Approved';
      }

      if (btnPublishReviewRoundText) {
        btnPublishReviewRoundText.textContent = `Publish Review Round #${nextRound} (${statusLabel})`;
      } else {
        btnPublishReviewRound.innerHTML = `${HRIcons.check(13)} <span>Publish Review Round #${nextRound} (${statusLabel})</span>`;
      }
    }
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
          await reloadSolutionComments(state.activeSolution.id);
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
    if (!state.currentToken || state.currentUser?.username === 'Guest') {
      alert('Please log in with a user or admin token to post comments.');
      if (openAuthModalBtn) openAuthModalBtn.click();
      return;
    }
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
        await reloadSolutionComments(state.activeSolution.id);
        showRetroToast('Comment posted successfully!', HRIcons.check(16));
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

    const isAdmin = state.currentUser && state.currentUser.role === 'ADMIN';

    if (!rounds || rounds.length === 0) {
      const emptyMsg = isAdmin
        ? 'No review rounds recorded yet. Generate or paste an LLM code review above to start Round 1.'
        : 'No official review rounds recorded yet.';
      reviewRoundsTimeline.innerHTML = `<div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 0.5rem 0;">${emptyMsg}</div>`;
      return;
    }

    reviewRoundsTimeline.innerHTML = '';
    rounds.forEach(r => {
      const item = document.createElement('div');
      item.className = `timeline-item ${r.status.toLowerCase()}`;
      
      let parsedReview = null;
      try {
        if (r.geminiDraft) parsedReview = typeof r.geminiDraft === 'string' ? JSON.parse(r.geminiDraft) : r.geminiDraft;
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
        ${parsedReview && (typeof parsedReview === 'string' ? parsedReview : parsedReview.complexity) ? `<div style="font-size: 0.75rem; color: var(--color-brand); background: rgba(0,229,255,0.08); border: 1px solid rgba(0,229,255,0.2); padding: 4px 6px; border-radius: 3px; font-family: monospace;">Structured LLM Review Included</div>` : ''}
      `;
      reviewRoundsTimeline.appendChild(item);
    });
  }

  // Helper to find starting line anchor for any line target
  function findAnchorLineForTarget(lineNum) {
    const num = parseInt(lineNum);
    const comments = state.activeSolution?.comments || [];
    const drafts = (state.currentUser && state.currentUser.role === 'ADMIN') ? (state.activeDraftComments || []) : [];

    const matchedComment = comments.find(c => c.startLine && num >= parseInt(c.startLine) && num <= (parseInt(c.endLine) || parseInt(c.startLine)));
    if (matchedComment) return parseInt(matchedComment.startLine);

    const matchedDraft = drafts.find(d => d.startLine && num >= parseInt(d.startLine) && num <= (parseInt(d.endLine) || parseInt(d.startLine)));
    if (matchedDraft) return parseInt(matchedDraft.startLine);

    return num;
  }

  // Inline Review ViewZone Handlers
  function openInlineCommentBox(startLine, endLine) {
    let sLine = parseInt(startLine) || state.currentSelection?.startLine || 1;
    let eLine = parseInt(endLine) || state.currentSelection?.endLine || sLine;

    const anchorLine = findAnchorLineForTarget(sLine);
    if (anchorLine !== sLine) {
      sLine = anchorLine;
      const matchedComment = (state.activeSolution?.comments || []).find(c => parseInt(c.startLine) === anchorLine);
      if (matchedComment && matchedComment.endLine) {
        eLine = parseInt(matchedComment.endLine);
      }
    }

    state.currentSelection = { startLine: sLine, endLine: eLine };
    state.activeInlineLine = sLine;
    state.collapsedZones.delete(sLine);
    hideSelectionTooltip();

    updateInlineCommentThreads();
    setTimeout(() => {
      const input = document.getElementById(`zone-input-${sLine}`);
      if (input) {
        input.focus();
        input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 80);
  }
  window.openInlineCommentBox = openInlineCommentBox;

  function closeInlineCommentBox() {
    state.activeInlineLine = null;
    hideSelectionTooltip();
    updateInlineCommentThreads();
  }
  window.closeInlineCommentBox = closeInlineCommentBox;

  window.closeLineViewZone = function(lineNum) {
    const num = parseInt(lineNum);
    state.collapsedZones.add(num);
    if (state.activeInlineLine === num) {
      state.activeInlineLine = null;
    }
    hideSelectionTooltip();
    updateInlineCommentThreads();
  };

  window.postViewZoneComment = async function(lineNum) {
    if (!state.currentToken || state.currentUser?.username === 'Guest') {
      alert('Please log in with a user or admin token to post inline review comments.');
      if (openAuthModalBtn) openAuthModalBtn.click();
      return;
    }

    const textarea = document.getElementById(`zone-input-${lineNum}`);
    const content = textarea ? textarea.value.trim() : '';
    if (!content) return alert('Comment content cannot be empty');

    const num = parseInt(lineNum);
    let sLine = num;
    let eLine = num;

    if (state.currentSelection && parseInt(state.currentSelection.startLine) === num && state.currentSelection.endLine) {
      sLine = num;
      eLine = parseInt(state.currentSelection.endLine);
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
        state.activeInlineLine = sLine;
        state.collapsedZones.delete(sLine);
        await reloadSolutionComments(state.activeSolution.id);
        showRetroToast('Inline review comment posted!', HRIcons.check(16));
      } else {
        alert('Failed to post inline comment: ' + data.error);
      }
    } catch (err) {
      alert('Error posting inline comment: ' + err.message);
    }
  };

  // Prism Code Viewer Inline Comment Threads Manager
  function updateInlineCommentThreads() {
    const container = document.getElementById('code-viewer');
    if (!container) return;

    // Clear previous inline thread zones
    container.querySelectorAll('.inline-thread-zone, .monaco-inline-thread-zone').forEach(el => el.remove());

    const comments = state.activeSolution?.comments || [];
    const drafts = (state.currentUser && state.currentUser.role === 'ADMIN') ? (state.activeDraftComments || []) : [];

    const lineMap = new Map();

    comments.forEach(c => {
      if (c.startLine) {
        const lineNum = parseInt(c.startLine) || parseInt(c.endLine);
        if (!lineMap.has(lineNum)) lineMap.set(lineNum, { comments: [], drafts: [] });
        lineMap.get(lineNum).comments.push(c);
      }
    });

    drafts.forEach(d => {
      const lineNum = parseInt(d.startLine) || parseInt(d.endLine) || 1;
      if (!lineMap.has(lineNum)) lineMap.set(lineNum, { comments: [], drafts: [] });
      lineMap.get(lineNum).drafts.push(d);
    });

    if (state.activeInlineLine) {
      const activeLineNum = parseInt(state.activeInlineLine);
      if (!lineMap.has(activeLineNum)) lineMap.set(activeLineNum, { comments: [], drafts: [] });
    }

    const lineNumbers = Array.from(lineMap.keys())
      .filter(lNum => {
        if (state.collapsedZones.has(lNum) && state.activeInlineLine !== lNum) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a - b);

    lineNumbers.forEach(lineNum => {
      const targetLineEl = document.getElementById(`code-line-${lineNum}`);
      if (!targetLineEl) return;

      const data = lineMap.get(lineNum);
      const hasDraft = data.drafts.length > 0;
      const isInputActive = (state.activeInlineLine === lineNum);

      let isSelectedRange = false;
      let sLine = lineNum;
      if (state.currentSelection && parseInt(state.currentSelection.endLine) === lineNum && parseInt(state.currentSelection.startLine) < lineNum) {
        sLine = parseInt(state.currentSelection.startLine);
        isSelectedRange = true;
      }

      const titleText = isSelectedRange 
        ? `Lines ${sLine}-${lineNum} Code Review Thread`
        : `Line ${lineNum} Code Review Thread`;
      const placeholderText = isSelectedRange
        ? `Write inline review comment on lines ${sLine}-${lineNum}...`
        : `Write inline review comment on line ${lineNum}...`;

      const zoneNode = document.createElement('div');
      zoneNode.className = `inline-thread-zone monaco-inline-thread-zone ${hasDraft ? 'has-draft' : ''}`;
      zoneNode.setAttribute('data-line', lineNum);

      let publishedCommentsHtml = '';
      data.comments.forEach(c => {
        const isAuthorOrAdmin = state.currentUser && state.currentUser.username !== 'Guest' && (
          (state.currentUser.id && (state.currentUser.id === c.userId || (c.user && state.currentUser.id === c.user.id))) ||
          (state.currentUser.username && (state.currentUser.username === c.user?.username)) ||
          state.currentUser.role === 'ADMIN'
        );
        const deleteBtnHtml = isAuthorOrAdmin 
          ? `<button type="button" class="btn-micro" style="color: var(--role-critical); border-color: rgba(239,68,68,0.3); font-size: 0.65rem;" onclick="deleteComment('${c.id}')">Delete</button>` 
          : '';
        const replyItemBtnHtml = `<button type="button" class="btn-micro btn-item-reply" data-line="${lineNum}" data-user="${escapeHtml(c.user?.username || 'User')}" style="color: var(--neon-cyan); border-color: rgba(0,243,255,0.3); font-size: 0.65rem;">Reply</button>`;

        publishedCommentsHtml += `
          <div class="monaco-thread-item" data-comment-id="${c.id}" id="monaco-comment-${c.id}">
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 0.2rem; color: var(--text-muted);">
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <span class="comment-user">@${escapeHtml(c.user?.username || 'User')} ${c.user?.role === 'ADMIN' ? '<span class="role-badge admin">ADMIN</span>' : ''}</span>
                <button type="button" class="btn-comment-copy-link" onclick="copyCommentLink('${c.id}', event)" title="Copy link to comment">
                  ${HRIcons.link(12)}
                </button>
              </div>
              <div style="display: flex; gap: 0.4rem; align-items: center;">
                <span>${new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                ${replyItemBtnHtml}
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
                <span class="draft-badge">${HRIcons.aiSpark(11)} AI DRAFT</span>
                <span style="font-size: 0.72rem; color: var(--color-brand); font-weight: 600;">${escapeHtml(d.type)}</span>
              </div>
            </div>
            <div class="draft-comment-content">${escapeHtml(d.content)}</div>
            <div class="draft-comment-actions">
              <button type="button" class="btn-reject" onclick="rejectDraftComment('${d.id}')">${HRIcons.close(11)} Reject</button>
              <button type="button" class="btn-approve" onclick="approveDraftComment('${d.id}')">${HRIcons.check(11)} Approve</button>
            </div>
          </div>
        `;
      });

      let actionAreaHtml = '';
      if (isInputActive) {
        actionAreaHtml = `
          <div class="monaco-thread-input-row">
            <textarea id="zone-input-${lineNum}" class="form-control" rows="2" placeholder="${placeholderText}"></textarea>
            <div style="display: flex; justify-content: flex-end; gap: 0.4rem; margin-top: 0.3rem;">
              <button type="button" class="btn-micro btn-zone-cancel" data-line="${lineNum}">Cancel</button>
              <button type="button" class="btn-retro btn-green btn-zone-post" style="font-size: 0.75rem; padding: 3px 8px;" data-line="${lineNum}">Post Comment</button>
            </div>
          </div>
        `;
      } else {
        actionAreaHtml = `
          <div class="monaco-thread-reply-bar">
            <button type="button" class="btn-micro btn-zone-reply" data-line="${lineNum}" style="display: flex; align-items: center; gap: 4px; color: var(--neon-cyan); border-color: rgba(0,243,255,0.3);">
              ${HRIcons.comment(11)} Reply...
            </button>
          </div>
        `;
      }

      zoneNode.innerHTML = `
        <div class="monaco-thread-header">
          <div style="display: flex; align-items: center; gap: 6px;">
            ${HRIcons.comment(12)}
            <span>${titleText}</span>
          </div>
          <button type="button" class="btn-micro btn-zone-close" data-line="${lineNum}" style="font-size: 0.65rem;">Close</button>
        </div>
        ${publishedCommentsHtml ? `<div class="monaco-thread-comments">${publishedCommentsHtml}</div>` : ''}
        ${draftCommentsHtml ? `<div style="margin-bottom: 0.5rem;">${draftCommentsHtml}</div>` : ''}
        ${actionAreaHtml}
      `;

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

      const closeBtn = zoneNode.querySelector('.btn-zone-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          closeLineViewZone(lineNum);
        });
      }

      const replyBtn = zoneNode.querySelector('.btn-zone-reply');
      if (replyBtn) {
        replyBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          state.activeInlineLine = lineNum;
          state.collapsedZones.delete(lineNum);
          updateInlineCommentThreads();
          setTimeout(() => {
            const input = document.getElementById(`zone-input-${lineNum}`);
            if (input) {
              input.focus();
              input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }, 60);
        });
      }

      zoneNode.querySelectorAll('.btn-item-reply').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const targetUser = btn.dataset.user;
          state.activeInlineLine = lineNum;
          state.collapsedZones.delete(lineNum);
          updateInlineCommentThreads();
          setTimeout(() => {
            const input = document.getElementById(`zone-input-${lineNum}`);
            if (input) {
              if (targetUser && !input.value.includes(`@${targetUser}`)) {
                input.value = `@${targetUser} ` + input.value;
              }
              input.focus();
              input.setSelectionRange(input.value.length, input.value.length);
            }
          }, 60);
        });
      });

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
            updateInlineCommentThreads();
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

      const textarea = zoneNode.querySelector('textarea');
      if (textarea) {
        textarea.addEventListener('keydown', (e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            postViewZoneComment(lineNum);
          }
        });
      }

      targetLineEl.after(zoneNode);
    });
  }

  window.updateInlineCommentThreads = updateInlineCommentThreads;
  window.updateMonacoViewZones = updateInlineCommentThreads;
  window.syncMonacoViewZoneVisibility = function() {};

  // AI Draft Comments Renderer & Approve/Reject Handlers
  function renderAiDraftComments() {
    if (!aiDraftCommentsWrapper || !aiDraftCommentsList) return;

    if (!state.currentUser || state.currentUser.role !== 'ADMIN') {
      aiDraftCommentsWrapper.style.display = 'none';
      return;
    }

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
            <span class="draft-badge">${HRIcons.aiSpark(14)} AI DRAFT</span>
            <button class="line-tag-badge" onclick="scrollToMonacoLines(${d.startLine}, ${d.endLine})">${HRIcons.target(14)} ${lineText}</button>
          </div>
          <span style="font-size: 0.7rem; color: var(--color-brand);">${escapeHtml(d.type)}</span>
        </div>
        <div class="draft-comment-content">${escapeHtml(d.content)}</div>
        <div class="draft-comment-actions">
          <button type="button" class="btn-reject" onclick="rejectDraftComment('${d.id}')">${HRIcons.close(14)} Reject</button>
          <button type="button" class="btn-approve" onclick="approveDraftComment('${d.id}')">${HRIcons.check(14)} Approve</button>
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

    if (!state.currentUser || state.currentUser.role !== 'ADMIN') {
      if (state.editorDraftDecorations && state.editorDraftDecorations.length > 0) {
        state.editorDraftDecorations = state.editor.deltaDecorations(state.editorDraftDecorations, []);
      }
      return;
    }

    const newDraftDecorations = [];
    (state.activeDraftComments || []).forEach(d => {
      const sLine = parseInt(d.startLine);
      const eLine = parseInt(d.endLine) || sLine;
      newDraftDecorations.push({
        range: new monaco.Range(sLine, 1, eLine, 1000),
        options: {
          isWholeLine: true,
          glyphMarginClassName: 'monaco-draft-glyph-margin',
          hoverMessage: { value: `**AI Draft (${d.type})**: ${d.content}` }
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
        await reloadSolutionComments(state.activeSolution.id);
        renderAiDraftComments();
        showRetroToast('Line comment approved & published to solution thread!', HRIcons.check(16));
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
    if (!state.activeDraftComments || state.activeDraftComments.length === 0 || !state.activeSolution) return;
    const draftsToApprove = [...state.activeDraftComments];

    for (const draft of draftsToApprove) {
      try {
        await fetch(`/api/solutions/${state.activeSolution.id}/comments`, {
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
      } catch (e) {
        console.error('Failed to post draft comment:', e);
      }
    }
    state.activeDraftComments = [];
    await reloadSolutionComments(state.activeSolution.id);
    renderAiDraftComments();
    showRetroToast('All draft comments approved & published!', HRIcons.check(16));
  }

  function rejectAllDraftComments() {
    state.activeDraftComments = [];
    renderAiDraftComments();
    updateMonacoDraftDecorations();
    updateMonacoViewZones();
    showRetroToast('All draft comments dismissed.', HRIcons.close(16));
  }

  async function fetchReviewPromptText() {
    if (!state.activeSolution) return null;
    try {
      const res = await fetch(`/api/solutions/${state.activeSolution.id}/review/prompt`, {
        headers: { 'Authorization': `Bearer ${state.currentToken}` }
      });
      const data = await res.json();
      if (res.ok && data.prompt) {
        return data.prompt;
      }
    } catch (e) {
      console.warn('Failed to fetch prompt from server:', e);
    }
    // Fallback client prompt generator
    return buildClientReviewPrompt();
  }

  function buildClientReviewPrompt() {
    if (!state.activeSolution) return '';
    const sol = state.activeSolution;
    const nextRound = (sol.reviewRounds?.length || 0) + 1;
    return `You are a senior software engineer conducting Code Review Round #${nextRound} for a HackerRank submission.
Be very concise, sacrifice grammar for brevity.

Problem: ${sol.challengeTitle} (${sol.challengeSlug})
Language: ${sol.language}
Author: @${sol.user?.username || 'user'}

Code:
\`\`\`${sol.language}
${sol.code}
\`\`\`

Please review the code and respond strictly with JSON:
\`\`\`json
{
  "status": "APPROVED",
  "complexity": "Time: O(...), Space: O(...)",
  "clevernessScore": 4,
  "readabilityScore": 5,
  "summary": "Concise evaluation summary",
  "strengths": ["Key strength 1"],
  "edgeCases": "Boundary analysis",
  "suggestions": ["Improvement suggestion 1"],
  "adminNotes": "Decision notes for Round #${nextRound}",
  "lineComments": [
    {
      "startLine": 1,
      "endLine": 1,
      "type": "SUGGESTION",
      "content": "Specific inline comment"
    }
  ]
}
\`\`\``;
  }

  async function copyReviewPrompt() {
    if (!state.activeSolution) return alert('Please select a solution first');
    const origHtml = btnCopyReviewPrompt ? btnCopyReviewPrompt.innerHTML : '';
    if (btnCopyReviewPrompt) {
      btnCopyReviewPrompt.innerHTML = `${HRIcons.check(14)} <span>Generating...</span>`;
    }

    const promptText = await fetchReviewPromptText();
    if (!promptText) {
      if (btnCopyReviewPrompt) btnCopyReviewPrompt.innerHTML = origHtml;
      return alert('Failed to generate review prompt.');
    }

    try {
      await navigator.clipboard.writeText(promptText);
      if (btnCopyReviewPrompt) {
        btnCopyReviewPrompt.innerHTML = `${HRIcons.check(14)} <span>Copied to Clipboard!</span>`;
        btnCopyReviewPrompt.classList.remove('btn-cyan');
        btnCopyReviewPrompt.classList.add('btn-green');
      }

      showRetroToast('Review prompt copied! Paste into any LLM (ChatGPT, Claude, Gemini, DeepSeek).', HRIcons.copy(16));

      if (promptPreviewDrawer) {
        promptPreviewDrawer.textContent = promptText;
      }

      setTimeout(() => {
        if (btnCopyReviewPrompt) {
          btnCopyReviewPrompt.innerHTML = origHtml;
          btnCopyReviewPrompt.classList.remove('btn-green');
          btnCopyReviewPrompt.classList.add('btn-cyan');
        }
      }, 3000);
    } catch (err) {
      if (btnCopyReviewPrompt) btnCopyReviewPrompt.innerHTML = origHtml;
      if (promptPreviewDrawer) {
        promptPreviewDrawer.style.display = 'block';
        promptPreviewDrawer.textContent = promptText;
      }
      alert('Prompt generated! Please select and copy the text from the preview box below.');
    }
  }

  async function togglePromptPreview() {
    if (!promptPreviewDrawer) return;
    const isHidden = promptPreviewDrawer.style.display === 'none';
    if (isHidden) {
      if (!promptPreviewDrawer.textContent) {
        const text = await fetchReviewPromptText();
        promptPreviewDrawer.textContent = text || 'No prompt available.';
      }
      promptPreviewDrawer.style.display = 'block';
    } else {
      promptPreviewDrawer.style.display = 'none';
    }
  }

  function processLlmReviewResponse() {
    if (!llmReviewInput) return;
    const raw = llmReviewInput.value.trim();
    if (!raw) return alert('Please paste the LLM response text in the box before applying.');

    let parsedObj = null;

    // Try extracting from markdown code block ```json ... ``` or ``` ... ```
    const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      try {
        parsedObj = JSON.parse(codeBlockMatch[1].trim());
      } catch (e) {}
    }

    // If not matched, try parsing entire text as JSON
    if (!parsedObj) {
      try {
        parsedObj = JSON.parse(raw);
      } catch (e) {}
    }

    // If still not parsed, try finding first '{' and last '}'
    if (!parsedObj) {
      const firstBrace = raw.indexOf('{');
      const lastBrace = raw.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
          parsedObj = JSON.parse(raw.substring(firstBrace, lastBrace + 1));
        } catch (e) {}
      }
    }

    if (!parsedObj || typeof parsedObj !== 'object') {
      return alert('Could not parse valid JSON from the pasted LLM response. Please ensure the response includes the JSON schema block.');
    }

    // Extract fields
    const status = (parsedObj.status || '').toUpperCase();
    if (reviewStatusSelect) {
      if (status === 'APPROVED' || status === 'CHANGES_REQUESTED' || status === 'DRAFT') {
        reviewStatusSelect.value = status;
      } else {
        reviewStatusSelect.value = 'APPROVED';
      }
    }

    // Build formatted summary and notes
    let notesText = '';
    if (parsedObj.summary) {
      notesText += `[Summary]\n${parsedObj.summary}\n\n`;
    }
    if (parsedObj.complexity) {
      notesText += `[Complexity]\n${parsedObj.complexity}\n\n`;
    }
    if (Array.isArray(parsedObj.strengths) && parsedObj.strengths.length > 0) {
      notesText += `[Strengths]\n${parsedObj.strengths.map(s => `- ${s}`).join('\n')}\n\n`;
    }
    if (parsedObj.edgeCases) {
      notesText += `[Edge Cases & Boundary Analysis]\n${parsedObj.edgeCases}\n\n`;
    }
    if (Array.isArray(parsedObj.suggestions) && parsedObj.suggestions.length > 0) {
      notesText += `[Recommendations]\n${parsedObj.suggestions.map(s => `- ${s}`).join('\n')}\n\n`;
    }
    if (parsedObj.adminNotes) {
      notesText += `[Review Decision Notes]\n${parsedObj.adminNotes}\n`;
    }

    if (adminReviewNotes) {
      adminReviewNotes.value = notesText.trim() || raw;
    }

    state.lastImportedReview = parsedObj;

    // Render Parsed Review Card
    if (parsedReviewCard) {
      parsedReviewCard.style.display = 'block';

      if (parsedMetricsContainer) {
        let metricsHtml = '';
        if (parsedObj.complexity) {
          metricsHtml += `<span class="review-metric-pill cyan">${escapeHtml(parsedObj.complexity)}</span>`;
        }
        if (parsedObj.clevernessScore) {
          metricsHtml += `<span class="review-metric-pill warning">Clever: ${parsedObj.clevernessScore}/5</span>`;
        }
        if (parsedObj.readabilityScore) {
          metricsHtml += `<span class="review-metric-pill success">Readable: ${parsedObj.readabilityScore}/5</span>`;
        }
        if (parsedObj.status) {
          const isAppr = parsedObj.status === 'APPROVED';
          metricsHtml += `<span class="review-metric-pill ${isAppr ? 'success' : 'warning'}">${escapeHtml(parsedObj.status)}</span>`;
        }
        parsedMetricsContainer.innerHTML = metricsHtml;
      }

      if (parsedReviewSummary) {
        parsedReviewSummary.textContent = parsedObj.summary || 'Structured review imported successfully.';
      }

      if (parsedReviewDetails) {
        let detailsHtml = '';
        if (Array.isArray(parsedObj.strengths) && parsedObj.strengths.length > 0) {
          detailsHtml += `<div style="margin-bottom: 4px;"><strong style="color: var(--role-success);">Strengths:</strong> ${parsedObj.strengths.map(s => escapeHtml(s)).join('; ')}</div>`;
        }
        if (parsedObj.edgeCases) {
          detailsHtml += `<div style="margin-bottom: 4px;"><strong style="color: var(--role-attention);">Edge Cases:</strong> ${escapeHtml(parsedObj.edgeCases)}</div>`;
        }
        if (Array.isArray(parsedObj.suggestions) && parsedObj.suggestions.length > 0) {
          detailsHtml += `<div><strong style="color: var(--color-brand);">Suggestions:</strong> ${parsedObj.suggestions.map(s => escapeHtml(s)).join('; ')}</div>`;
        }
        parsedReviewDetails.innerHTML = detailsHtml;
      }
    }

    // Process Line Comments
    let draftComments = [];
    if (Array.isArray(parsedObj.lineComments)) {
      draftComments = parsedObj.lineComments;
    }

    state.activeDraftComments = draftComments.map((c, idx) => ({
      id: `draft_${Date.now()}_${idx}`,
      startLine: parseInt(c.startLine) || 1,
      endLine: parseInt(c.endLine) || parseInt(c.startLine) || 1,
      type: c.type || 'SUGGESTION',
      content: c.content || 'LLM review suggestion'
    }));

    updateReviewRoundPublisherUI();
    renderAiDraftComments();
    updateMonacoDraftDecorations();
    updateMonacoViewZones();

    showRetroToast(`LLM Review parsed! ${state.activeDraftComments.length} line comments and decision notes loaded.`, HRIcons.check(16));
  }

  async function publishReviewRound() {
    if (!state.activeSolution) return alert('Please select a solution to review');
    if (!state.currentUser || state.currentUser.role !== 'ADMIN') {
      return alert('Only administrators can publish code reviews.');
    }
    
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
          reviewDraft: state.lastImportedReview || adminNotes
        })
      });

      const data = await res.json();
      if (res.ok) {
        showRetroToast(`Published Review Round #${nextRoundNumber} (${status})!`, HRIcons.check(16));
        adminReviewNotes.value = '';
        if (llmReviewInput) llmReviewInput.value = '';
        if (parsedReviewCard) parsedReviewCard.style.display = 'none';
        state.lastImportedReview = null;
        await reloadSolutionComments(state.activeSolution.id);
      } else {
        alert('Failed to publish review: ' + data.error);
      }
    } catch (err) {
      alert('Error publishing review: ' + err.message);
    }
  }

  function updateTokenWordCountBadge() {
    if (!tokenCustomInput) return;
    const val = tokenCustomInput.value.trim();
    if (createTokenDisplayVal) {
      createTokenDisplayVal.textContent = val || '(empty)';
    }
    const parts = val.split(/[-_\s]+/).filter(Boolean);
    const count = parts.length;
    const label = `${count} word${count === 1 ? '' : 's'}`;
    const color = (count >= 3 && count <= 4) ? 'var(--role-success)' : 'var(--role-attention)';
    if (createTokenWordCountBadge) {
      createTokenWordCountBadge.textContent = label;
      createTokenWordCountBadge.style.color = color;
    }
  }

  async function shuffleFormToken() {
    if (!tokenCustomInput) return;
    try {
      const res = await fetch('/api/admin/tokens/generate', {
        headers: { 'Authorization': `Bearer ${state.currentToken}` }
      });
      const data = await res.json();
      if (data && data.token) {
        tokenCustomInput.value = data.token;
        updateTokenWordCountBadge();
      }
    } catch (err) {
      console.error('Error fetching token suggestion:', err);
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

    if (tokenCustomInput && !tokenCustomInput.value.trim()) {
      await shuffleFormToken();
    }

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
      item.style.cssText = 'background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); padding: 0.75rem 0.85rem; border-radius: var(--radius-sm); font-size: 0.8rem; display: flex; flex-direction: column; gap: 0.5rem;';
      
      const isMasterAdmin = u.token === 'hr_admin_master_token_2026' || (state.currentUser && state.currentUser.id === u.id);
      const deleteBtn = isMasterAdmin ? '' : `<button class="btn-micro" style="color: var(--role-critical); border-color: rgba(239,68,68,0.3); font-size: 0.7rem; padding: 3px 6px; display: inline-flex; align-items: center; gap: 4px;" onclick="deleteAdminUser('${u.id}', '${escapeHtml(u.username)}')">${HRIcons.trash(14)} <span>Delete</span></button>`;

      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          <div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <strong>@${escapeHtml(u.username)}</strong>
              <span class="role-badge ${u.role.toLowerCase()}">${u.role}</span>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <span>Token:</span>
              <code id="user-token-display-${u.id}" class="token-badge-code">${escapeHtml(u.token)}</code>
            </div>
            ${u.discordUsername ? `<div style="font-size: 0.7rem; color: #5865F2; font-weight: 600; margin-top: 3px; display: flex; align-items: center; gap: 4px;">${HRIcons.discord(14)} Discord: @${escapeHtml(u.discordUsername)}</div>` : ''}
          </div>
          <div style="display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap;">
            <button class="btn-retro btn-cyan" style="font-size: 0.7rem; padding: 3px 7px; display: inline-flex; align-items: center; gap: 4px;" onclick="copyToken('${escapeHtml(u.token)}')">
              ${HRIcons.copy(14)} <span>Copy</span>
            </button>
            <button class="btn-retro btn-pink" style="font-size: 0.7rem; padding: 3px 7px; display: inline-flex; align-items: center; gap: 4px;" title="Edit or Shuffle Token" onclick="toggleEditUserToken('${u.id}')">
              ${HRIcons.edit(14)} <span>Edit Token</span>
            </button>
            ${deleteBtn}
          </div>
        </div>

        <div id="user-token-edit-box-${u.id}" class="user-token-inline-edit" style="display: none;">
          <div style="font-size: 0.7rem; color: var(--color-brand); display: flex; justify-content: space-between; align-items: center;">
            <span>Edit Token for @${escapeHtml(u.username)}</span>
            <span id="user-token-inline-count-${u.id}" style="color: var(--text-muted); font-family: var(--font-mono);"></span>
          </div>
          <div class="token-input-group">
            <input type="text" id="user-token-input-${u.id}" class="form-control font-mono" value="${escapeHtml(u.token)}" oninput="updateInlineTokenWordCount('${u.id}')" autocomplete="off" spellcheck="false" />
            <button type="button" class="btn-shuffle" onclick="shuffleInlineUserToken('${u.id}')" title="Shuffle 3-4 word combination">
              ${HRIcons.shuffle(18)} <span>Shuffle</span>
            </button>
          </div>
          <div class="user-token-edit-actions">
            <button class="btn-retro btn-green" style="font-size: 0.7rem; padding: 3px 8px; display: inline-flex; align-items: center; gap: 4px;" onclick="saveUserToken('${u.id}', '${escapeHtml(u.username)}')">
              ${HRIcons.check(14)} <span>Save Token</span>
            </button>
            <button class="btn-retro" style="font-size: 0.7rem; padding: 3px 8px;" onclick="toggleEditUserToken('${u.id}')">Cancel</button>
          </div>
        </div>
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

  window.toggleEditUserToken = function(userId) {
    const box = document.getElementById(`user-token-edit-box-${userId}`);
    if (!box) return;
    const isHidden = box.style.display === 'none';
    box.style.display = isHidden ? 'flex' : 'none';
    if (isHidden) {
      const input = document.getElementById(`user-token-input-${userId}`);
      if (input) {
        input.focus();
        window.updateInlineTokenWordCount(userId);
      }
    }
  };

  window.updateInlineTokenWordCount = function(userId) {
    const input = document.getElementById(`user-token-input-${userId}`);
    const badge = document.getElementById(`user-token-inline-count-${userId}`);
    if (!input || !badge) return;
    const parts = input.value.trim().split(/[-_\s]+/).filter(Boolean);
    const count = parts.length;
    badge.textContent = `${count} word${count === 1 ? '' : 's'}`;
    badge.style.color = (count >= 3 && count <= 4) ? 'var(--role-success)' : 'var(--role-attention)';
  };

  window.shuffleInlineUserToken = async function(userId) {
    const input = document.getElementById(`user-token-input-${userId}`);
    if (!input) return;
    try {
      const res = await fetch('/api/admin/tokens/generate', {
        headers: { 'Authorization': `Bearer ${state.currentToken}` }
      });
      const data = await res.json();
      if (data && data.token) {
        input.value = data.token;
        window.updateInlineTokenWordCount(userId);
      }
    } catch (err) {
      console.error('Error fetching token suggestion:', err);
    }
  };

  window.saveUserToken = async function(userId, username) {
    const input = document.getElementById(`user-token-input-${userId}`);
    if (!input) return;
    const token = input.value.trim();
    if (!token) return alert('Token cannot be empty');

    try {
      const res = await fetch(`/api/admin/users/${userId}/token`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.currentToken}`
        },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Token for @${username} saved successfully:\n${data.user.token}`);
        await loadAdminUsers();
      } else {
        alert('Failed to save token: ' + data.error);
      }
    } catch (err) {
      alert('Error saving token: ' + err.message);
    }
  };

  window.deleteAdminUser = async function(userId, username) {
    if (!confirm(`Are you sure you want to delete user @${username}? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${state.currentToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert(`User @${username} deleted successfully.`);
        await loadAdminUsers();
      } else {
        alert('Failed to delete user: ' + data.error);
      }
    } catch (err) {
      alert('Error deleting user: ' + err.message);
    }
  };

  async function createToken(e) {
    e.preventDefault();
    const username = tokenUsernameInput.value.trim();
    const discordUsername = tokenDiscordInput ? tokenDiscordInput.value.trim() : null;
    const role = tokenRoleSelect.value;
    const token = tokenCustomInput ? tokenCustomInput.value.trim() : '';

    if (!username) return alert('Please enter a username');

    try {
      const res = await fetch('/api/admin/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.currentToken}`
        },
        body: JSON.stringify({ username, role, discordUsername, token })
      });

      const data = await res.json();
      if (res.ok) {
        alert(`Token created for @${data.user.username}!\nToken: ${data.user.token}`);
        tokenUsernameInput.value = '';
        if (tokenDiscordInput) tokenDiscordInput.value = '';
        if (tokenCustomInput) {
          await shuffleFormToken();
        }
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
            <strong style="color: var(--neon-pink); display: flex; align-items: center; gap: 4px;">${HRIcons.discord(13)} ${escapeHtml(item.discordUsername)}</strong>
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

  // Global Keyboard Shortcuts (Escape to dismiss active inline input or modal)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (state.activeInlineLine) {
        const activeLine = parseInt(state.activeInlineLine);
        state.activeInlineLine = null;
        const comments = (state.activeSolution?.comments || []).filter(c => (parseInt(c.endLine) || parseInt(c.startLine)) === activeLine);
        const drafts = (state.activeDraftComments || []).filter(d => (parseInt(d.endLine) || parseInt(d.startLine)) === activeLine);
        if (comments.length === 0 && drafts.length === 0) {
          state.collapsedZones.add(activeLine);
        }
        updateMonacoViewZones();
      }
      hideSelectionTooltip();
      if (authModal && authModal.style.display !== 'none') {
        authModal.style.display = 'none';
      }
    }
  });

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
