import { ChatOpenAI } from "@langchain/openai";

export interface LLMConfig {
  baseURL?: string;
  apiKey?: string;
  model?: string;
  temperature?: number;
}

export function createLLM(config?: LLMConfig) {
  const baseURL =
    config?.baseURL ||
    process.env.OPENAI_BASE_URL ||
    "http://localhost:12434/engines/v1";
  const apiKey = config?.apiKey || process.env.OPENAI_API_KEY || "not-needed";
  const model = config?.model || process.env.OPENAI_MODEL || "ai/smollm2";

  return new ChatOpenAI({
    openAIApiKey: apiKey,
    configuration: {
      baseURL,
    },
    modelName: model,
    temperature: config?.temperature ?? 0.2,
  });
}
