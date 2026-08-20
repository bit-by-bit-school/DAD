const express = require('express');
const axios = require('axios');
const prisma = require('../db');
const router = express.Router();

// Helper middleware to extract user from Authorization header or Query
async function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  const tokenParam = req.query.token;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (tokenParam) {
    token = tokenParam;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { token } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid authentication token.' });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth verification error:', err);
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
}

// POST /api/auth/verify-token
router.post('/verify-token', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token is required' });

  try {
    const user = await prisma.user.findUnique({ where: { token } });
    if (!user) {
      return res.status(404).json({ error: 'Token not found or invalid' });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/discord/login
router.get('/discord/login', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/api/auth/discord/callback');
  
  if (!clientId) {
    return res.status(400).send('Discord OAuth is not configured on this local server. Please set DISCORD_CLIENT_ID in server/.env.');
  }

  const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=identify`;
  res.redirect(discordAuthUrl);
});

// GET /api/auth/discord/callback
router.get('/discord/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.redirect('/?error=No code provided from Discord');
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/api/auth/discord/callback';

  try {
    // 1. Exchange code for token
    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token } = tokenResponse.data;

    // 2. Fetch Discord user profile
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const discordUser = userResponse.data;
    const discordId = discordUser.id;
    const discordUsername = `${discordUser.username}#${discordUser.discriminator !== '0' ? discordUser.discriminator : ''}`.replace(/#$/, '');
    const discordAvatar = discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.png` : null;

    // 3. Check if mapped to existing User
    let user = await prisma.user.findUnique({ where: { discordId } });

    if (user) {
      // User found! Redirect to dashboard with token
      return res.redirect(`/?token=${encodeURIComponent(user.token)}&login=discord_success`);
    }

    // 4. Not mapped yet. Upsert in UnmappedDiscord table
    await prisma.unmappedDiscord.upsert({
      where: { discordId },
      update: { discordUsername, discordAvatar, loggedInAt: new Date() },
      create: { discordId, discordUsername, discordAvatar }
    });

    // Redirect to dashboard with unmapped notice
    res.redirect(`/?discord_unmapped=true&discordId=${encodeURIComponent(discordId)}&discordUsername=${encodeURIComponent(discordUsername)}`);

  } catch (err) {
    console.error('Discord callback error:', err.response?.data || err.message);
    res.redirect(`/?error=${encodeURIComponent('Discord login failed: ' + (err.response?.data?.error_description || err.message))}`);
  }
});

module.exports = { router, authenticateUser };
