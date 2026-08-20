const express = require('express');
const crypto = require('crypto');
const prisma = require('../db');
const { authenticateUser } = require('./auth');
const router = express.Router();

// Middleware: Require Admin role
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
}

router.use(authenticateUser);
router.use(requireAdmin);

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        token: true,
        discordId: true,
        discordUsername: true,
        discordAvatar: true,
        role: true,
        createdAt: true,
        _count: { select: { solutions: true, comments: true, ratings: true } }
      }
    });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/tokens (Generate user token)
router.post('/tokens', async (req, res) => {
  const { username, role = 'USER', discordUsername = null } = req.body;
  if (!username) return res.status(400).json({ error: 'Username is required' });

  const generatedToken = 'hr_' + crypto.randomBytes(16).toString('hex');

  try {
    const user = await prisma.user.create({
      data: {
        username: username.trim(),
        discordUsername: discordUsername ? discordUsername.trim() : null,
        token: generatedToken,
        role: role.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER'
      }
    });
    res.status(201).json({ success: true, user });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: `Username "${username}" already exists.` });
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/advance-map-discord (Pre-assign Discord username to user)
router.post('/advance-map-discord', async (req, res) => {
  const { userId, discordUsername } = req.body;
  if (!userId || !discordUsername) {
    return res.status(400).json({ error: 'userId and discordUsername are required' });
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        discordUsername: discordUsername.trim()
      }
    });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/unmapped-discords
router.get('/unmapped-discords', async (req, res) => {
  try {
    const unmapped = await prisma.unmappedDiscord.findMany({
      orderBy: { loggedInAt: 'desc' }
    });
    res.json({ unmapped });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/map-discord
router.post('/map-discord', async (req, res) => {
  const { discordId, userId } = req.body;
  if (!discordId || !userId) {
    return res.status(400).json({ error: 'discordId and userId are required' });
  }

  try {
    const unmapped = await prisma.unmappedDiscord.findUnique({ where: { discordId } });
    if (!unmapped) {
      return res.status(404).json({ error: 'Unmapped Discord entry not found.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        discordId: unmapped.discordId,
        discordUsername: unmapped.discordUsername,
        discordAvatar: unmapped.discordAvatar
      }
    });

    // Remove from unmapped table
    await prisma.unmappedDiscord.delete({ where: { discordId } });

    res.json({ success: true, user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own admin account.' });
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
