import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { ToolError } from "../errors.js";
import { eventEmitter } from "../events.js";
import type { CoreConfig, GenerateServerOptions } from "../types.js";
import { createLogger } from "../utils/logger.js";

export async function generateMockServer(
  opts: GenerateServerOptions,
  cfg?: CoreConfig
): Promise<{ entryFile: string }> {
  const logger = createLogger(cfg?.logger);
  logger.log("info", "Generating mock server", { outDir: opts.outDir });

  try {
    // Ensure output directory exists
    await mkdir(opts.outDir, { recursive: true });

    const port = opts.port || 9000;
    const latency = opts.latencyMs || { min: 100, max: 300 };

    // Generate server code
    const serverCode = generateServerCode(opts.mockSpec, port, latency);
    const entryFile = join(opts.outDir, "index.js");
    await writeFile(entryFile, serverCode, "utf-8");

    // Generate package.json
    const packageJson = generatePackageJson();
    await writeFile(
      join(opts.outDir, "package.json"),
      JSON.stringify(packageJson, null, 2),
      "utf-8"
    );

    // Save mock spec
    await writeFile(
      join(opts.outDir, "mock-spec.json"),
      JSON.stringify(opts.mockSpec, null, 2),
      "utf-8"
    );

    logger.log("info", "Mock server generated successfully", { entryFile });
    eventEmitter.emit("mocks:written", { path: opts.outDir });

    return { entryFile };
  } catch (error) {
    throw new ToolError(
      "MOCK_GENERATION_FAIL",
      "Failed to generate mock server",
      error
    );
  }
}

function generateServerCode(
  mockSpec: any,
  port: number,
  latency: { min: number; max: number }
): string {
  return `import express from 'express';
import cors from 'cors';

const app = express();
const PORT = ${port};

// Middleware
app.use(cors());
app.use(express.json());

// Latency simulation
const simulateLatency = () => {
  const delay = Math.floor(Math.random() * (${latency.max} - ${latency.min} + 1)) + ${latency.min};
  return new Promise(resolve => setTimeout(resolve, delay));
};

// Mock spec (loaded from file)
const mockSpec = ${JSON.stringify(mockSpec, null, 2)};

// REST endpoints
${generateRestRoutes(mockSpec.rest)}

// GraphQL endpoint
if (mockSpec.graphql && mockSpec.graphql.length > 0) {
  const graphqlEndpoint = mockSpec.graphql[0]?.endpoint || '/graphql';
  
  app.post(graphqlEndpoint, async (req, res) => {
    await simulateLatency();
    
    const { operationName } = req.body;
    const operation = mockSpec.graphql.find(op => op.operationName === operationName);
    
    if (operation) {
      res.json(operation.exampleResponse);
    } else {
      res.status(404).json({ errors: [{ message: 'Operation not found' }] });
    }
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', mocks: mockSpec.rest.length + mockSpec.graphql.length });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Mock endpoint not found', path: req.path });
});

app.listen(PORT, () => {
  console.log(\`🚀 Mock server running on http://localhost:\${PORT}\`);
  console.log(\`📋 Serving \${mockSpec.rest.length} REST endpoints and \${mockSpec.graphql.length} GraphQL operations\`);
});
`;
}

function generateRestRoutes(restEndpoints: any[]): string {
  return restEndpoints
    .map((endpoint) => {
      const method = endpoint.method.toLowerCase();
      const path = convertPathToExpress(endpoint.path);
      const response = JSON.stringify(endpoint.exampleResponse);
      const status = endpoint.status || 200;

      return `app.${method}('${path}', async (req, res) => {
  await simulateLatency();
  console.log('${endpoint.method} ${endpoint.path}', { params: req.params, query: req.query });
  res.status(${status}).json(${response});
});
`;
    })
    .join("\n");
}

function convertPathToExpress(path: string): string {
  // Convert /:id style params to Express params
  // Also handle :param placeholders from template literals
  return path.replace(/:param/g, ":id");
}

function generatePackageJson(): any {
  return {
    name: "mock-server",
    version: "1.0.0",
    type: "module",
    private: true,
    scripts: {
      start: "node index.js",
    },
    dependencies: {
      express: "^4.18.2",
      cors: "^2.8.5",
    },
  };
}
