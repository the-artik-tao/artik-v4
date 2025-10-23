import axios, { type AxiosInstance } from "axios";
import { ToolError } from "../errors.js";
import type { DmrOptions } from "../types.js";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  response_format?: { type: "json_object" };
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    total_tokens?: number;
  };
}

export class DmrClient {
  private client: AxiosInstance;
  private model: string;
  private temperature: number;

  constructor(options?: DmrOptions) {
    const baseUrl = options?.baseUrl || this.detectBaseUrl();
    this.model = options?.model || "ai/smollm2";
    this.temperature = options?.temperature ?? 0.2;

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 60000, // 60s timeout for LLM requests
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  private detectBaseUrl(): string {
    // Check if running in Docker (common env vars)
    if (process.env.DOCKER || process.env.KUBERNETES_SERVICE_HOST) {
      return "http://model-runner.docker.internal";
    }
    // Default to localhost
    return "http://localhost:12434";
  }

  async chatJSON<T = any>(
    messages: ChatMessage[],
    options?: { temperature?: number; model?: string }
  ): Promise<T> {
    const model = options?.model || this.model;
    const temperature = options?.temperature ?? this.temperature;

    const request: ChatCompletionRequest = {
      model,
      messages,
      temperature,
      response_format: { type: "json_object" },
    };

    try {
      const response = await this.client.post<ChatCompletionResponse>(
        "/engines/v1/chat/completions",
        request
      );

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new ToolError("DMR_RESPONSE_ERROR", "No content in DMR response");
      }

      // Try to parse as JSON
      try {
        return JSON.parse(content) as T;
      } catch {
        // Strip markdown code fences if present
        const stripped = content
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "");
        return JSON.parse(stripped) as T;
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNREFUSED") {
          throw new ToolError(
            "DMR_UNREACHABLE",
            `Cannot connect to DMR at ${this.client.defaults.baseURL}. Is DMR running?`,
            error
          );
        }
        throw new ToolError(
          "DMR_RESPONSE_ERROR",
          `DMR request failed: ${error.message}`,
          error
        );
      }
      throw error;
    }
  }

  async chat(
    messages: ChatMessage[],
    options?: { temperature?: number; model?: string }
  ): Promise<string> {
    const model = options?.model || this.model;
    const temperature = options?.temperature ?? this.temperature;

    const request: ChatCompletionRequest = {
      model,
      messages,
      temperature,
    };

    try {
      const response = await this.client.post<ChatCompletionResponse>(
        "/engines/v1/chat/completions",
        request
      );

      return response.data.choices[0]?.message?.content || "";
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNREFUSED") {
          throw new ToolError(
            "DMR_UNREACHABLE",
            `Cannot connect to DMR at ${this.client.defaults.baseURL}. Is DMR running?`,
            error
          );
        }
        throw new ToolError(
          "DMR_RESPONSE_ERROR",
          `DMR request failed: ${error.message}`,
          error
        );
      }
      throw error;
    }
  }
}
