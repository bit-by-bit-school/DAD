/**
 * HackerRank Solutions Storage Manager
 * Uses chrome.storage.local with unlimitedStorage, with graceful fallback to localStorage.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.HRStorage = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const STORAGE_KEYS = {
    PROBLEMS: 'hr_problems',
    SOLUTIONS: 'hr_solutions',
    USERS: 'hr_users',
    SETTINGS: 'hr_settings',
    INITIALIZED: 'hr_initialized_v1'
  };

  const isChromeStorage = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

  async function getFromStorage(key) {
    if (isChromeStorage) {
      return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
          resolve(result[key]);
        });
      });
    } else {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : undefined;
      } catch (e) {
        console.error('localStorage get error:', e);
        return undefined;
      }
    }
  }

  async function setToStorage(key, value) {
    if (isChromeStorage) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime && chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
    } else {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error('localStorage set error:', e);
      }
    }
  }

  const HRStorage = {
    /**
     * Ensures initial seed data is loaded into storage
     */
    async init() {
      const initialized = await getFromStorage(STORAGE_KEYS.INITIALIZED);
      if (!initialized) {
        console.log('Initializing HackerRank database with seed data...');
        const seed = (typeof self !== 'undefined' && self.HR_SEED_DATA) ? self.HR_SEED_DATA : null;
        if (seed) {
          await setToStorage(STORAGE_KEYS.PROBLEMS, seed.problems || {});
          await setToStorage(STORAGE_KEYS.SOLUTIONS, seed.solutions || {});
          await setToStorage(STORAGE_KEYS.USERS, seed.users || []);
          await setToStorage(STORAGE_KEYS.SETTINGS, { theme: 'dark', sort: 'name_asc', viewMode: 'code' });
          await setToStorage(STORAGE_KEYS.INITIALIZED, Date.now());
        }
      }
      return true;
    },

    /**
     * Get all problem definitions
     */
    async getProblems() {
      await this.init();
      return (await getFromStorage(STORAGE_KEYS.PROBLEMS)) || {};
    },

    /**
     * Get specific problem
     */
    async getProblem(slug) {
      const problems = await this.getProblems();
      return problems[slug] || null;
    },

    /**
     * Get all solutions map { [slug]: { [username]: solutionObj } }
     */
    async getSolutions() {
      await this.init();
      return (await getFromStorage(STORAGE_KEYS.SOLUTIONS)) || {};
    },

    /**
     * Get solutions for a specific problem slug
     */
    async getSolutionsForProblem(slug) {
      const solutions = await this.getSolutions();
      return solutions[slug] || {};
    },

    /**
     * Get all solutions solved by a specific user
     */
    async getSolutionsByUser(username) {
      const solutions = await this.getSolutions();
      const userSolutions = {};
      for (const [slug, userMap] of Object.entries(solutions)) {
        if (userMap[username]) {
          userSolutions[slug] = userMap[username];
        }
      }
      return userSolutions;
    },

    /**
     * Get list of tracked users
     */
    async getUsers() {
      await this.init();
      return (await getFromStorage(STORAGE_KEYS.USERS)) || [];
    },

    /**
     * Add or update solutions for a user
     * @param {string} username
     * @param {Object} newSolutionsMap - { [problemSlug]: { code, language, fetchedAt, url } }
     */
    async saveUserSolutions(username, newSolutionsMap) {
      await this.init();
      const problems = await this.getProblems();
      const solutions = await this.getSolutions();
      let users = await this.getUsers();

      let newlyAddedCount = 0;
      let updatedCount = 0;

      for (const [slug, solData] of Object.entries(newSolutionsMap)) {
        if (!solutions[slug]) {
          solutions[slug] = {};
        }

        const isNew = !solutions[slug][username];
        if (isNew) newlyAddedCount++;
        else updatedCount++;

        const platform = solData.platform || 'hackerrank';

        solutions[slug][username] = {
          code: solData.code,
          language: solData.language || 'python',
          username,
          problemSlug: slug,
          platform,
          fetchedAt: solData.fetchedAt || Date.now(),
          url: solData.url || (platform === 'leetcode' ? `https://leetcode.com/problems/${slug}/` : `https://www.hackerrank.com/rest/contests/master/challenges/${slug}/hackers/${username}/download_solution`)
        };

        // Ensure problem is recorded
        if (!problems[slug]) {
          problems[slug] = {
            slug,
            title: solData.problemTitle || slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            category: 'Algorithms',
            difficulty: 'Medium',
            platform,
            url: platform === 'leetcode' ? `https://leetcode.com/problems/${slug}/` : `https://www.hackerrank.com/challenges/${slug}/problem`,
            hasStatement: false
          };
        } else if (!problems[slug].platform) {
          problems[slug].platform = platform;
        }

        // Update solved users list on the problem
        const solvedUsersSet = new Set(Object.keys(solutions[slug]));
        problems[slug].solvedUsers = Array.from(solvedUsersSet);
        problems[slug].solvedCount = solvedUsersSet.size;
      }

      // Re-calculate solved count for this user
      let totalUserSolves = 0;
      for (const [slug, userMap] of Object.entries(solutions)) {
        if (userMap[username]) totalUserSolves++;
      }

      const existingUserIdx = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
      if (existingUserIdx >= 0) {
        users[existingUserIdx] = {
          ...users[existingUserIdx],
          solvedCount: totalUserSolves,
          lastSynced: Date.now()
        };
      } else {
        users.push({
          username,
          solvedCount: totalUserSolves,
          lastSynced: Date.now()
        });
      }

      // Save everything back to storage
      await setToStorage(STORAGE_KEYS.PROBLEMS, problems);
      await setToStorage(STORAGE_KEYS.SOLUTIONS, solutions);
      await setToStorage(STORAGE_KEYS.USERS, users);

      return {
        newlyAddedCount,
        updatedCount,
        totalUserSolves
      };
    },

    /**
     * Save/update problem statement HTML
     */
    async saveProblemStatement(slug, html) {
      const problems = await this.getProblems();
      if (!problems[slug]) {
        problems[slug] = {
          slug,
          title: slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          category: 'Algorithms',
          difficulty: 'Medium',
          url: `https://www.hackerrank.com/challenges/${slug}/problem`
        };
      }
      problems[slug].statementHtml = html;
      problems[slug].hasStatement = true;
      await setToStorage(STORAGE_KEYS.PROBLEMS, problems);
    },

    /**
     * Delete a user and their solutions
     */
    async deleteUser(username) {
      const problems = await this.getProblems();
      const solutions = await this.getSolutions();
      let users = await this.getUsers();

      for (const [slug, userMap] of Object.entries(solutions)) {
        if (userMap[username]) {
          delete userMap[username];
          const remainingUsers = Object.keys(userMap);
          if (problems[slug]) {
            problems[slug].solvedUsers = remainingUsers;
            problems[slug].solvedCount = remainingUsers.length;
          }
        }
      }

      users = users.filter(u => u.username.toLowerCase() !== username.toLowerCase());

      await setToStorage(STORAGE_KEYS.PROBLEMS, problems);
      await setToStorage(STORAGE_KEYS.SOLUTIONS, solutions);
      await setToStorage(STORAGE_KEYS.USERS, users);
    },

    /**
     * Get Settings
     */
    async getSettings() {
      return (await getFromStorage(STORAGE_KEYS.SETTINGS)) || { theme: 'dark', sort: 'name_asc', viewMode: 'code' };
    },

    /**
     * Save Settings
     */
    async saveSettings(settings) {
      const current = await this.getSettings();
      await setToStorage(STORAGE_KEYS.SETTINGS, { ...current, ...settings });
    },

    /**
     * Export all data as JSON
     */
    async exportData() {
      const problems = await this.getProblems();
      const solutions = await this.getSolutions();
      const users = await this.getUsers();
      return {
        exportedAt: new Date().toISOString(),
        version: 1,
        users,
        problems,
        solutions
      };
    },

    /**
     * Import JSON data
     */
    async importData(imported) {
      if (!imported || !imported.solutions) {
        throw new Error('Invalid backup file format');
      }
      const problems = await this.getProblems();
      const solutions = await this.getSolutions();
      let users = await this.getUsers();

      // Merge problems
      if (imported.problems) {
        for (const [slug, p] of Object.entries(imported.problems)) {
          problems[slug] = { ...(problems[slug] || {}), ...p };
        }
      }

      // Merge solutions
      for (const [slug, userMap] of Object.entries(imported.solutions)) {
        if (!solutions[slug]) solutions[slug] = {};
        for (const [username, sol] of Object.entries(userMap)) {
          solutions[slug][username] = sol;
        }
        problems[slug].solvedUsers = Object.keys(solutions[slug]);
        problems[slug].solvedCount = problems[slug].solvedUsers.length;
      }

      // Merge users
      const userMap = new Map(users.map(u => [u.username.toLowerCase(), u]));
      if (imported.users && Array.isArray(imported.users)) {
        for (const u of imported.users) {
          userMap.set(u.username.toLowerCase(), u);
        }
      }
      users = Array.from(userMap.values());

      await setToStorage(STORAGE_KEYS.PROBLEMS, problems);
      await setToStorage(STORAGE_KEYS.SOLUTIONS, solutions);
      await setToStorage(STORAGE_KEYS.USERS, users);
    },

    /**
     * Reset to seed data
     */
    async resetToSeed() {
      const seed = (typeof self !== 'undefined' && self.HR_SEED_DATA) ? self.HR_SEED_DATA : null;
      if (seed) {
        await setToStorage(STORAGE_KEYS.PROBLEMS, seed.problems || {});
        await setToStorage(STORAGE_KEYS.SOLUTIONS, seed.solutions || {});
        await setToStorage(STORAGE_KEYS.USERS, seed.users || []);
        await setToStorage(STORAGE_KEYS.INITIALIZED, Date.now());
      }
    }
  };

  return HRStorage;
});
