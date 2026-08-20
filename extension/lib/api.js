/**
 * HackerRank API Client for Chrome Extension
 * Handles downloading solutions, checking session auth, and problem metadata
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.HRAPI = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const BASE_URL = 'https://www.hackerrank.com';

  function detectLanguage(code, filename = '') {
    if (filename.endsWith('.js')) return 'javascript';
    if (filename.endsWith('.py')) return 'python';
    if (filename.endsWith('.cpp') || filename.endsWith('.cc')) return 'cpp';
    if (filename.endsWith('.java')) return 'java';
    if (filename.endsWith('.c')) return 'c';
    if (filename.endsWith('.rb')) return 'ruby';
    if (filename.endsWith('.go')) return 'go';
    if (filename.endsWith('.rs')) return 'rust';

    const clean = code.trim();
    if (clean.startsWith('#!/bin/python') || clean.includes('def ') || clean.includes('import math') || clean.includes('import sys') || clean.includes('print(') || clean.includes('int(input()')) {
      return 'python';
    }
    if (clean.includes('#include <iostream>') || clean.includes('using namespace std') || clean.includes('vector<') || clean.includes('cin >>') || clean.includes('cout <<')) {
      return 'cpp';
    }
    if (clean.includes('public class') || clean.includes('public static void main') || clean.includes('System.out.print') || clean.includes('Scanner ')) {
      return 'java';
    }
    if (clean.includes('#include <stdio.h>') || clean.includes('#include <stdlib.h>')) {
      return 'c';
    }
    if (clean.includes('function ') || clean.includes('const ') || clean.includes('let ') || clean.includes('var ') || clean.includes('console.log') || clean.includes('process.stdin')) {
      return 'javascript';
    }
    return 'python';
  }

  const HRAPI = {
    detectLanguage,

    /**
     * Check if user is logged into HackerRank
     */
    async checkAuthStatus() {
      // Method 1: Check cookies via chrome.cookies if available
      if (typeof chrome !== 'undefined' && chrome.cookies) {
        try {
          const cookie = await new Promise((resolve) => {
            chrome.cookies.get({ url: BASE_URL, name: '_hrank_session' }, (cookie) => {
              resolve(cookie);
            });
          });
          if (cookie && cookie.value) {
            return {
              isLoggedIn: true,
              method: 'cookie',
              message: 'HackerRank session cookie detected'
            };
          }
        } catch (e) {
          console.warn('Cookie check failed:', e);
        }
      }

      // Method 2: Ping HackerRank rest endpoint with credentials
      try {
        const response = await fetch(`${BASE_URL}/rest/contests/master/hackers/me`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          return {
            isLoggedIn: true,
            user: data.model ? data.model.username : 'Logged in',
            data: data.model
          };
        } else if (response.status === 401 || response.status === 403) {
          return { isLoggedIn: false, error: 'Not authenticated on HackerRank' };
        }
      } catch (e) {
        console.warn('Auth ping check error:', e);
      }

      return { isLoggedIn: false, message: 'Please log in to HackerRank in your browser' };
    },

    /**
     * Download solution for a single problem and username
     */
    async fetchSolution(problemSlug, username) {
      const url = `${BASE_URL}/rest/contests/master/challenges/${problemSlug}/hackers/${username}/download_solution`;
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'text/plain, */*'
          },
          credentials: 'include'
        });

        if (response.status === 404) {
          return { success: false, notFound: true, problemSlug, username };
        }

        if (response.status === 401 || response.status === 403) {
          return { success: false, authError: true, problemSlug, username, error: 'Authentication required' };
        }

        if (!response.ok) {
          return { success: false, error: `HTTP ${response.status}`, problemSlug, username };
        }

        const code = await response.text();
        if (!code || code.trim().length === 0) {
          return { success: false, notFound: true, problemSlug, username };
        }

        return {
          success: true,
          code,
          language: detectLanguage(code),
          problemSlug,
          username,
          url,
          fetchedAt: Date.now()
        };
      } catch (err) {
        return {
          success: false,
          error: err.message,
          problemSlug,
          username
        };
      }
    },

    /**
     * Fetch problem statement and metadata
     */
    async fetchProblemDetails(problemSlug) {
      const url = `${BASE_URL}/rest/contests/master/challenges/${problemSlug}`;
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          credentials: 'include'
        });
        if (!response.ok) return null;
        const json = await response.json();
        if (json && json.model) {
          return {
            slug: problemSlug,
            title: json.model.name,
            difficulty: json.model.difficulty_name,
            category: json.model.category_name || 'Algorithms',
            statementHtml: json.model.body_html,
            hasStatement: !!json.model.body_html
          };
        }
      } catch (e) {
        console.warn(`Failed to fetch details for ${problemSlug}:`, e);
      }
      return null;
    },

    /**
     * Batch fetch solutions for a username across problem slugs
     * @param {string} username
     * @param {string[]} problemSlugs
     * @param {Function} onProgress - callback({ current, total, solvedCount, notFoundCount, currentSlug, percent })
     * @param {Object} options - { concurrency: 5, delayMs: 40, signal: AbortSignal }
     */
    async fetchUserSolutionsBatch(username, problemSlugs, onProgress, options = {}) {
      const concurrency = options.concurrency || 5;
      const delayMs = options.delayMs || 30;
      const signal = options.signal;

      const total = problemSlugs.length;
      let currentIndex = 0;
      let solvedCount = 0;
      let notFoundCount = 0;
      let errorCount = 0;

      const foundSolutions = {};

      const queue = [...problemSlugs];
      const activeWorkers = [];

      async function worker() {
        while (queue.length > 0) {
          if (signal && signal.aborted) break;

          const slug = queue.shift();
          currentIndex++;

          const result = await HRAPI.fetchSolution(slug, username);

          if (result.success) {
            solvedCount++;
            foundSolutions[slug] = {
              code: result.code,
              language: result.language,
              problemSlug: slug,
              username,
              fetchedAt: result.fetchedAt,
              url: result.url
            };
          } else if (result.notFound) {
            notFoundCount++;
          } else if (result.authError) {
            errorCount++;
            if (onProgress) {
              onProgress({
                current: currentIndex,
                total,
                solvedCount,
                notFoundCount,
                errorCount,
                currentSlug: slug,
                percent: Math.round((currentIndex / total) * 100),
                authError: true,
                message: 'Authentication failed. Please check your HackerRank login.'
              });
            }
            throw new Error('Authentication failed. Please log in to HackerRank.');
          } else {
            errorCount++;
          }

          if (onProgress) {
            onProgress({
              current: currentIndex,
              total,
              solvedCount,
              notFoundCount,
              errorCount,
              currentSlug: slug,
              percent: Math.round((currentIndex / total) * 100)
            });
          }

          if (delayMs > 0) {
            await new Promise(r => setTimeout(r, delayMs));
          }
        }
      }

      for (let i = 0; i < Math.min(concurrency, total); i++) {
        activeWorkers.push(worker());
      }

      await Promise.all(activeWorkers);

      return {
        username,
        totalChecked: currentIndex,
        solvedCount,
        notFoundCount,
        errorCount,
        solutions: foundSolutions
      };
    }
  };

  return HRAPI;
});
