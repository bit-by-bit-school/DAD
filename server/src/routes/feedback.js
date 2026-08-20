const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const FEEDBACK_FILE = path.join(__dirname, '../../feedback_log.json');

// Helper to read feedback
function getFeedbackList() {
  try {
    if (fs.existsSync(FEEDBACK_FILE)) {
      const data = fs.readFileSync(FEEDBACK_FILE, 'utf8');
      return JSON.parse(data || '[]');
    }
  } catch (e) {
    console.error('Error reading feedback_log.json:', e);
  }
  return [];
}

// Helper to save feedback
function saveFeedbackList(list) {
  try {
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing feedback_log.json:', e);
  }
}

// POST /api/feedback - Save new feedback
router.post('/feedback', (req, res) => {
  const { element, comment, category, path: currentPath, viewport } = req.body;
  const list = getFeedbackList();

  const newEntry = {
    id: 'fb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    timestamp: new Date().toISOString(),
    comment: comment || '(No comment provided)',
    category: category || 'General',
    element: element || {},
    currentPath: currentPath || '/',
    viewport: viewport || {}
  };

  list.unshift(newEntry);
  saveFeedbackList(list);

  console.log(`\n📢 [DIRECT BROWSER FEEDBACK RECEIVED]`);
  console.log(`💬 Comment: "${newEntry.comment}" [${newEntry.category}]`);
  console.log(`🎯 Target: <${newEntry.element.tagName?.toLowerCase()} id="${newEntry.element.id || ''}" class="${newEntry.element.className || ''}">`);
  console.log(`📍 Selector: ${newEntry.element.cssSelector}`);
  console.log(`📝 Text Snippet: "${(newEntry.element.text || '').slice(0, 100)}"`);
  console.log(`---------------------------------------------------\n`);

  res.json({ success: true, feedback: newEntry });
});

// GET /api/feedback - List all feedback
router.get('/feedback', (req, res) => {
  const list = getFeedbackList();
  res.json({ success: true, count: list.length, feedbacks: list });
});

// DELETE /api/feedback - Clear all feedback
router.delete('/feedback', (req, res) => {
  saveFeedbackList([]);
  res.json({ success: true, message: 'All feedback cleared' });
});

module.exports = router;
