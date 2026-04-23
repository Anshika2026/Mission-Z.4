const GEMINI_API_KEY = "API KEY HERE";

async function askGemini(userQuery, questionObj) {
  const prompt = `
You are a UPSC tutor.

Question: ${questionObj.question}

User doubt: ${userQuery}

Give:
- Direct answer
- Brief explanation (2-4 lines max)
- No unnecessary text
`;

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
      GEMINI_API_KEY,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    },
  );

  const data = await res.json();

  return data.candidates[0].content.parts[0].text;
}
