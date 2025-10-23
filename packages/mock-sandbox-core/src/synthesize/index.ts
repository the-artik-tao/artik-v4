import { DmrClient } from "../dmr/client.js";
import { eventEmitter } from "../events.js";
import type { CoreConfig, MockSpec, SynthesizeOptions } from "../types.js";
import { createLogger } from "../utils/logger.js";

export async function synthesizeMockSpec(
  opts: SynthesizeOptions,
  cfg?: CoreConfig
): Promise<MockSpec> {
  const logger = createLogger(cfg?.logger);
  logger.log("info", "Starting mock spec synthesis");

  const dmrClient = new DmrClient(opts.dmr);
  const mockSpec: MockSpec = {
    rest: [],
    graphql: [],
    meta: {
      baseUrls: opts.discovery.baseUrls,
      generatedAt: new Date().toISOString(),
      model: opts.dmr?.model || "ai/smollm2",
    },
  };

  // Synthesize REST endpoints
  for (const endpoint of opts.discovery.rest) {
    logger.log(
      "debug",
      `Synthesizing mock for ${endpoint.method} ${endpoint.path}`
    );
    eventEmitter.emit("dmr:request", { endpoint });

    try {
      const response = await synthesizeRestResponse(endpoint, dmrClient);
      mockSpec.rest.push({
        ...endpoint,
        status: 200,
        exampleResponse: response,
      });

      eventEmitter.emit("dmr:response", { endpoint });
    } catch (error) {
      logger.log(
        "warn",
        `Failed to synthesize ${endpoint.method} ${endpoint.path}`,
        {
          error,
        }
      );
      // Add a fallback response
      mockSpec.rest.push({
        ...endpoint,
        status: 200,
        exampleResponse: getFallbackResponse(endpoint),
      });
    }
  }

  // Synthesize GraphQL operations
  for (const operation of opts.discovery.graphql) {
    logger.log(
      "debug",
      `Synthesizing mock for GraphQL ${operation.operationType} ${operation.operationName}`
    );
    eventEmitter.emit("dmr:request", { endpoint: operation });

    try {
      const response = await synthesizeGraphQLResponse(operation, dmrClient);
      mockSpec.graphql.push({
        endpoint: operation.endpoint,
        operationType: operation.operationType,
        operationName: operation.operationName,
        exampleVariables: operation.exampleVariables,
        exampleResponse: response,
      });

      eventEmitter.emit("dmr:response", { endpoint: operation });
    } catch (error) {
      logger.log(
        "warn",
        `Failed to synthesize GraphQL ${operation.operationName}`,
        { error }
      );
      // Add a fallback response
      mockSpec.graphql.push({
        endpoint: operation.endpoint,
        operationType: operation.operationType,
        operationName: operation.operationName,
        exampleVariables: operation.exampleVariables,
        exampleResponse: { data: {} },
      });
    }
  }

  logger.log("info", "Mock spec synthesis complete", {
    restCount: mockSpec.rest.length,
    graphqlCount: mockSpec.graphql.length,
  });

  return mockSpec;
}

async function synthesizeRestResponse(
  endpoint: any,
  dmrClient: DmrClient
): Promise<any> {
  const prompt = buildRestPrompt(endpoint);

  const response = await dmrClient.chatJSON([
    {
      role: "system",
      content:
        "You are an API mock data generator. Generate realistic, happy-path JSON responses for REST endpoints. Always respond with valid JSON only.",
    },
    {
      role: "user",
      content: prompt,
    },
  ]);

  return response;
}

async function synthesizeGraphQLResponse(
  operation: any,
  dmrClient: DmrClient
): Promise<any> {
  const prompt = buildGraphQLPrompt(operation);

  const response = await dmrClient.chatJSON([
    {
      role: "system",
      content:
        "You are a GraphQL mock data generator. Generate realistic GraphQL responses matching the query's selection set. Always respond with valid JSON in the format { data: {...} }.",
    },
    {
      role: "user",
      content: prompt,
    },
  ]);

  return response;
}

function buildRestPrompt(endpoint: any): string {
  let prompt = `Generate a realistic mock response for a ${endpoint.method} request to ${endpoint.path}.\n`;

  if (endpoint.query && endpoint.query.length > 0) {
    prompt += `Query parameters: ${endpoint.query.join(", ")}\n`;
  }

  if (endpoint.exampleRequestBody) {
    prompt += `Request body example: ${JSON.stringify(endpoint.exampleRequestBody)}\n`;
  }

  // Infer response structure from path
  if (endpoint.path.includes("/users") || endpoint.path.includes("/user")) {
    prompt += "Response should include user data (id, name, email, etc.).\n";
  } else if (
    endpoint.path.includes("/posts") ||
    endpoint.path.includes("/post")
  ) {
    prompt +=
      "Response should include post data (id, title, content, author, etc.).\n";
  } else if (
    endpoint.path.includes("/products") ||
    endpoint.path.includes("/product")
  ) {
    prompt +=
      "Response should include product data (id, name, price, description, etc.).\n";
  }

  // Handle collection vs single resource
  if (endpoint.path.includes("/:") && endpoint.method === "GET") {
    prompt += "Return a single resource object.\n";
  } else if (endpoint.method === "GET" && !endpoint.path.includes("/:")) {
    prompt += "Return an array of resources.\n";
  } else if (endpoint.method === "POST") {
    prompt += "Return the created resource with an id.\n";
  } else if (endpoint.method === "PUT" || endpoint.method === "PATCH") {
    prompt += "Return the updated resource.\n";
  } else if (endpoint.method === "DELETE") {
    prompt += "Return a success confirmation.\n";
  }

  prompt += "\nRespond with JSON only, no markdown.";
  return prompt;
}

function buildGraphQLPrompt(operation: any): string {
  let prompt = `Generate a realistic mock response for this GraphQL ${operation.operationType}:\n\n`;
  prompt += `Operation name: ${operation.operationName}\n`;
  prompt += `Query:\n${operation.document}\n\n`;

  if (operation.exampleVariables) {
    prompt += `Variables: ${JSON.stringify(operation.exampleVariables)}\n\n`;
  }

  prompt += "Generate a response that matches the query's selection set. ";
  prompt += 'Respond with JSON in the format { "data": {...} }, no markdown.';

  return prompt;
}

function getFallbackResponse(endpoint: any): any {
  // Simple fallback based on method
  if (endpoint.method === "GET") {
    if (endpoint.path.includes("/:")) {
      return { id: "1", message: "Mock response" };
    }
    return [{ id: "1", message: "Mock response" }];
  }

  if (endpoint.method === "POST") {
    return { id: "1", message: "Resource created" };
  }

  if (endpoint.method === "PUT" || endpoint.method === "PATCH") {
    return { id: "1", message: "Resource updated" };
  }

  if (endpoint.method === "DELETE") {
    return { success: true, message: "Resource deleted" };
  }

  return { message: "Mock response" };
}
