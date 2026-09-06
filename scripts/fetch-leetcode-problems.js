import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const INIT_FILES_DIR = path.join(ROOT_DIR, 'initFiles');
const LEETCODE_ALL_JSON = path.join(INIT_FILES_DIR, 'leetcode-all.json');
const BASE_URL = 'https://leetcode.com';
const GRAPHQL_URL = `${BASE_URL}/graphql`;

// Parse CLI arguments
const args = process.argv.slice(2);
const isResume = args.includes('--resume') || !args.includes('--no-resume');
const limitArgIdx = args.indexOf('--limit');
const limit = limitArgIdx !== -1 ? parseInt(args[limitArgIdx + 1], 10) : 0;
const concurrencyArgIdx = args.indexOf('--concurrency');
const concurrency = concurrencyArgIdx !== -1 ? parseInt(args[concurrencyArgIdx + 1], 10) : 5;
const slugArgIdx = args.indexOf('--slug');
const targetSlug = slugArgIdx !== -1 ? args[slugArgIdx + 1] : null;

async function graphqlFetch(query, variables = {}, retries = 5) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest'
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, variables })
      });

      if (response.status === 429) {
        // Exponential backoff for rate limiting: 2^attempt * 1000ms + random jitter (0-1000ms)
        const backoffMs = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 1000);
        console.warn(`[Rate Limited 429] Exponential backoff attempt ${attempt}/${retries}: waiting ${(backoffMs / 1000).toFixed(1)}s...`);
        await new Promise(r => setTimeout(r, backoffMs));
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (data.errors) {
        throw new Error(`GraphQL Errors: ${JSON.stringify(data.errors)}`);
      }
      return data;
    } catch (e) {
      if (attempt === retries) throw e;
      // Exponential backoff with jitter: 2^attempt * 1000ms + random jitter
      const backoffMs = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 1000);
      console.warn(`Attempt ${attempt}/${retries} failed for query (${e.message}). Exponential backoff waiting ${(backoffMs / 1000).toFixed(1)}s...`);
      await new Promise(r => setTimeout(r, backoffMs));
    }
  }
}

async function fetchAllLeetCodeQuestions() {
  console.log('🔍 Fetching complete LeetCode question list via GraphQL...');
  
  // Strategy 1: problemsetQuestionList (paginated)
  let skip = 0;
  const pageSize = 100;
  let total = 0;
  const allQuestions = [];

  const listQuery = `
    query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
      problemsetQuestionList: questionList(
        categorySlug: $categorySlug
        limit: $limit
        skip: $skip
        filters: $filters
      ) {
        totalNum
        questions: data {
          frontendQuestionId: questionId
          title
          titleSlug
          difficulty
          isPaidOnly
          topicTags {
            name
            slug
          }
        }
      }
    }
  `;

  try {
    const firstRes = await graphqlFetch(listQuery, { categorySlug: '', limit: pageSize, skip: 0, filters: {} });
    if (firstRes.data && firstRes.data.problemsetQuestionList) {
      total = firstRes.data.problemsetQuestionList.totalNum;
      allQuestions.push(...firstRes.data.problemsetQuestionList.questions);
      console.log(`Found ${total} total LeetCode questions!`);

      while (allQuestions.length < total) {
        skip += pageSize;
        const res = await graphqlFetch(listQuery, { categorySlug: '', limit: pageSize, skip, filters: {} });
        if (res.data && res.data.problemsetQuestionList && res.data.problemsetQuestionList.questions) {
          allQuestions.push(...res.data.problemsetQuestionList.questions);
          process.stdout.write(`\rProgress: ${allQuestions.length}/${total} problem metadata fetched`);
        } else {
          break;
        }
        await new Promise(r => setTimeout(r, 100));
      }
      console.log('\n✅ Successfully fetched full LeetCode problem index.');
      return allQuestions;
    }
  } catch (e) {
    console.warn(`Primary problemsetQuestionList query failed: ${e.message}. Trying allQuestions fallback...`);
  }

  // Strategy 2: allQuestions fallback
  const fallbackQuery = `
    query allQuestions {
      allQuestions {
        questionId
        title
        titleSlug
        difficulty
        isPaidOnly
      }
    }
  `;
  const res = await graphqlFetch(fallbackQuery);
  if (res.data && res.data.allQuestions) {
    console.log(`✅ Fallback fetched ${res.data.allQuestions.length} questions.`);
    return res.data.allQuestions;
  }

  throw new Error('Failed to fetch LeetCode questions index via GraphQL.');
}

