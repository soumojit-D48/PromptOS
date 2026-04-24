import { getModel } from "./openrouter";
import { streamText } from "ai";

interface RunPromptParams {
  content: string;
  variables: Record<string, string>;
  model: string;
  params: {
    temperature: number;
    maxTokens: number;
    systemPrompt?: string;
  };
}

export async function runPrompt({
  content,
  variables,
  model,
  params,
}: RunPromptParams) {
  const startTime = Date.now();

  let interpolatedContent = content;
  for (const [key, value] of Object.entries(variables)) {
    interpolatedContent = interpolatedContent.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }

  const modelInstance = getModel(model);

  const messages: { role: "system" | "user"; content: string }[] = [];
  if (params.systemPrompt) {
    messages.push({ role: "system", content: params.systemPrompt });
  }
  messages.push({ role: "user", content: interpolatedContent });

  const result = streamText({
    model: modelInstance,
    messages,
  });

  console.log("DEBUG runPrompt: waiting for AI response...");
        const output = await result.text;
        const usage = await result.usage;
        console.log("DEBUG runPrompt: got response, length:", output?.length);
  const latencyMs = Date.now() - startTime;
  
  const tokensIn = usage?.inputTokens ?? 0;
  const tokensOut = usage?.outputTokens ?? 0;

  return {
    output,
    latencyMs,
    tokensIn,
    tokensOut,
  };
}