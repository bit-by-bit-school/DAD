const axios = require('../server/node_modules/axios');

const BASE_URL = 'http://localhost:3000';
const ADMIN_TOKEN = 'hr_admin_master_token_2026';

async function runVerification() {
  console.log('🧪 Starting HackerRank Local Backend Server Verification Test Suite...\n');

  try {
    // 1. Verify Admin Token
    console.log('1️⃣ Testing Auth Token Verification (/api/auth/verify-token)...');
    const authRes = await axios.post(`${BASE_URL}/api/auth/verify-token`, { token: ADMIN_TOKEN });
    console.log('   ✅ Auth Response:', authRes.data.user.username, 'Role:', authRes.data.user.role);

    // 2. Test Extension Solution Auto-Sync with Username Mapping
    console.log('\n2️⃣ Testing Solution Sync Endpoint (/api/solutions/sync)...');
    const sampleSolutions = [
      {
        submissionId: 'test_sub_alex_01',
        challengeSlug: 'solve-me-first',
        challengeTitle: 'Solve Me First',
        contestSlug: 'master',
        language: 'python',
        code: 'def solveMeFirst(a,b):\n    return a+b',
        score: 1.0,
        status: 'Accepted',
        username: 'alex_coder'
      },
      {
        submissionId: 'test_sub_sarah_01',
        challengeSlug: 'simple-array-sum',
        challengeTitle: 'Simple Array Sum',
        contestSlug: 'master',
        language: 'cpp',
        code: 'int simpleArraySum(vector<int> ar) {\n    int sum = 0;\n    for(int x : ar) sum += x;\n    return sum;\n}',
        score: 1.0,
        status: 'Accepted',
        username: 'sarah_dev'
      }
    ];

    const syncRes = await axios.post(`${BASE_URL}/api/solutions/sync`, 
      { solutions: sampleSolutions },
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
    );
    console.log('   ✅ Sync Response:', syncRes.data);

    // 3. Test Users List Endpoint (/api/users)
    console.log('\n3️⃣ Testing User Directory Endpoint (/api/users)...');
    const usersRes = await axios.get(`${BASE_URL}/api/users`);
    const usernamesList = usersRes.data.users.map(u => u.username);
    console.log(`   ✅ Total Users: ${usersRes.data.users.length} (${usernamesList.slice(0, 5).join(', ')})`);
    if (!usernamesList.includes('alex_coder') || !usernamesList.includes('sarah_dev')) {
      throw new Error('Sync failed to create separate user accounts for alex_coder / sarah_dev');
    }

    // 4. Query Solutions List with Multiselect User Filtering
    console.log('\n4️⃣ Querying Solutions List with Multi-User Filtering (/api/solutions?usernames=alex_coder,sarah_dev)...');
    const listRes = await axios.get(`${BASE_URL}/api/solutions?usernames=alex_coder,sarah_dev`);
    console.log(`   ✅ Total Solutions for alex_coder & sarah_dev: ${listRes.data.solutions.length}`);
    const mappedUsers = listRes.data.solutions.map(s => s.user.username);
    console.log(`   Mapped solution submitters: [${Array.from(new Set(mappedUsers)).join(', ')}]`);

    const firstSol = listRes.data.solutions[0];
    console.log(`   Sample Solution: "${firstSol.challengeTitle}" (${firstSol.language}) by @${firstSol.user.username}`);

    // 5. Test Dual Rating
    console.log('\n5️⃣ Testing Dual Rating (/api/solutions/:id/rate)...');
    const rateRes = await axios.post(`${BASE_URL}/api/solutions/${firstSol.id}/rate`,
      { cleverness: 5, readability: 4 },
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
    );
    console.log('   ✅ Rating Saved:', rateRes.data.rating.id);

    // 6. Test Posting Comment (General and Line Range)
    console.log('\n6️⃣ Testing Comments (/api/solutions/:id/comments)...');
    const commentRes = await axios.post(`${BASE_URL}/api/solutions/${firstSol.id}/comments`,
      { content: 'Super clean and concise implementation! Great work.' },
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
    );
    console.log('   ✅ General Comment Posted:', commentRes.data.comment.content);

    const lineCommentRes = await axios.post(`${BASE_URL}/api/solutions/${firstSol.id}/comments`,
      { content: 'Consider optimizing this loop for O(N) time.', startLine: 2, endLine: 4 },
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
    );
    console.log('   ✅ Line Range Comment Posted:', lineCommentRes.data.comment.content, `(Lines ${lineCommentRes.data.comment.startLine}-${lineCommentRes.data.comment.endLine})`);

    // 7. Test Gemini Code Review Draft & Publishing Round 1
    console.log('\n7️⃣ Testing Gemini AI Review Draft & Round 1 Publishing...');
    const draftRes = await axios.post(`${BASE_URL}/api/solutions/${firstSol.id}/review/draft`,
      {},
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
    );
    console.log('   ✅ Gemini Draft Status: Draft generated successfully!');

    const publishRes = await axios.post(`${BASE_URL}/api/solutions/${firstSol.id}/review/publish`,
      {
        roundNumber: 1,
        status: 'APPROVED',
        adminNotes: 'Round 1 Review: Time complexity is optimal O(1). Approved!',
        geminiDraft: draftRes.data.draft
      },
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
    );
    console.log('   ✅ Code Review Round 1 Published:', publishRes.data.reviewRound.status);

    // 8. Test Admin User Token Generation
    console.log('\n8️⃣ Testing Admin User Token Creation (/api/admin/tokens)...');
    const newUsername = `test_dev_${Date.now().toString().slice(-4)}`;
    const tokenRes = await axios.post(`${BASE_URL}/api/admin/tokens`,
      { username: newUsername, role: 'USER' },
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
    );
    console.log('   ✅ New User Token Generated:', tokenRes.data.user.username, '->', tokenRes.data.user.token);

    console.log('\n🎉 ALL LOCAL SERVER INTEGRATION TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Verification failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

runVerification();
