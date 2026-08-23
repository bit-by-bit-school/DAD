const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const ADMIN_TOKEN = 'hr_admin_master_token_2026';

async function request(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${typeof data === 'object' ? JSON.stringify(data) : data}`);
  }
  return data;
}

async function runReviewFlowTest() {
  console.log('🧪 Running Comprehensive Code Review & Structured Import Automated Test...\n');

  // 1. Verify index.html contains the new LLM Code Review Assistant components and follows DESIGN.md
  console.log('1️⃣ Auditing index.html for DESIGN.md compliance & UI elements...');
  const htmlContent = fs.readFileSync(path.join(__dirname, '../server/public/index.html'), 'utf8');

  const requiredElements = [
    'id="admin-ai-assistant-panel"',
    'id="btn-copy-review-prompt"',
    'id="btn-toggle-prompt-preview"',
    'id="prompt-preview-drawer"',
    'id="llm-review-input"',
    'id="btn-import-llm-review"',
    'id="parsed-review-card"',
    'id="parsed-metrics-container"',
    'id="parsed-review-summary"',
    'id="parsed-review-details"',
    'id="ai-draft-comments-wrapper"',
    'id="ai-draft-comments-list"',
    'id="btn-approve-all-drafts"',
    'id="btn-reject-all-drafts"',
    'id="btn-publish-review-round"',
    'id="review-rounds-timeline"'
  ];

  for (const el of requiredElements) {
    if (!htmlContent.includes(el)) {
      throw new Error(`Missing expected element in index.html: ${el}`);
    }
  }
  console.log('   ✅ All required DOM elements verified in index.html.');

  // Check for forbidden emojis in review section
  const reviewSubtabMatch = htmlContent.match(/<div id="subtab-reviews"[\s\S]*?<!-- Subtab 3: Ratings Panel -->/);
  if (reviewSubtabMatch) {
    const rawEmojis = ['🧠', '📖', '💬', '📂', '💻', '⚡', '🔔', '🔑', '🤖', '⭐', '★', '📋', '👁️', '✨'];
    for (const emoji of rawEmojis) {
      if (reviewSubtabMatch[0].includes(emoji)) {
        throw new Error(`Forbidden emoji "${emoji}" found in index.html review subtab (violates DESIGN.md)`);
      }
    }
    console.log('   ✅ DESIGN.md strict emoji prohibition validated: 0 raw emojis in review subtab.');
  }

  // 2. Sync a multi-language solution suite
  console.log('\n2️⃣ Syncing candidate solutions for review...');
  const solutions = [
    {
      submissionId: 'rev_flow_py_01',
      challengeSlug: 'time-conversion',
      challengeTitle: 'Time Conversion',
      language: 'python',
      code: `#!/bin/python3
import sys

def timeConversion(s):
    period = s[-2:]
    hour = int(s[:2])
    rest = s[2:-2]
    if period == 'PM' and hour != 12:
        hour += 12
    elif period == 'AM' and hour == 12:
        hour = 0
    return f"{hour:02d}{rest}"

if __name__ == '__main__':
    fptr = open(os.environ['OUTPUT_PATH'], 'w')
    s = input()
    result = timeConversion(s)
    fptr.write(result + '\\n')
    fptr.close()
`,
      username: 'algo_pro'
    }
  ];

  const syncRes = await request(`${BASE_URL}/api/solutions/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ADMIN_TOKEN}`
    },
    body: JSON.stringify({ solutions })
  });
  console.log('   ✅ Solutions synced successfully.');

  // 3. Fetch solution details
  console.log('\n3️⃣ Fetching synced solution details from server...');
  const listRes = await request(`${BASE_URL}/api/solutions?usernames=algo_pro`);
  const sol = listRes.solutions.find(s => s.submissionId === 'rev_flow_py_01');
  if (!sol) throw new Error('Synced solution rev_flow_py_01 not found.');
  console.log(`   ✅ Target solution ID: ${sol.id} ("${sol.challengeTitle}")`);

  // 4. Generate LLM Review Prompt
  console.log('\n4️⃣ Testing GET /api/solutions/:id/review/prompt...');
  const promptRes = await request(`${BASE_URL}/api/solutions/${sol.id}/review/prompt`, {
    headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
  });

  console.log('   ✅ Prompt generated:');
  console.log('      - Challenge Title:', promptRes.challengeTitle);
  console.log('      - Language:', promptRes.language);
  console.log('      - Start Line Offset:', promptRes.startLineOffset);
  console.log('      - Next Round #:', promptRes.nextRoundNumber);
  console.log('      - Cleaned Code snippet:\n' + promptRes.cleanedCode.split('\n').map(l => '        ' + l).join('\n'));

  if (!promptRes.prompt.includes('# 1. Challenge Information') ||
      !promptRes.prompt.includes('# 2. Problem Statement') ||
      !promptRes.prompt.includes('# 3. Candidate Solution Code') ||
      !promptRes.prompt.includes('# 4. Review Context') ||
      !promptRes.prompt.includes('# 5. Evaluation Instructions') ||
      !promptRes.prompt.includes('# 6. Response Format Requirement') ||
      !promptRes.prompt.includes('Required JSON Schema')) {
    throw new Error('Prompt structure is missing required sections or schema.');
  }
  console.log('   ✅ Prompt contains all 6 required structured sections and JSON schema.');

  // 5. Test JSON Extraction & Import Simulation
  console.log('\n5️⃣ Simulating LLM Review Response Parsing...');
  const sampleLLMOutput = `Here is the comprehensive code review for the solution:

\`\`\`json
{
  "status": "APPROVED",
  "complexity": "Time: O(1), Space: O(1)",
  "clevernessScore": 4,
  "readabilityScore": 5,
  "summary": "Clean, idiomatic time format string manipulation using f-strings and modulo-like AM/PM normalization.",
  "strengths": [
    "O(1) constant time execution with direct slicing.",
    "Clean hour branch logic for 12 AM and 12 PM conversions."
  ],
  "edgeCases": "Handles boundary hours (12:00:00AM -> 00:00:00, 12:00:00PM -> 12:00:00) perfectly.",
  "suggestions": [
    "Optional: Add type annotations (s: str) -> str for enhanced static analysis."
  ],
  "adminNotes": "Round 1 Review: Clean O(1) logic with correct midnight/noon handling. Approved!",
  "lineComments": [
    {
      "startLine": ${promptRes.startLineOffset + 1},
      "endLine": ${promptRes.startLineOffset + 3},
      "type": "PRAISE",
      "content": "Clean slice decomposition."
    }
  ]
}
\`\`\`

Hope this helps!`;

  // Parse simulated response
  const codeBlockMatch = sampleLLMOutput.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (!codeBlockMatch) throw new Error('Failed to match json block.');
  const parsedData = JSON.parse(codeBlockMatch[1].trim());

  console.log('   ✅ Successfully parsed structured JSON:');
  console.log('      - Status:', parsedData.status);
  console.log('      - Complexity:', parsedData.complexity);
  console.log('      - Scores:', `Cleverness ${parsedData.clevernessScore}/5, Readability ${parsedData.readabilityScore}/5`);
  console.log('      - Line comments count:', parsedData.lineComments.length);

  // 6. Test Publishing Review Round with imported structured draft
  console.log('\n6️⃣ Publishing Review Round to backend (/api/solutions/:id/review/publish)...');
  const publishRes = await request(`${BASE_URL}/api/solutions/${sol.id}/review/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ADMIN_TOKEN}`
    },
    body: JSON.stringify({
      roundNumber: promptRes.nextRoundNumber,
      status: parsedData.status,
      adminNotes: parsedData.adminNotes,
      reviewDraft: parsedData
    })
  });

  console.log('   ✅ Review Round Published:');
  console.log('      - Round Number:', publishRes.reviewRound.roundNumber);
  console.log('      - Status:', publishRes.reviewRound.status);
  console.log('      - Reviewer ID:', publishRes.reviewRound.reviewerId);

  // 7. Verify Review Round in Timeline History
  console.log('\n7️⃣ Verifying Review Rounds History (/api/solutions/:id/reviews)...');
  const roundsRes = await request(`${BASE_URL}/api/solutions/${sol.id}/reviews`, {
    headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
  });
  console.log(`   ✅ Total recorded rounds: ${roundsRes.rounds.length}`);
  const latest = roundsRes.rounds[roundsRes.rounds.length - 1];
  if (latest.roundNumber !== promptRes.nextRoundNumber || latest.status !== 'APPROVED') {
    throw new Error(`Latest review round mismatch (expected round ${promptRes.nextRoundNumber}, got ${latest.roundNumber}).`);
  }

  // 8. Test posting the imported line review comment
  console.log('\n8️⃣ Verifying Line Comment Creation from Draft...');
  const lineComment = parsedData.lineComments[0];
  const commentRes = await request(`${BASE_URL}/api/solutions/${sol.id}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ADMIN_TOKEN}`
    },
    body: JSON.stringify({
      content: `[AI Review] ${lineComment.content}`,
      startLine: lineComment.startLine,
      endLine: lineComment.endLine
    })
  });
  console.log(`   ✅ Line comment created on line ${commentRes.comment.startLine}: "${commentRes.comment.content}"`);

  // 9. Verify Next Round prompt includes latest round in history
  console.log('\n9️⃣ Verifying Iterative Multi-Round Context in Next Round Prompt...');
  const nextPromptRes = await request(`${BASE_URL}/api/solutions/${sol.id}/review/prompt`, {
    headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
  });

  console.log('   ✅ Next Round Number:', nextPromptRes.nextRoundNumber);
  if (!nextPromptRes.prompt.includes(`Review Round #${promptRes.nextRoundNumber + 1}`) ||
      !nextPromptRes.prompt.includes(`Round ${promptRes.nextRoundNumber}`) ||
      !nextPromptRes.prompt.includes('Clean O(1) logic with correct midnight/noon handling')) {
    throw new Error('Next round prompt does not include previous round history context.');
  }
  console.log('   ✅ Next round prompt successfully includes previous review decision & comments history!');

  // 10. Audit for dead Gemini code
  console.log('\n🔟 Auditing workspace for dead Gemini code...');
  if (fs.existsSync(path.join(__dirname, '../server/services/gemini.go'))) {
    throw new Error('server/services/gemini.go was not deleted.');
  }
  console.log('   ✅ server/services/gemini.go is confirmed deleted.');

  const envExample = fs.readFileSync(path.join(__dirname, '../server/.env.example'), 'utf8');
  if (envExample.includes('GEMINI_API_KEY')) {
    throw new Error('GEMINI_API_KEY still found in .env.example.');
  }
  console.log('   ✅ server/.env.example is clean.');

  if (!fs.existsSync(path.join(__dirname, '../.agents/skills/hackerrank-code-review/SKILL.md'))) {
    throw new Error('.agents/skills/hackerrank-code-review/SKILL.md does not exist.');
  }
  console.log('   ✅ .agents/skills/hackerrank-code-review/SKILL.md is confirmed present.');

  console.log('\n🎉 ALL CODE REVIEW & STRUCTURED IMPORT TESTS PASSED WITH 100% SUCCESS!');
}

runReviewFlowTest().catch(err => {
  console.error('\n❌ Test failed:', err.message);
  process.exit(1);
});