async function fetchProblemStatement(titleSlug) {
  const statementQuery = `
    query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionId
        questionFrontendId
        title
        titleSlug
        content
        difficulty
        isPaidOnly
        topicTags {
          name
          slug
        }
      }
    }
  `;

  const res = await graphqlFetch(statementQuery, { titleSlug });
  if (res.data && res.data.question) {
    return res.data.question;
  }
  return null;
}

async function main() {
  if (!fs.existsSync(INIT_FILES_DIR)) {
    fs.mkdirSync(INIT_FILES_DIR, { recursive: true });
  }

  let questions = [];

  // Check if we have cached leetcode-all.json
  if (fs.existsSync(LEETCODE_ALL_JSON) && isResume) {
    try {
      questions = JSON.parse(fs.readFileSync(LEETCODE_ALL_JSON, 'utf8'));
      console.log(`Loaded ${questions.length} questions from cached ${LEETCODE_ALL_JSON}`);
    } catch (e) {
      console.warn('Failed to parse cached leetcode-all.json, fetching fresh list...');
    }
  }

  if (!questions || questions.length === 0) {
    questions = await fetchAllLeetCodeQuestions();
    fs.writeFileSync(LEETCODE_ALL_JSON, JSON.stringify(questions, null, 2), 'utf8');
    console.log(`Saved question index to ${LEETCODE_ALL_JSON}`);
  }

  if (targetSlug) {
    questions = questions.filter(q => q.titleSlug === targetSlug);
    if (questions.length === 0) {
      questions = [{ titleSlug: targetSlug, title: targetSlug }];
    }
  }

  if (limit > 0) {
    questions = questions.slice(0, limit);
    console.log(`Limiting fetch to first ${limit} questions.`);
  }

  let savedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let paidCount = 0;

  console.log(`\n🚀 Starting batch fetch for ${questions.length} problem statements (Concurrency: ${concurrency})...`);

  const queue = [...questions];
  let activeWorkers = 0;
  let processed = 0;

  await new Promise(resolve => {
    async function worker() {
      while (queue.length > 0) {
        const q = queue.shift();
        processed++;
        const slug = q.titleSlug;
        const probDir = path.join(INIT_FILES_DIR, slug);
        const statementFile = path.join(probDir, 'problemStatement.html');

        if (isResume && fs.existsSync(statementFile)) {
          skippedCount++;
        } else {
          try {
            const detail = await fetchProblemStatement(slug);
            if (detail && detail.content) {
              if (!fs.existsSync(probDir)) {
                fs.mkdirSync(probDir, { recursive: true });
              }
              // Save statement HTML
              fs.writeFileSync(statementFile, detail.content, 'utf8');
              savedCount++;
            } else if (detail && detail.isPaidOnly) {
              paidCount++;
            } else {
              errorCount++;
            }
          } catch (e) {
            console.warn(`\n[Error] Failed to fetch statement for ${slug}: ${e.message}`);
            errorCount++;
          }
        }

        if (processed % 20 === 0 || queue.length === 0) {
          process.stdout.write(`\rProgress: ${processed}/${questions.length} (Saved: ${savedCount}, Skipped: ${skippedCount}, Paid: ${paidCount}, Errs: ${errorCount})`);
        }
      }
    }

    const workers = [];
    for (let i = 0; i < concurrency; i++) {
      workers.push(worker());
    }

    Promise.all(workers).then(resolve);
  });

  console.log(`\n\n🎉 LeetCode Problem Statement Fetch Complete!`);
  console.log(`-----------------------------------------------`);
  console.log(`Total Processed: ${processed}`);
  console.log(`Saved New Statements: ${savedCount}`);
  console.log(`Skipped Existing: ${skippedCount}`);
  console.log(`Paid-Only / Empty: ${paidCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`-----------------------------------------------\n`);
}

main().catch(err => {
  console.error('Fatal error in fetch-leetcode-problems:', err);
  process.exit(1);
});
