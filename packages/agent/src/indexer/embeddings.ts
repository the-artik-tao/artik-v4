import { ComponentInfo, EmbeddingOptions } from "./types.js";

/**
 * Generate vector embedding for text using Docker Model Runner
 */
async function generateEmbedding(
  text: string,
  options: EmbeddingOptions
): Promise<number[]> {
  const response = await fetch(`${options.baseURL}/engines/v1/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: options.model,
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Embedding API error: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as {
    data: Array<{ embedding: number[] }>;
  };
  return data.data[0].embedding; // Vector of numbers
}

/**
 * Generate embedding for a component
 * Creates rich text representation for better semantic understanding
 */
export async function generateComponentEmbedding(
  component: ComponentInfo,
  options?: Partial<EmbeddingOptions>
): Promise<number[]> {
  // Create rich text representation for embedding
  const text = `
Component: ${component.name}
File: ${component.filePath}
Props: ${component.props.map((p) => p.name).join(", ")}
JSX Structure: ${component.jsxStructure}
Imports: ${component.imports.join(", ")}
  `.trim();

  const embeddingOptions: EmbeddingOptions = {
    baseURL: options?.baseURL || "http://localhost:12434",
    model: options?.model || "ai/smollm2",
  };

  return await generateEmbedding(text, embeddingOptions);
}

/**
 * Generate component embedding with retry logic
 * Retries up to maxRetries times with exponential backoff
 */
export async function generateComponentEmbeddingWithRetry(
  component: ComponentInfo,
  maxRetries: number = 3,
  options?: Partial<EmbeddingOptions>
): Promise<number[]> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generateComponentEmbedding(component, options);
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.warn(
          `⚠️  Embedding failed for ${component.name} (attempt ${attempt}/${maxRetries}), ` +
            `retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `Failed to generate embedding for ${component.name} after ${maxRetries} attempts: ${lastError?.message}`
  );
}

/**
 * Generate embedding for a text query (for search)
 */
export async function generateQueryEmbedding(
  query: string,
  options?: Partial<EmbeddingOptions>
): Promise<number[]> {
  const embeddingOptions: EmbeddingOptions = {
    baseURL: options?.baseURL || "http://localhost:12434",
    model: options?.model || "ai/smollm2",
  };

  return await generateEmbedding(query, embeddingOptions);
}

