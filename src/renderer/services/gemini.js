import { GoogleGenerativeAI } from "@google/generative-ai";

const VALID_MODELS = [
  "gemini-3.1-flash-lite-preview",
  "gemini-3.1-pro-preview",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-exp",
  "gemini-2.0-pro-exp-02-05",
  "gemini-2.0-flash-thinking-exp-01-21",
  "gemini-1.5-pro",
  "gemini-1.5-flash"
];

const SYSTEM_PROMPT = `
You are an expert software engineer assistant for "System Core", an Electron-based desktop application.
The app is a "Blank Slate" that you help build and evolve.

GUIDELINES:
1. Provide code for FRONTEND (React) or BACKEND (Electron Main).
2. FRONTEND code MUST be a valid React component using "export default".
3. BACKEND code is eval'd in the Main process.
4. Use Tailwind CSS v4 for styling.
5. You have access to the CURRENT CODE of the application. Always base your modifications on this code.
6. When updating, provide the FULL file content for the file you are changing.

CODE BLOCK FORMATS:
- Frontend: \`\`\`javascript (or \`\`\`jsx)
- Backend: \`\`\`backend (or \`\`\`node)

Always be concise and prioritize sleek, modern UI.
`;

export const callGemini = async ({
  prompt,
  history,
  apiKey,
  preferredModel,
  onLog,
  currentCode = { frontend: '', backend: '' }
}) => {
  const fallbacks = Array.from(new Set([preferredModel, ...VALID_MODELS]));

  // Prepare current code context
  const contextMessage = `
CURRENT APPLICATION STATE:
--- FRONTEND (renderer.js) ---
${currentCode.frontend || '// Empty'}
--- BACKEND (backend.js) ---
${currentCode.backend || '// Empty'}
---
Use the above as your reference. When I ask for changes, modify this existing code.
  `;

  // Filter history to ensure it's clean for the SDK
  const formattedHistory = history.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  // Append context as a system-like message if history is empty,
  // or just before the latest prompt to ensure it's in context.
  const historyWithContext = [
    ...formattedHistory,
    { role: 'user', parts: [{ text: contextMessage }] },
    { role: 'model', parts: [{ text: "Understood. I have the current code context and will use it as the base for all modifications." }] }
  ];

  for (const modelName of fallbacks) {
    try {
      onLog(`Attempting ${modelName}...`);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM_PROMPT
      });

      const chat = model.startChat({
        history: historyWithContext,
        generationConfig: {
          maxOutputTokens: 8000,
        },
      });

      const result = await chat.sendMessage(prompt);
      const response = await result.response;
      const text = response.text();

      onLog(`Success with ${modelName}`);
      return text;
    } catch (error) {
      onLog(`Error with ${modelName}: ${error.message}`);
    }
  }

  throw new Error("All models failed. Please check your API key and connection.");
};

export const summarizeHistory = async (history, apiKey, modelName) => {
  if (history.length < 10) return null;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
      Summarize the following chat history between a user and an AI developer.
      Focus on the features built, architectural decisions made, and any specific user preferences.
      Keep the summary concise but informative enough to maintain context for future development.

      HISTORY:
      ${JSON.stringify(history)}
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error("Failed to summarize history:", err);
    return null;
  }
};
