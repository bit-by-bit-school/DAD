const { GoogleGenerativeAI } = require('@google/generative-ai');

async function generateCodeReviewDraft({ challengeTitle, language, code, previousReviews = [] }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return JSON.stringify({
      error: "GEMINI_API_KEY is not configured in server environment.",
      complexity: "N/A - Configure GEMINI_API_KEY in server/.env",
      readabilityScore: 0,
      clevernessScore: 0,
      summary: "Gemini API key missing. Manual review mode active.",
      strengths: ["Clean submission synced successfully."],
      edgeCases: "Configure GEMINI_API_KEY in server/.env to enable automated AI edge case auditing.",
      suggestions: ["Add GEMINI_API_KEY to server/.env for automated AI code reviews."],
      lineComments: [
        {
          startLine: 1,
          endLine: 2,
          type: "SUGGESTION",
          content: "[Demo AI Draft] Ensure edge cases (empty inputs or nulls) are handled explicitly at function entry."
        }
      ]
    });
  }

  const historyContext = previousReviews.length > 0
    ? `\nPrevious Review Rounds:\n${previousReviews.map(r => `Round ${r.roundNumber} (${r.status}): ${r.adminNotes}`).join('\n')}\n`
    : '';

  const prompt = `You are a senior algorithmic software engineer conducting a code review for a HackerRank solution.
Challenge: ${challengeTitle}
Language: ${language}
${historyContext}
Code (with line numbers 1..N):
\`\`\`${language}
${code.split('\n').map((line, idx) => `${idx + 1}: ${line}`).join('\n')}
\`\`\`

Provide a comprehensive, structured code review.
Format your output strictly as a JSON object with the following fields:
{
  "complexity": "Time and Space complexity analysis (e.g., Time: O(N log N), Space: O(1))",
  "readabilityScore": 4,
  "clevernessScore": 4,
  "summary": "Brief overall summary of the solution logic",
  "strengths": ["List of key strengths"],
  "edgeCases": "Analysis of potential edge cases or bugs",
  "suggestions": ["Actionable improvement suggestions"],
  "lineComments": [
    {
      "startLine": 1,
      "endLine": 3,
      "type": "SUGGESTION",
      "content": "Specific line-by-line feedback or improvement advice attached to this line range"
    }
  ]
}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    let text = result.response.text() || '';
    
    // sanitize JSON string if wrapped in markdown code fence
    const cleanedText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return cleanedText;
  } catch (err) {
    console.error("Gemini API Error:", err.message);
    return JSON.stringify({
      error: err.message,
      summary: "Failed to query Gemini API. Please check your API key.",
      complexity: "Unknown",
      readabilityScore: 0,
      clevernessScore: 0,
      suggestions: ["Check Gemini API Key and connectivity."]
    });
  }
}

module.exports = { generateCodeReviewDraft };
