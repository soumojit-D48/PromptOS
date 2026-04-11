import { createOpenAI } from "@ai-sdk/openai";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
    "X-Title": "PromptOS",
  },
});

export function getModel(modelId: string) {
  return openrouter(modelId);
}