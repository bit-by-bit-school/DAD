const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const { router: authRouter } = require('./routes/auth');
const adminRouter = require('./routes/admin');
const solutionsRouter = require('./routes/solutions');
const socialRouter = require('./routes/social');
const reviewsRouter = require('./routes/reviews');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static public directory for Unified Dashboard
app.use(express.static(path.join(__dirname, '../public')));

// Mount API Routes
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/solutions', solutionsRouter);

app.get('/api/users', async (req, res) => {
  try {
    const prisma = require('./db');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        discordAvatar: true,
        role: true,
        _count: { select: { solutions: true } }
      },
      orderBy: { username: 'asc' }
    });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/api', socialRouter);
app.use('/api', reviewsRouter);

// Catch-all route to serve Dashboard SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 HackerRank Solutions Hub Local Backend Server Running!`);
  console.log(`🌐 Dashboard URL: http://localhost:${PORT}`);
  console.log(`🔑 Master Admin Token: hr_admin_master_token_2026`);
  console.log(`=======================================================`);
});
