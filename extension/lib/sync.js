/**
 * HackerRank Solution Local Server Auto-Push Sync Helper
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.HRSync = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const HRSync = {
    /**
     * Push all local solutions to the local backend server
     */
    async pushToServer() {
      if (typeof HRStorage === 'undefined') {
        console.warn('HRStorage not available for sync');
        return { success: false, error: 'HRStorage not available' };
      }

      const settings = await HRStorage.getSettings();
      const serverUrl = (settings.serverUrl || 'http://localhost:3000').replace(/\/+$/, '');
      const token = settings.authToken || '';

      if (!token) {
        return { success: false, error: 'Local server Auth Token is not configured in settings.' };
      }

      const solutionsMap = await HRStorage.getSolutions();
      const problemsMap = await HRStorage.getProblems();
      
      const payloadSolutions = [];

      for (const [slug, userMap] of Object.entries(solutionsMap)) {
        const prob = problemsMap[slug] || {};
        for (const [username, sol] of Object.entries(userMap)) {
          payloadSolutions.push({
            submissionId: `${slug}_${username}`,
            challengeSlug: slug,
            challengeTitle: prob.title || slug,
            contestSlug: 'master',
            language: sol.language || 'python',
            code: sol.code,
            score: 1.0,
            status: 'Accepted',
            submittedAt: sol.fetchedAt ? new Date(sol.fetchedAt).toISOString() : new Date().toISOString(),
            username: username
          });
        }
      }

      if (payloadSolutions.length === 0) {
        return { success: true, syncedCount: 0, message: 'No solutions to sync.' };
      }

      try {
        const response = await fetch(`${serverUrl}/api/solutions/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ solutions: payloadSolutions })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        // Record sync timestamp
        await HRStorage.saveSettings({ lastSyncedAt: Date.now() });

        return {
          success: true,
          syncedCount: data.syncedCount,
          syncedUser: data.syncedUser
        };
      } catch (err) {
        console.error('Local server sync error:', err.message);
        return { success: false, error: err.message };
      }
    }
  };

  return HRSync;
});
