// Core configuration and options
export interface DetectOptions {
  cwd: string; // path to the React app root
}

export interface DetectedProject {
  root: string;
  framework: "vite" | "cra" | "next" | "remix" | "unknown";
  packageManager: "npm" | "pnpm" | "yarn" | "bun";
  scripts: Record<string, string>;
  env: Record<string, string | undefined>; // merged from .env*
}

// API discovery types
export interface RestEndpoint {
  method: string; // GET/POST/PUT/PATCH/DELETE
  path: string; // "/api/users/:id"
  query?: string[]; // ["includePosts"]
  headers?: Record<string, string>;
  exampleRequestBody?: any | null;
}

export interface GraphQLOperation {
  endpoint: string; // "/graphql"
  operationType: "query" | "mutation" | "subscription";
  operationName: string;
  document: string; // the gql source
  exampleVariables?: Record<string, any>;
}

export interface DiscoveryResult {
  rest: RestEndpoint[];
  graphql: GraphQLOperation[];
  baseUrls: string[]; // ["", "/api", "https://api.example.com"]
  notes: string[]; // diagnostics
}

// Mock generation types
export interface MockSpec {
  rest: Array<RestEndpoint & { status?: number; exampleResponse: any }>;
  graphql: Array<
    Pick<GraphQLOperation, "endpoint" | "operationType" | "operationName"> & {
      exampleVariables?: Record<string, any>;
      exampleResponse: any; // must match selection set
    }
  >;
  meta: { baseUrls: string[]; generatedAt: string; model: string };
}

// DMR integration
export interface DmrOptions {
  baseUrl?: string; // default: http://model-runner.docker.internal or http://localhost:12434
  model?: string; // default: "ai/smollm2"
  temperature?: number; // default: 0.2
}

export interface SynthesizeOptions {
  discovery: DiscoveryResult;
  dmr?: DmrOptions;
}

// Mock server generation
export interface GenerateServerOptions {
  outDir: string; // e.g., "<app>/.sandbox/mock-server"
  mockSpec: MockSpec;
  latencyMs?: { min: number; max: number }; // default 100..300
  port?: number; // default 9000
}

// Sandbox types
export interface SandboxPlan {
  appPort: number; // dev server port
  mockPort: number; // mock port
  workDir: string; // "<app>/.sandbox"
  composePath?: string; // path to docker-compose.sandbox.yml (if using docker provider)
  notes: string[]; // routing/proxy notes
}

export interface PrepareSandboxOptions {
  project: DetectedProject;
  mockSpec: MockSpec;
  ports?: { app?: number; mock?: number };
  provider?: "docker" | "none"; // default "docker"; "none" can still generate files
}

export interface RunningServices {
  provider: "docker" | "none";
  appUrl?: string; // e.g., http://localhost:5173
  mockUrl?: string; // e.g., http://localhost:9000
  stop: () => Promise<void>;
}

// Logging
export interface Logger {
  level?: "silent" | "error" | "warn" | "info" | "debug";
  log: (level: NonNullable<Logger["level"]>, msg: string, meta?: any) => void;
}

// Core configuration
export interface CoreConfig {
  logger?: Logger;
  // plugin points
  detectors?: DetectorPlugin[];
  frameworkProviders?: FrameworkProviderPlugin[];
  sandboxProvider?: SandboxProvider;
}

// Plugin interfaces
export interface DetectorPlugin {
  name: string;
  supports(project: DetectedProject): boolean;
  discover(
    project: DetectedProject,
    ctx: { logger: Logger }
  ): Promise<Partial<DiscoveryResult>>;
}

export interface FrameworkProviderPlugin {
  name: "vite" | "cra" | "next" | "remix" | string;
  // Writes overlay config to route API calls -> mock
  writeOverlay(
    project: DetectedProject,
    plan: SandboxPlan,
    discovery: DiscoveryResult
  ): Promise<void>;
}

export interface SandboxProvider {
  name: "docker" | "none" | string;
  prepare(
    project: DetectedProject,
    mockSpec: MockSpec,
    opts: { appPort: number; mockPort: number }
  ): Promise<SandboxPlan>;
  up(plan: SandboxPlan): Promise<RunningServices>;
}

// High-level orchestration
export interface RunAllOptions extends DetectOptions {
  dmr?: DmrOptions;
  ports?: { app?: number; mock?: number };
  provider?: "docker" | "none";
}

// Event types
export type EventType =
  | "detected"
  | "discovered"
  | "dmr:request"
  | "dmr:response"
  | "mocks:written"
  | "sandbox:up"
  | "sandbox:down";

export interface EventPayload {
  detected: DetectedProject;
  discovered: DiscoveryResult;
  "dmr:request": { endpoint: RestEndpoint | GraphQLOperation };
  "dmr:response": {
    endpoint: RestEndpoint | GraphQLOperation;
    tokens?: number;
  };
  "mocks:written": { path: string };
  "sandbox:up": { appUrl?: string; mockUrl?: string };
  "sandbox:down": {};
}
