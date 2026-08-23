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
    const error = new Error(`Request failed with status ${res.status}: ${typeof data === 'object' ? JSON.stringify(data) : data}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function runVerification() {
  console.log('🧪 Starting HackerRank Local Backend Server Verification Test Suite...\n');

  try {
    // 1. Verify Admin Token
    console.log('1️⃣ Testing Auth Token Verification (/api/auth/verify-token)...');
    const authRes = await request(`${BASE_URL}/api/auth/verify-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: ADMIN_TOKEN })
    });
    console.log('   ✅ Auth Response:', authRes.user.username, 'Role:', authRes.user.role);

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

    const syncRes = await request(`${BASE_URL}/api/solutions/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({ solutions: sampleSolutions })
    });
    console.log('   ✅ Sync Response:', syncRes);

    // 3. Test Users List Endpoint (/api/users)
    console.log('\n3️⃣ Testing User Directory Endpoint (/api/users)...');
    const usersRes = await request(`${BASE_URL}/api/users`);
    const usernamesList = usersRes.users.map(u => u.username);
    console.log(`   ✅ Total Users: ${usersRes.users.length} (${usernamesList.slice(0, 5).join(', ')})`);
    if (!usernamesList.includes('alex_coder') || !usernamesList.includes('sarah_dev')) {
      throw new Error('Sync failed to create separate user accounts for alex_coder / sarah_dev');
    }

    // 4. Query Solutions List with Multiselect User Filtering
    console.log('\n4️⃣ Querying Solutions List with Multi-User Filtering (/api/solutions?usernames=alex_coder,sarah_dev)...');
    const listRes = await request(`${BASE_URL}/api/solutions?usernames=alex_coder,sarah_dev`);
    console.log(`   ✅ Total Solutions for alex_coder & sarah_dev: ${listRes.solutions.length}`);
    const mappedUsers = listRes.solutions.map(s => s.user.username);
    console.log(`   Mapped solution submitters: [${Array.from(new Set(mappedUsers)).join(', ')}]`);

    const firstSol = listRes.solutions[0];
    console.log(`   Sample Solution: "${firstSol.challengeTitle}" (${firstSol.language}) by @${firstSol.user.username}`);

    // 5. Test Dual Rating
    console.log('\n5️⃣ Testing Dual Rating (/api/solutions/:id/rate)...');
    const rateRes = await request(`${BASE_URL}/api/solutions/${firstSol.id}/rate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({ cleverness: 5, readability: 4 })
    });
    console.log('   ✅ Rating Saved:', rateRes.rating.id);

    // 6. Test Posting Comment (General and Line Range)
    console.log('\n6️⃣ Testing Comments (/api/solutions/:id/comments)...');
    const commentRes = await request(`${BASE_URL}/api/solutions/${firstSol.id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({ content: 'Super clean and concise implementation! Great work.' })
    });
    console.log('   ✅ General Comment Posted:', commentRes.comment.content);

    const lineCommentRes = await request(`${BASE_URL}/api/solutions/${firstSol.id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({ content: 'Consider optimizing this loop for O(N) time.', startLine: 2, endLine: 4 })
    });
    console.log('   ✅ Line Range Comment Posted:', lineCommentRes.comment.content, `(Lines ${lineCommentRes.comment.startLine}-${lineCommentRes.comment.endLine})`);

    // 7. Test Gemini Code Review Draft & Publishing Round 1
    console.log('\n7️⃣ Testing Gemini AI Review Draft & Round 1 Publishing...');
    const draftRes = await request(`${BASE_URL}/api/solutions/${firstSol.id}/review/draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({})
    });
    console.log('   ✅ Gemini Draft Status: Draft generated successfully!');

    const publishRes = await request(`${BASE_URL}/api/solutions/${firstSol.id}/review/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        roundNumber: 1,
        status: 'APPROVED',
        adminNotes: 'Round 1 Review: Time complexity is optimal O(1). Approved!',
        geminiDraft: draftRes.draft
      })
    });
    console.log('   ✅ Code Review Round 1 Published:', publishRes.reviewRound.status);

    // 8. Test Admin User Token Generation
    console.log('\n8️⃣ Testing Admin User Token Creation (/api/admin/tokens)...');
    const newUsername = `test_dev_${Date.now().toString().slice(-4)}`;
    const tokenRes = await request(`${BASE_URL}/api/admin/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({ username: newUsername, role: 'USER' })
    });
    console.log('   ✅ New User Token Generated:', tokenRes.user.username, '->', tokenRes.user.token);

    console.log('\n🎉 ALL LOCAL SERVER INTEGRATION TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Verification failed:', err.data || err.message);
    process.exit(1);
  }
}

runVerification();
