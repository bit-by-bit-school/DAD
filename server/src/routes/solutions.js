const express = require('express');
const prisma = require('../db');
const { authenticateUser } = require('./auth');
const router = express.Router();

// POST /api/solutions/sync (Extension background worker auto-push)
router.post('/sync', authenticateUser, async (req, res) => {
  const { solutions } = req.body;
  if (!solutions || !Array.isArray(solutions)) {
    return res.status(400).json({ error: 'Payload must contain a "solutions" array.' });
  }

  const userId = req.user.id;
  const syncResults = [];

  try {
    for (const sol of solutions) {
      const submissionId = String(sol.submissionId || sol.id || `${sol.challengeSlug}_${sol.language}_${sol.submittedAt || Date.now()}`);
      const challengeSlug = sol.challengeSlug || sol.slug || 'unknown';
      const challengeTitle = sol.challengeTitle || sol.name || challengeSlug;
      const contestSlug = sol.contestSlug || 'master';
      const language = sol.language || 'javascript';
      const code = sol.code || '';
      const score = typeof sol.score === 'number' ? sol.score : parseFloat(sol.score) || 1.0;
      const status = sol.status || 'Accepted';
      const submittedAt = sol.submittedAt ? new Date(sol.submittedAt) : new Date();

      if (!code) continue;

      const record = await prisma.solution.upsert({
        where: {
          submissionId_userId: { submissionId, userId }
        },
        update: {
          challengeTitle,
          contestSlug,
          language,
          code,
          score,
          status,
          submittedAt
        },
        create: {
          submissionId,
          challengeSlug,
          challengeTitle,
          contestSlug,
          language,
          code,
          score,
          status,
          submittedAt,
          userId
        }
      });
      syncResults.push(record.id);
    }

    res.json({
      success: true,
      syncedCount: syncResults.length,
      syncedUser: req.user.username
    });
  } catch (err) {
    console.error('Error syncing solutions:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/solutions (Query list)
router.get('/', async (req, res) => {
  const { challengeSlug, language, userId, search, page = 1, limit = 50 } = req.query;

  const where = {};
  if (challengeSlug) where.challengeSlug = challengeSlug;
  if (language) where.language = language;
  if (userId) where.userId = userId;

  if (search) {
    where.OR = [
      { challengeTitle: { contains: search } },
      { challengeSlug: { contains: search } },
      { code: { contains: search } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  try {
    const [solutions, totalCount] = await Promise.all([
      prisma.solution.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, discordAvatar: true, role: true } },
          ratings: true,
          _count: { select: { comments: true, reviewRounds: true } }
        }
      }),
      prisma.solution.count({ where })
    ]);

    // Attach calculated average ratings
    const formattedSolutions = solutions.map(sol => {
      const clevernessAvg = sol.ratings.length > 0
        ? (sol.ratings.reduce((acc, r) => acc + r.cleverness, 0) / sol.ratings.length).toFixed(1)
        : null;
      const readabilityAvg = sol.ratings.length > 0
        ? (sol.ratings.reduce((acc, r) => acc + r.readability, 0) / sol.ratings.length).toFixed(1)
        : null;

      return {
        ...sol,
        clevernessAvg: clevernessAvg ? parseFloat(clevernessAvg) : null,
        readabilityAvg: readabilityAvg ? parseFloat(readabilityAvg) : null,
        ratingsCount: sol.ratings.length,
        ratings: undefined // omit raw array in list view for performance
      };
    });

    res.json({
      solutions: formattedSolutions,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/solutions/:id (Single solution details)
router.get('/:id', async (req, res) => {
  try {
    const solution = await prisma.solution.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, username: true, discordUsername: true, discordAvatar: true, role: true } },
        ratings: {
          include: { user: { select: { id: true, username: true } } }
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, username: true, discordAvatar: true, role: true } } }
        },
        reviewRounds: {
          orderBy: { roundNumber: 'asc' },
          include: { reviewer: { select: { id: true, username: true, role: true } } }
        }
      }
    });

    if (!solution) {
      return res.status(404).json({ error: 'Solution not found' });
    }

    const clevernessAvg = solution.ratings.length > 0
      ? (solution.ratings.reduce((acc, r) => acc + r.cleverness, 0) / solution.ratings.length).toFixed(1)
      : null;
    const readabilityAvg = solution.ratings.length > 0
      ? (solution.ratings.reduce((acc, r) => acc + r.readability, 0) / solution.ratings.length).toFixed(1)
      : null;

    res.json({
      solution: {
        ...solution,
        clevernessAvg: clevernessAvg ? parseFloat(clevernessAvg) : null,
        readabilityAvg: readabilityAvg ? parseFloat(readabilityAvg) : null
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
