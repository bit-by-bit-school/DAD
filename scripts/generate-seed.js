import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function detectLanguage(code, filename = '') {
  if (filename.endsWith('.js')) return 'javascript';
  if (filename.endsWith('.py')) return 'python';
  if (filename.endsWith('.cpp') || filename.endsWith('.cc')) return 'cpp';
  if (filename.endsWith('.java')) return 'java';
  if (filename.endsWith('.c')) return 'c';

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
  if (clean.includes('function ') || clean.includes('const ') || clean.includes('let ') || clean.includes('var ') || clean.includes('console.log')) {
    return 'javascript';
  }
  return 'python';
}

function slugToTitle(slug) {
  return slug
    .split('-')
    .map(w => {
      if (w.toLowerCase() === 'ii') return 'II';
      if (w.toLowerCase() === 'iii') return 'III';
      if (w.toLowerCase() === 'iv') return 'IV';
      if (w.toLowerCase() === '1') return '1';
      if (w.toLowerCase() === '2') return '2';
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

const ROOT_DIR = path.resolve(__dirname, '..');
const initDir = fs.existsSync(path.join(ROOT_DIR, 'initFiles')) ? path.join(ROOT_DIR, 'initFiles') : ROOT_DIR;

// Load HackerRank problem slugs
const hrAllPath = path.join(initDir, 'all.json');
const hrProblemSlugs = fs.existsSync(hrAllPath) ? JSON.parse(fs.readFileSync(hrAllPath, 'utf8')) : [];

// Load LeetCode index from leetcode-all.json
const lcAllPath = path.join(initDir, 'leetcode-all.json');
let leetcodeMap = new Map();
if (fs.existsSync(lcAllPath)) {
  try {
    const lcList = JSON.parse(fs.readFileSync(lcAllPath, 'utf8'));
    for (const item of lcList) {
      if (item.titleSlug) {
        leetcodeMap.set(item.titleSlug, item);
      }
    }
    console.log(`Loaded ${leetcodeMap.size} LeetCode questions from ${lcAllPath}`);
  } catch (e) {
    console.warn('Could not parse leetcode-all.json:', e);
  }
}

const problems = {};
const solutions = {};
const userStats = {};
let totalSolutions = 0;

// 1. Process HackerRank problem directories & solutions
for (const slug of hrProblemSlugs) {
  const dirPath = path.join(initDir, slug);
  const problemTitle = slugToTitle(slug);

  problems[slug] = {
    slug,
    title: problemTitle,
    category: 'Algorithms',
    difficulty: 'Medium',
    platform: 'hackerrank',
    url: `https://www.hackerrank.com/challenges/${slug}/problem`,
    hasStatement: false
  };

  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      if (file === 'problemStatement.html') {
        const statementHtml = fs.readFileSync(fullPath, 'utf8');
        problems[slug].hasStatement = true;
        problems[slug].statementHtml = statementHtml;
      } else if (!file.endsWith('.html') && !file.endsWith('.json')) {
        const username = file.replace(/\.js$/, '').replace(/\.py$/, '');
        const code = fs.readFileSync(fullPath, 'utf8');
        const language = detectLanguage(code, file);

        if (!solutions[slug]) solutions[slug] = {};
        solutions[slug][username] = {
          code,
          language,
          username,
          problemSlug: slug,
          fetchedAt: Date.now() - Math.floor(Math.random() * 86400000 * 30),
          url: `https://www.hackerrank.com/rest/contests/master/challenges/${slug}/hackers/${username}/download_solution`
        };

        totalSolutions++;

        if (!userStats[username]) {
          userStats[username] = {
            username,
            solvedCount: 0,
            lastSynced: Date.now()
          };
        }
        userStats[username].solvedCount++;
      }
    }
  }
}

// 2. Process LeetCode problems (from initFiles directories and leetcodeMap)
const allInitDirs = fs.readdirSync(initDir);
for (const dirName of allInitDirs) {
  const fullDirPath = path.join(initDir, dirName);
  if (!fs.statSync(fullDirPath).isDirectory()) continue;
  if (problems[dirName]) continue; // Already handled under HackerRank

  const statementPath = path.join(fullDirPath, 'problemStatement.html');
  const hasStatement = fs.existsSync(statementPath);
  const lcInfo = leetcodeMap.get(dirName);

  if (hasStatement || lcInfo) {
    const title = lcInfo ? lcInfo.title : slugToTitle(dirName);
    const difficulty = lcInfo ? lcInfo.difficulty : 'Medium';
    const category = (lcInfo && lcInfo.topicTags && lcInfo.topicTags.length > 0) ? lcInfo.topicTags[0].name : 'Algorithms';
    const statementHtml = hasStatement ? fs.readFileSync(statementPath, 'utf8') : undefined;

    problems[dirName] = {
      slug: dirName,
      title,
      category,
      difficulty,
      platform: 'leetcode',
      url: `https://leetcode.com/problems/${dirName}/`,
      hasStatement,
      statementHtml,
      solvedCount: 0,
      solvedUsers: []
    };
  }
}

// Calculate solved counts per problem
for (const slug of Object.keys(problems)) {
  const solves = solutions[slug] ? Object.keys(solutions[slug]).length : 0;
  problems[slug].solvedCount = solves;
  problems[slug].solvedUsers = solutions[slug] ? Object.keys(solutions[slug]) : [];
}

console.log(`Compiled ${Object.keys(problems).length} problems, ${totalSolutions} solutions across ${Object.keys(userStats).length} users.`);

const dataDir = path.join(ROOT_DIR, 'extension', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Write seed-data.js
const seedDataContent = `// Auto-generated seed data containing local problems and solutions
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.HR_SEED_DATA = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    problems: ${JSON.stringify(problems, null, 2)},
    solutions: ${JSON.stringify(solutions, null, 2)},
    users: ${JSON.stringify(Object.values(userStats), null, 2)},
    problemList: ${JSON.stringify(Object.keys(problems), null, 2)},
    version: 1,
    generatedAt: ${Date.now()}
  };
});
`;

fs.writeFileSync(path.join(dataDir, 'seed-data.js'), seedDataContent, 'utf8');

// Write lightweight problems-list.js
const problemListContent = `(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.HR_PROBLEM_SLUGS = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  return ${JSON.stringify(Object.keys(problems), null, 2)};
});
`;

fs.writeFileSync(path.join(dataDir, 'problems-list.js'), problemListContent, 'utf8');
console.log(`Saved seed-data.js and problems-list.js to ${dataDir}`);
