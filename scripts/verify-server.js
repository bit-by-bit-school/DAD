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

    // 2. Test Extension Solution Auto-Sync
    console.log('\n2️⃣ Testing Solution Sync Endpoint (/api/solutions/sync)...');
    const sampleSolutions = [
      {
        submissionId: 'test_sub_001',
        challengeSlug: 'solve-me-first',
        challengeTitle: 'Solve Me First',
        contestSlug: 'master',
        language: 'python',
        code: 'def solveMeFirst(a,b):\n    return a+b',
        score: 1.0,
        status: 'Accepted'
      },
      {
        submissionId: 'test_sub_002',
        challengeSlug: 'simple-array-sum',
        challengeTitle: 'Simple Array Sum',
        contestSlug: 'master',
        language: 'cpp',
        code: 'int simpleArraySum(vector<int> ar) {\n    int sum = 0;\n    for(int x : ar) sum += x;\n    return sum;\n}',
        score: 1.0,
        status: 'Accepted'
      }
    ];

    const syncRes = await axios.post(`${BASE_URL}/api/solutions/sync`, 
      { solutions: sampleSolutions },
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
    );
    console.log('   ✅ Sync Response:', syncRes.data);

    // 3. Query Solutions List
    console.log('\n3️⃣ Querying Solutions List (/api/solutions)...');
    const listRes = await axios.get(`${BASE_URL}/api/solutions`);
    console.log(`   ✅ Total Solutions in DB: ${listRes.data.solutions.length}`);
    const firstSol = listRes.data.solutions[0];
    console.log(`   Sample Solution: "${firstSol.challengeTitle}" (${firstSol.language}) ID: ${firstSol.id}`);

    // 4. Test Dual Rating
    console.log('\n4️⃣ Testing Dual Rating (/api/solutions/:id/rate)...');
    const rateRes = await axios.post(`${BASE_URL}/api/solutions/${firstSol.id}/rate`,
      { cleverness: 5, readability: 4 },
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
    );
    console.log('   ✅ Rating Saved:', rateRes.data.rating);

    // 5. Test Posting Comment
    console.log('\n5️⃣ Testing Comments (/api/solutions/:id/comments)...');
    const commentRes = await axios.post(`${BASE_URL}/api/solutions/${firstSol.id}/comments`,
      { content: 'Super clean and concise implementation! Great work.' },
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
    );
    console.log('   ✅ Comment Posted:', commentRes.data.comment.content);

    // 6. Test Gemini Code Review Draft & Publishing Round 1
    console.log('\n6️⃣ Testing Gemini AI Review Draft & Round 1 Publishing...');
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

    // 7. Test Admin User Token Generation
    console.log('\n7️⃣ Testing Admin User Token Creation (/api/admin/tokens)...');
    const tokenRes = await axios.post(`${BASE_URL}/api/admin/tokens`,
      { username: 'test_dev_01', role: 'USER' },
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
