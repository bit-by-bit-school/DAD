/**
 * LeetCode API Client for Chrome Extension
 * Handles checking authentication, fetching submission lists, submission code,
 * and problem statements using LeetCode's GraphQL API.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LCAPI = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const BASE_URL = 'https://leetcode.com';
  const GRAPHQL_URL = `${BASE_URL}/graphql`;

  function detectLanguage(lang) {
    if (!lang) return 'python';
    const l = String(lang).toLowerCase().trim();
    if (l.includes('python') || l === 'py') return 'python';
    if (l.includes('c++') || l.includes('cpp')) return 'cpp';
    if (l.includes('java') && !l.includes('script')) return 'java';
    if (l.includes('javascript') || l === 'js') return 'javascript';
    if (l.includes('typescript') || l === 'ts') return 'typescript';
    if (l.includes('golang') || l === 'go') return 'go';
    if (l.includes('rust') || l === 'rs') return 'rust';
    if (l.includes('c') && !l.includes('c#') && !l.includes('cpp')) return 'c';
    if (l.includes('c#') || l.includes('cs')) return 'csharp';
    if (l.includes('ruby')) return 'ruby';
    if (l.includes('swift')) return 'swift';
    if (l.includes('kotlin')) return 'kotlin';
    return 'python';
  }

  async function getCsrfToken() {
    if (typeof chrome !== 'undefined' && chrome.cookies) {
      try {
        const cookie = await new Promise((resolve) => {
          chrome.cookies.get({ url: BASE_URL, name: 'csrftoken' }, (c) => resolve(c));
        });
        if (cookie && cookie.value) return cookie.value;
      } catch (e) {
        console.warn('Failed to read csrftoken cookie:', e);
      }
    }
    return '';
  }

  async function graphqlFetch(query, variables = {}) {
    const csrfToken = await getCsrfToken();
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    };
    if (csrfToken) {
      headers['x-csrftoken'] = csrfToken;
    }

    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`LeetCode GraphQL error HTTP ${response.status}`);
    }

    return await response.json();
  }

  const LCAPI = {
    detectLanguage,

    /**
     * Check if user is logged into LeetCode
     */
    async checkAuthStatus() {
      // 1. Check cookies via chrome.cookies
      let sessionCookieExists = false;
      if (typeof chrome !== 'undefined' && chrome.cookies) {
        try {
          const cookie = await new Promise((resolve) => {
            chrome.cookies.get({ url: BASE_URL, name: 'LEETCODE_SESSION' }, (c) => resolve(c));
          });
          if (cookie && cookie.value) {
            sessionCookieExists = true;
          }
        } catch (e) {
          console.warn('LeetCode session cookie check failed:', e);
        }
      }

      // 2. Query userStatus via GraphQL
      const userStatusQuery = `
        query userStatus {
          userStatus {
            isSignedIn
            username
            isPremium
          }
        }
      `;

      try {
        const res = await graphqlFetch(userStatusQuery);
        if (res && res.data && res.data.userStatus && res.data.userStatus.isSignedIn) {
          return {
            isLoggedIn: true,
            user: res.data.userStatus.username,
            isPremium: res.data.userStatus.isPremium,
            method: sessionCookieExists ? 'cookie' : 'graphql'
          };
        }
      } catch (e) {
        console.warn('LeetCode userStatus ping failed:', e);
      }

      if (sessionCookieExists) {
        return {
          isLoggedIn: true,
          user: 'LeetCode User',
          method: 'cookie'
        };
      }

      return {
        isLoggedIn: false,
        message: 'Please log in to LeetCode (leetcode.com) in your browser.'
      };
    },

    /**
     * Fetch user's submission list (paginated)
     */
    async fetchSubmissions(username, limit = 50, offset = 0) {
      const query = `
        query submissionList($offset: Int!, $limit: Int!) {
          submissionList(offset: $offset, limit: $limit) {
            hasNext
            submissions {
              id
              title
              titleSlug
              statusDisplay
              lang
              timestamp
              url
              memory
              runtime
            }
          }
        }
      `;

      try {
        const res = await graphqlFetch(query, { limit, offset });
        if (res.data && res.data.submissionList) {
          return {
            success: true,
            hasNext: res.data.submissionList.hasNext,
            submissions: res.data.submissionList.submissions || []
          };
        }
        return { success: false, error: 'Invalid GraphQL response', submissions: [] };
      } catch (e) {
        return { success: false, error: e.message, submissions: [] };
      }
    },

    /**
     * Fetch code and details for a single submission ID
     */
    async fetchSubmissionDetails(submissionId) {
      const query = `
        query submissionDetails($submissionId: Int!) {
          submissionDetails(submissionId: $submissionId) {
            code
            timestamp
            statusCode
            lang {
              name
              verboseName
            }
            question {
              questionId
              title
              titleSlug
              difficulty
            }
            runtime
            runtimeDisplay
            memory
            memoryDisplay
          }
        }
      `;

      try {
        const numericId = parseInt(submissionId, 10);
        const res = await graphqlFetch(query, { submissionId: numericId });
        if (res.data && res.data.submissionDetails) {
          const detail = res.data.submissionDetails;
          return {
            success: true,
            code: detail.code,
            language: detectLanguage(detail.lang ? detail.lang.name : ''),
            rawLanguage: detail.lang ? detail.lang.name : '',
            question: detail.question,
            runtimeDisplay: detail.runtimeDisplay,
            memoryDisplay: detail.memoryDisplay,
            submittedAt: detail.timestamp ? detail.timestamp * 1000 : Date.now()
          };
        }
        return { success: false, error: 'Submission details not found' };
      } catch (e) {
        return { success: false, error: e.message };
      }
    },

    /**
     * Fetch problem statement & metadata
     */
    async fetchProblemDetails(titleSlug) {
      const query = `
        query questionData($titleSlug: String!) {
          question(titleSlug: $titleSlug) {
            questionId
            title
            titleSlug
            content
            difficulty
            topicTags {
              name
              slug
            }
          }
        }
      `;

      try {
        const res = await graphqlFetch(query, { titleSlug });
        if (res.data && res.data.question) {
          const q = res.data.question;
          return {
            slug: q.titleSlug,
            title: q.title,
            difficulty: q.difficulty,
            category: q.topicTags && q.topicTags.length > 0 ? q.topicTags[0].name : 'Algorithms',
            statementHtml: q.content,
            hasStatement: !!q.content,
            platform: 'leetcode'
          };
        }
      } catch (e) {
        console.warn(`Failed to fetch LeetCode problem details for ${titleSlug}:`, e);
      }
      return null;
    },

    /**
     * Batch fetch solutions for a username
     * @param {string} username
     * @param {Function} onProgress - callback({ current, total, solvedCount, currentSlug, percent })
     * @param {Object} options - { concurrency: 3, maxSubmissions: 200, signal: AbortSignal }
     */
    async fetchUserSolutionsBatch(username, onProgress, options = {}) {
      const maxSubmissions = options.maxSubmissions || 200;
      const delayMs = options.delayMs || 50;
      const signal = options.signal;

      let offset = 0;
      let hasNext = true;
      const acceptedSubmissions = [];

      // 1. Fetch submission list pages until maxSubmissions or end
      while (hasNext && acceptedSubmissions.length < maxSubmissions) {
        if (signal && signal.aborted) break;

        const res = await this.fetchSubmissions(username, 50, offset);
        if (!res.success || !res.submissions || res.submissions.length === 0) {
          break;
        }

        for (const sub of res.submissions) {
          if (sub.statusDisplay === 'Accepted') {
            // Pick newest submission per problem slug
            const exists = acceptedSubmissions.find(s => s.titleSlug === sub.titleSlug);
            if (!exists) {
              acceptedSubmissions.push(sub);
            }
          }
        }

        hasNext = res.hasNext;
        offset += 50;

        if (onProgress) {
          onProgress({
            phase: 'listing',
            current: offset,
            solvedCount: acceptedSubmissions.length,
            message: `Fetched ${acceptedSubmissions.length} accepted solutions...`
          });
        }
      }

      const total = acceptedSubmissions.length;
      let currentIndex = 0;
      let solvedCount = 0;
      let errorCount = 0;

      const foundSolutions = {};

      // 2. Fetch code details for each accepted submission
      for (const sub of acceptedSubmissions) {
        if (signal && signal.aborted) break;
        currentIndex++;

        const detail = await this.fetchSubmissionDetails(sub.id);
        if (detail.success && detail.code) {
          solvedCount++;
          const slug = sub.titleSlug;
          foundSolutions[slug] = {
            code: detail.code,
            language: detail.language || detectLanguage(sub.lang),
            problemSlug: slug,
            problemTitle: sub.title,
            submissionId: String(sub.id),
            username: username || 'LeetCode User',
            fetchedAt: detail.submittedAt || Date.now(),
            platform: 'leetcode',
            url: `https://leetcode.com/problems/${slug}/`
          };
        } else {
          errorCount++;
        }

        if (onProgress) {
          onProgress({
            phase: 'downloading',
            current: currentIndex,
            total,
            solvedCount,
            errorCount,
            currentSlug: sub.titleSlug,
            percent: Math.round((currentIndex / total) * 100)
          });
        }

        if (delayMs > 0) {
          await new Promise(r => setTimeout(r, delayMs));
        }
      }

      return {
        username,
        totalChecked: currentIndex,
        solvedCount,
        errorCount,
        solutions: foundSolutions
      };
    }
  };

  return LCAPI;
});
