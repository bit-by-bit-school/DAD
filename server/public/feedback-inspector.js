/**
 * Retro Feedback & UI Inspector Widget
 * Allows clicking any element on the screen to capture DOM context and send feedback directly to the AI Agent.
 */
(function() {
  let isInspectorActive = false;
  let hoveredElement = null;
  let selectedElement = null;
  let isAdminUser = false;

  // Create UI overlay and modal elements
  const overlay = document.createElement('div');
  overlay.id = 'feedback-inspector-highlight';
  overlay.style.cssText = `
    position: fixed;
    pointer-events: none;
    border: 2px solid #00f3ff;
    background: rgba(0, 243, 255, 0.15);
    box-shadow: 0 0 15px rgba(0, 243, 255, 0.4), inset 0 0 10px rgba(0, 243, 255, 0.2);
    border-radius: 0px !important;
    z-index: 999998;
    display: none;
    transition: all 0.08s ease-out;
  `;

  const tagBadge = document.createElement('div');
  tagBadge.id = 'feedback-inspector-badge';
  tagBadge.style.cssText = `
    position: absolute;
    top: -24px;
    left: 0;
    background: #00f3ff;
    color: #0d1117;
    font-family: var(--font-pixel, monospace);
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 0px !important;
    white-space: nowrap;
    box-shadow: 2px 2px 0px #000;
  `;
  overlay.appendChild(tagBadge);
  document.body.appendChild(overlay);

  // Top banner when active (Draggable)
  const topBanner = document.createElement('div');
  topBanner.id = 'feedback-inspector-banner';
  topBanner.style.cssText = `
    position: fixed;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(13, 17, 23, 0.96);
    border: 2px solid #00f3ff;
    box-shadow: 4px 4px 0px #000, 0 0 20px rgba(0, 243, 255, 0.35);
    color: #00f3ff;
    padding: 6px 14px;
    border-radius: 0px !important;
    font-family: var(--font-pixel, monospace);
    font-size: 11px;
    font-weight: 700;
    z-index: 999999;
    display: none;
    align-items: center;
    gap: 10px;
    cursor: move;
    user-select: none;
    touch-action: none;
    pointer-events: auto;
  `;
  topBanner.innerHTML = `
    <span style="display: flex; align-items: center; gap: 6px; cursor: move;" title="Click & Drag to reposition banner">
      <span style="color: #8b949e; font-size: 12px;">⋮⋮</span>
      <span style="display: flex; align-items: center; gap: 6px;">${typeof HRIcons !== 'undefined' ? HRIcons.target(14) : ''} <span>INSPECTOR ACTIVE</span></span>
    </span>
    <button id="feedback-view-all-btn" style="background: rgba(0, 243, 255, 0.2); border: 1px solid #00f3ff; color: #00f3ff; border-radius: 0px; box-shadow: 2px 2px 0px #000; padding: 3px 8px; font-family: var(--font-pixel, monospace); font-size: 10px; cursor: pointer; pointer-events: auto; display: flex; align-items: center; gap: 4px;">${typeof HRIcons !== 'undefined' ? HRIcons.list(12) : ''} <span>LIST</span></button>
    <button id="feedback-exit-btn" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); color: #fff; border-radius: 0px; box-shadow: 2px 2px 0px #000; padding: 3px 8px; font-family: var(--font-pixel, monospace); font-size: 10px; cursor: pointer; pointer-events: auto;">EXIT (ESC)</button>
  `;
  document.body.appendChild(topBanner);

  // Floating trigger button
  const triggerBtn = document.createElement('button');
  triggerBtn.id = 'feedback-toggle-btn';
  triggerBtn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #0d1117;
    color: #00f3ff;
    border: 2px solid #00f3ff;
    box-shadow: 4px 4px 0px #000, 0 0 15px rgba(0, 243, 255, 0.35);
    border-radius: 0px !important;
    padding: 8px 16px;
    font-family: var(--font-pixel, monospace);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    cursor: pointer;
    z-index: 999990;
    display: none;
    align-items: center;
    gap: 8px;
    transition: all 0.15s ease;
  `;
  triggerBtn.innerHTML = `${typeof HRIcons !== 'undefined' ? HRIcons.target(14) : ''} <span>Give Feedback (Alt+F)</span>`;
  triggerBtn.addEventListener('mouseenter', () => {
    triggerBtn.style.boxShadow = '4px 4px 0px #000, 0 0 25px rgba(0, 243, 255, 0.6)';
    triggerBtn.style.transform = 'translate(-1px, -1px)';
  });
  triggerBtn.addEventListener('mouseleave', () => {
    triggerBtn.style.boxShadow = '4px 4px 0px #000, 0 0 15px rgba(0, 243, 255, 0.35)';
    triggerBtn.style.transform = 'none';
  });
  document.body.appendChild(triggerBtn);

  // Expose global admin setter function
  window.setFeedbackInspectorAdminState = function(isAdmin) {
    isAdminUser = !!isAdmin;
    if (isAdminUser) {
      triggerBtn.style.display = 'flex';
    } else {
      triggerBtn.style.display = 'none';
      if (isInspectorActive) toggleInspector(false);
      closeModal();
    }
  };

  // Feedback Submission Modal
  const modal = document.createElement('div');
  modal.id = 'feedback-inspector-modal';
  modal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 480px;
    max-width: 90vw;
    background: #0f141c;
    border: 2px solid #00f3ff;
    box-shadow: 6px 6px 0px #000, 0 0 35px rgba(0, 243, 255, 0.3);
    border-radius: 0px !important;
    padding: 20px;
    z-index: 1000000;
    display: none;
    font-family: var(--font-sans, sans-serif);
    color: #e6edf3;
  `;
  modal.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <h3 style="margin: 0; font-size: 13px; font-family: var(--font-pixel, monospace); color: #00f3ff; display: flex; align-items: center; gap: 8px; letter-spacing: 0.5px; text-transform: uppercase;">
        ${typeof HRIcons !== 'undefined' ? HRIcons.target(16) : ''} <span>Direct Browser Feedback</span>
      </h3>
      <button id="feedback-modal-close" style="background: none; border: none; color: #8b949e; cursor: pointer; display: flex; align-items: center;"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>

    <div style="background: #161b22; border: 1px solid #30363d; border-radius: 0px; box-shadow: inset 2px 2px 0px #000; padding: 8px 12px; margin-bottom: 14px; font-family: var(--font-segment, monospace); font-size: 11px; color: #79c0ff; word-break: break-all;">
      <div style="color: #8b949e; font-family: var(--font-pixel, monospace); font-size: 10px; margin-bottom: 3px;">SELECTED ELEMENT:</div>
      <div id="fb-element-preview" style="font-weight: bold;"></div>
      <div id="fb-element-text" style="color: #c9d1d9; margin-top: 4px; font-style: italic; max-height: 40px; overflow: hidden;"></div>
    </div>

    <div style="margin-bottom: 12px;">
      <label style="display: block; font-size: 10px; font-family: var(--font-pixel, monospace); color: #8b949e; margin-bottom: 6px; letter-spacing: 0.4px;">CATEGORY</label>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;" id="fb-category-group">
        <button type="button" class="fb-cat-btn active" data-val="UI / Style" style="background: rgba(0,243,255,0.15); border: 1px solid #00f3ff; color: #00f3ff; padding: 4px 10px; border-radius: 0px; box-shadow: 2px 2px 0px #000; font-family: var(--font-pixel, monospace); font-size: 10px; cursor: pointer; display: flex; align-items: center; gap: 5px;">${typeof HRIcons !== 'undefined' ? HRIcons.workspace(12) : ''} UI / STYLE</button>
        <button type="button" class="fb-cat-btn" data-val="Bug" style="background: #161b22; border: 1px solid #30363d; color: #c9d1d9; padding: 4px 10px; border-radius: 0px; box-shadow: 2px 2px 0px #000; font-family: var(--font-pixel, monospace); font-size: 10px; cursor: pointer; display: flex; align-items: center; gap: 5px;">${typeof HRIcons !== 'undefined' ? HRIcons.alert(12) : ''} BUG</button>
        <button type="button" class="fb-cat-btn" data-val="Improvement" style="background: #161b22; border: 1px solid #30363d; color: #c9d1d9; padding: 4px 10px; border-radius: 0px; box-shadow: 2px 2px 0px #000; font-family: var(--font-pixel, monospace); font-size: 10px; cursor: pointer; display: flex; align-items: center; gap: 5px;">${typeof HRIcons !== 'undefined' ? HRIcons.aiSpark(12) : ''} IMPROVEMENT</button>
        <button type="button" class="fb-cat-btn" data-val="Note" style="background: #161b22; border: 1px solid #30363d; color: #c9d1d9; padding: 4px 10px; border-radius: 0px; box-shadow: 2px 2px 0px #000; font-family: var(--font-pixel, monospace); font-size: 10px; cursor: pointer; display: flex; align-items: center; gap: 5px;">${typeof HRIcons !== 'undefined' ? HRIcons.comment(12) : ''} NOTE</button>
      </div>
    </div>

    <div style="margin-bottom: 16px;">
      <label style="display: block; font-size: 10px; font-family: var(--font-pixel, monospace); color: #8b949e; margin-bottom: 6px; letter-spacing: 0.4px;">YOUR FEEDBACK / REQUEST</label>
      <textarea id="fb-comment-input" rows="4" placeholder="e.g. Make this button neon purple, change font size to 14px, fix alignment, etc." style="width: 100%; box-sizing: border-box; background: #0d1117; border: 1px solid #30363d; border-radius: 0px; box-shadow: inset 2px 2px 0px #000; color: #fff; padding: 10px; font-family: var(--font-segment, monospace); font-size: 13px; resize: vertical; outline: none;"></textarea>
    </div>

    <div style="display: flex; justify-content: flex-end; gap: 10px;">
      <button id="fb-btn-cancel" style="background: transparent; border: 1px solid #30363d; color: #8b949e; padding: 6px 14px; border-radius: 0px; box-shadow: 2px 2px 0px #000; cursor: pointer; font-family: var(--font-pixel, monospace); font-size: 10px; text-transform: uppercase;">CANCEL</button>
      <button id="fb-btn-submit" style="background: #00f3ff; border: none; color: #0d1117; font-weight: 400; letter-spacing: 0.6px; padding: 6px 16px; border-radius: 0px; box-shadow: 2px 2px 0px #000, 0 0 10px rgba(0,243,255,0.4); cursor: pointer; font-family: var(--font-pixel, monospace); font-size: 10px; text-transform: uppercase; display: flex; align-items: center; gap: 6px;">${typeof HRIcons !== 'undefined' && HRIcons.zap ? HRIcons.zap(13) : ''} <span>SEND TO AI</span></button>
    </div>
  `;
  document.body.appendChild(modal);

  // Toast Notification
  const toast = document.createElement('div');
  toast.id = 'feedback-inspector-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background: #0d1117;
    border: 2px solid #2ea043;
    color: #3fb950;
    box-shadow: 4px 4px 0px #000, 0 0 20px rgba(46, 160, 67, 0.4);
    border-radius: 0px !important;
    padding: 10px 20px;
    font-family: var(--font-pixel, monospace);
    font-size: 11px;
    font-weight: 600;
    z-index: 1000001;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    display: flex;
    align-items: center;
    gap: 8px;
    opacity: 0;
  `;
  document.body.appendChild(toast);

  function showToast(msg) {
    toast.innerHTML = `<span style="display: flex; align-items: center; gap: 6px;">${typeof HRIcons !== 'undefined' ? HRIcons.check(14) : ''} <span>${msg}</span></span>`;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(100px)';
    }, 3500);
  }

  // Generate CSS Selector Path
  function getCssSelector(el) {
    if (!(el instanceof Element)) return '';
    const path = [];
    while (el && el.nodeType === Node.ELEMENT_NODE) {
      let selector = el.nodeName.toLowerCase();
      if (el.id) {
        selector += '#' + el.id;
        path.unshift(selector);
        break;
      } else {
        let sibling = el;
        let nth = 1;
        while (sibling = sibling.previousElementSibling) {
          if (sibling.nodeName.toLowerCase() === selector) nth++;
        }
        if (el.className && typeof el.className === 'string' && el.className.trim()) {
          const classes = el.className.trim().split(/\s+/).slice(0, 2).join('.');
          selector += '.' + classes;
        }
        if (nth !== 1) selector += `:nth-of-type(${nth})`;
      }
      path.unshift(selector);
      el = el.parentElement;
    }
    return path.join(' > ');
  }

  // Toggle category pills
  modal.querySelectorAll('.fb-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.fb-cat-btn').forEach(b => {
        b.style.background = '#161b22';
        b.style.borderColor = '#30363d';
        b.style.color = '#c9d1d9';
        b.classList.remove('active');
      });
      btn.style.background = 'rgba(0,243,255,0.15)';
      btn.style.borderColor = '#00f3ff';
      btn.style.color = '#00f3ff';
      btn.classList.add('active');
    });
  });

  // Draggable Banner Logic
  let isDraggingBanner = false;
  let hasBeenDragged = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  topBanner.addEventListener('mousedown', (e) => {
    if (e.target.closest('#feedback-view-all-btn, #feedback-exit-btn')) return;

    isDraggingBanner = true;
    hasBeenDragged = true;

    const rect = topBanner.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;

    topBanner.style.transform = 'none';
    topBanner.style.left = rect.left + 'px';
    topBanner.style.top = rect.top + 'px';

    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener('mouseup', () => {
    if (isDraggingBanner) {
      setTimeout(() => {
        isDraggingBanner = false;
      }, 50);
    }
  });

  // Toggle Inspector Mode
  function toggleInspector(force) {
    if (!isAdminUser && force !== false) return;
    isInspectorActive = force !== undefined ? force : !isInspectorActive;
    if (isInspectorActive) {
      topBanner.style.display = 'flex';
      topBanner.style.opacity = '1';
      topBanner.style.pointerEvents = 'auto';
      if (!hasBeenDragged) {
        topBanner.style.top = '12px';
        topBanner.style.left = '50%';
        topBanner.style.transform = 'translateX(-50%)';
      }
      triggerBtn.style.background = '#00f3ff';
      triggerBtn.style.color = '#0d1117';
      triggerBtn.innerHTML = `<span style="display: flex; align-items: center; gap: 6px;">${typeof HRIcons !== 'undefined' ? HRIcons.target(14) : ''} <b>Inspecting... (Esc)</b></span>`;
      document.body.style.cursor = 'crosshair';
    } else {
      topBanner.style.display = 'none';
      overlay.style.display = 'none';
      triggerBtn.style.background = '#0d1117';
      triggerBtn.style.color = '#00f3ff';
      triggerBtn.innerHTML = `<span style="display: flex; align-items: center; gap: 6px;">${typeof HRIcons !== 'undefined' ? HRIcons.target(14) : ''} <span>Give Feedback (Alt+F)</span></span>`;
      document.body.style.cursor = '';
      hoveredElement = null;
    }
  }

  // Event Listeners for Inspector
  triggerBtn.addEventListener('click', () => toggleInspector());
  document.getElementById('feedback-exit-btn').addEventListener('click', () => toggleInspector(false));
  document.getElementById('feedback-view-all-btn').addEventListener('click', openHistoryModal);
  document.getElementById('feedback-modal-close').addEventListener('click', closeModal);
  document.getElementById('fb-btn-cancel').addEventListener('click', closeModal);

  window.addEventListener('keydown', (e) => {
    if (!isAdminUser && !isInspectorActive && modal.style.display !== 'block') return;
    if (e.altKey && (e.key === 'f' || e.key === 'F')) {
      if (!isAdminUser) return;
      e.preventDefault();
      toggleInspector();
    } else if (e.key === 'Escape') {
      if (modal.style.display === 'block') {
        closeModal();
      } else if (isInspectorActive) {
        toggleInspector(false);
      }
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (isDraggingBanner) {
      let newLeft = e.clientX - dragOffsetX;
      let newTop = e.clientY - dragOffsetY;

      const maxLeft = window.innerWidth - topBanner.offsetWidth - 5;
      const maxTop = window.innerHeight - topBanner.offsetHeight - 5;

      newLeft = Math.max(5, Math.min(maxLeft, newLeft));
      newTop = Math.max(5, Math.min(maxTop, newTop));

      topBanner.style.left = newLeft + 'px';
      topBanner.style.top = newTop + 'px';
      return;
    }

    if (!isInspectorActive || modal.style.display === 'block') return;

    // Ignore feedback UI elements when inspecting
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target || target.closest('#feedback-inspector-highlight, #feedback-inspector-banner, #feedback-toggle-btn, #feedback-inspector-modal, #feedback-inspector-toast')) {
      overlay.style.display = 'none';
      hoveredElement = null;
      return;
    }

    hoveredElement = target;
    const rect = target.getBoundingClientRect();

    overlay.style.display = 'block';
    overlay.style.top = rect.top + 'px';
    overlay.style.left = rect.left + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';

    const tagStr = target.tagName.toLowerCase();
    const idStr = target.id ? `#${target.id}` : '';
    const classStr = target.className && typeof target.className === 'string' 
      ? '.' + target.className.trim().split(/\s+/).slice(0, 2).join('.') 
      : '';
    tagBadge.textContent = `${tagStr}${idStr}${classStr}`;
  }, true);

  document.addEventListener('click', (e) => {
    if (!isInspectorActive) return;

    if (isDraggingBanner) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Allow interaction with feedback UI elements (banner buttons, modal, toast, trigger button)
    if (e.target.closest('#feedback-inspector-banner, #feedback-inspector-modal, #feedback-inspector-toast')) {
      return;
    }

    // Toggle off if clicking floating trigger button while active
    if (e.target.closest('#feedback-toggle-btn')) {
      toggleInspector(false);
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const target = hoveredElement || document.elementFromPoint(e.clientX, e.clientY);
    if (!target || target.closest('#feedback-inspector-highlight, #feedback-inspector-banner, #feedback-toggle-btn, #feedback-inspector-modal, #feedback-inspector-toast')) {
      return;
    }

    selectedElement = target;
    openModalForElement(selectedElement);
  }, true);

  function openModalForElement(el) {
    const selector = getCssSelector(el);
    const textSnippet = (el.innerText || el.textContent || el.value || '').trim().slice(0, 150);

    document.getElementById('fb-element-preview').textContent = selector;
    document.getElementById('fb-element-text').textContent = textSnippet ? `"${textSnippet}"` : '(No inner text)';
    
    const input = document.getElementById('fb-comment-input');
    input.value = '';
    
    modal.style.display = 'block';
    input.focus();
  }

  function openHistoryModal() {
    let items = [];
    try {
      items = JSON.parse(localStorage.getItem('hr_feedback_items') || '[]');
    } catch (e) {}

    const text = items.map((it, idx) => `### ${idx + 1}. [${it.category}] ${it.comment}\n- **Element**: \`${it.element.tagName}\` (${it.element.cssSelector})\n- **Text**: "${it.element.text}"\n`).join('\n');
    
    if (items.length === 0) {
      alert('No feedback items submitted yet.');
      return;
    }

    navigator.clipboard.writeText(text).then(() => {
      showToast('All feedback copied to clipboard!');
    }).catch(() => {
      prompt('Copy your feedback history below:', text);
    });
  }

  function closeModal() {
    modal.style.display = 'none';
    selectedElement = null;
  }

  // Submit Feedback
  document.getElementById('fb-btn-submit').addEventListener('click', submitFeedback);
  document.getElementById('fb-comment-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      submitFeedback();
    }
  });

  async function submitFeedback() {
    if (!selectedElement) return;

    const comment = document.getElementById('fb-comment-input').value.trim();
    const activeCategoryBtn = modal.querySelector('.fb-cat-btn.active');
    const category = activeCategoryBtn ? activeCategoryBtn.getAttribute('data-val') : 'General';
    const rect = selectedElement.getBoundingClientRect();

    const payload = {
      comment: comment || '(Quick element selection with no comment)',
      category,
      path: window.location.pathname + window.location.hash,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      element: {
        tagName: selectedElement.tagName,
        id: selectedElement.id || null,
        className: typeof selectedElement.className === 'string' ? selectedElement.className : '',
        cssSelector: getCssSelector(selectedElement),
        text: (selectedElement.innerText || selectedElement.textContent || selectedElement.value || '').trim().slice(0, 300),
        htmlSnippet: selectedElement.outerHTML ? selectedElement.outerHTML.slice(0, 300) : '',
        attributes: Array.from(selectedElement.attributes || []).reduce((acc, attr) => {
          acc[attr.name] = attr.value;
          return acc;
        }, {}),
        rect: {
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }
      }
    };

    console.log('[Feedback Inspector] Sending feedback:', payload);

    // Save to localStorage as persistent client backup
    try {
      const stored = JSON.parse(localStorage.getItem('hr_feedback_items') || '[]');
      stored.unshift(payload);
      localStorage.setItem('hr_feedback_items', JSON.stringify(stored));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Feedback sent to AI Agent!');
      }
    } catch (err) {
      console.error('Failed to submit feedback to /api/feedback:', err);
      showToast('Feedback saved locally!');
    }

    closeModal();
    toggleInspector(false);
  }
})();
