const express = require('express');
const prisma = require('../db');
const { authenticateUser } = require('./auth');
const { generateCodeReviewDraft } = require('../services/gemini');
const router = express.Router();

router.use(authenticateUser);

// GET /api/solutions/:id/reviews
router.get('/solutions/:id/reviews', async (req, res) => {
  try {
    const rounds = await prisma.reviewRound.findMany({
      where: { solutionId: req.params.id },
      orderBy: { roundNumber: 'asc' },
      include: {
        reviewer: { select: { id: true, username: true, role: true } }
      }
    });
    res.json({ rounds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/solutions/:id/review/draft (Generate AI Review Draft via Gemini)
router.post('/solutions/:id/review/draft', async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only admins can generate code review drafts.' });
  }

  try {
    const solution = await prisma.solution.findUnique({
      where: { id: req.params.id },
      include: {
        reviewRounds: { orderBy: { roundNumber: 'asc' } }
      }
    });

    if (!solution) return res.status(404).json({ error: 'Solution not found' });

    const draftText = await generateCodeReviewDraft({
      challengeTitle: solution.challengeTitle,
      language: solution.language,
      code: solution.code,
      previousReviews: solution.reviewRounds
    });

    res.json({
      success: true,
      nextRoundNumber: solution.reviewRounds.length + 1,
      draft: draftText
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/solutions/:id/review/publish (Publish / Save Review Round)
router.post('/solutions/:id/review/publish', async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only admins can publish code review rounds.' });
  }

  const { roundNumber, status = 'APPROVED', adminNotes, geminiDraft } = req.body;
  const solutionId = req.params.id;

  if (!adminNotes || !adminNotes.trim()) {
    return res.status(400).json({ error: 'Admin notes/feedback are required to publish a review round.' });
  }

  try {
    const rNum = parseInt(roundNumber) || 1;

    const reviewRound = await prisma.reviewRound.upsert({
      where: {
        solutionId_roundNumber: { solutionId, roundNumber: rNum }
      },
      update: {
        status,
        adminNotes: adminNotes.trim(),
        geminiDraft: geminiDraft ? JSON.stringify(geminiDraft) : null,
        reviewerId: req.user.id
      },
      create: {
        solutionId,
        roundNumber: rNum,
        reviewerId: req.user.id,
        status,
        adminNotes: adminNotes.trim(),
        geminiDraft: geminiDraft ? JSON.stringify(geminiDraft) : null
      },
      include: {
        reviewer: { select: { id: true, username: true, role: true } }
      }
    });

    res.json({ success: true, reviewRound });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
