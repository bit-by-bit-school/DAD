const express = require('express');
const prisma = require('../db');
const { authenticateUser } = require('./auth');
const router = express.Router();

router.use(authenticateUser);

// POST /api/solutions/:id/rate
router.post('/solutions/:id/rate', async (req, res) => {
  const { cleverness, readability } = req.body;
  const solutionId = req.params.id;
  const userId = req.user.id;

  const cScore = parseInt(cleverness);
  const rScore = parseInt(readability);

  if (isNaN(cScore) || cScore < 1 || cScore > 5 || isNaN(rScore) || rScore < 1 || rScore > 5) {
    return res.status(400).json({ error: 'Cleverness and Readability must be integers between 1 and 5.' });
  }

  try {
    const rating = await prisma.rating.upsert({
      where: {
        solutionId_userId: { solutionId, userId }
      },
      update: {
        cleverness: cScore,
        readability: rScore
      },
      create: {
        solutionId,
        userId,
        cleverness: cScore,
        readability: rScore
      }
    });

    res.json({ success: true, rating });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/solutions/:id/comments
router.post('/solutions/:id/comments', async (req, res) => {
  const { content, startLine, endLine } = req.body;
  const solutionId = req.params.id;
  const userId = req.user.id;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment content cannot be empty.' });
  }

  let sLine = null;
  let eLine = null;
  let commentType = 'GENERAL';

  if (startLine !== undefined && startLine !== null && startLine !== '') {
    sLine = parseInt(startLine);
    if (isNaN(sLine) || sLine < 1) {
      return res.status(400).json({ error: 'startLine must be a positive integer >= 1.' });
    }

    if (endLine !== undefined && endLine !== null && endLine !== '') {
      eLine = parseInt(endLine);
      if (isNaN(eLine) || eLine < sLine) {
        return res.status(400).json({ error: 'endLine must be an integer >= startLine.' });
      }
    } else {
      eLine = sLine;
    }
    commentType = 'LINE_REVIEW';
  }

  try {
    const comment = await prisma.comment.create({
      data: {
        solutionId,
        userId,
        content: content.trim(),
        startLine: sLine,
        endLine: eLine,
        commentType
      },
      include: {
        user: { select: { id: true, username: true, discordAvatar: true, role: true } }
      }
    });

    res.status(201).json({ success: true, comment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/comments/:commentId
router.delete('/comments/:commentId', async (req, res) => {
  const { commentId } = req.params;

  try {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    if (comment.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized to delete this comment.' });
    }

    await prisma.comment.delete({ where: { id: commentId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
