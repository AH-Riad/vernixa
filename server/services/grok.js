import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// =========================
// GROQ AI HELPER (FREE)
// =========================
export const groqChat = async (prompt, maxTokens = 500) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("Missing GROQ_API_KEY");
    }

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    });

    return response.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.error("Groq API error:", error.message);
    throw new Error("AI generation failed");
  }
};
