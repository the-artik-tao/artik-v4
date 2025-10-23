# @the-artik-tao/mock-sandbox-core

A **library-first toolkit** for discovering API calls in React applications, synthesizing mock responses via Docker Model Runner (DMR), and running the application with mocks in a sandboxed environment.

## Features

- 🔍 **Automatic API Discovery**: Scans your React codebase and detects REST and GraphQL API calls
- 🤖 **AI-Powered Mock Generation**: Uses DMR (Docker Model Runner) to synthesize realistic mock responses
- 📦 **Sandbox Isolation**: Runs your app + mocks in Docker Compose, leaving your original project untouched
- 🔌 **Plugin Architecture**: Extensible detectors, framework providers, and sandbox providers
- 📚 **Library-First**: Use programmatically in your own tools and workflows

## Installation

```bash
npm install @the-artik-tao/mock-sandbox-core
# or
pnpm add @the-artik-tao/mock-sandbox-core
```

## Quick Start

### High-Level API (runAll)

```typescript
import { runAll } from "@the-artik-tao/mock-sandbox-core";

const services = await runAll({
  cwd: "/path/to/react-app",
  dmr: { model: "ai/smollm2" },
  ports: { app: 5173, mock: 9000 },
  provider: "docker",
});

console.log(`App running at: ${services.appUrl}`);
console.log(`Mock API at: ${services.mockUrl}`);

// Later, stop the services
await services.stop();
```

### Step-by-Step API

For more control, use the individual functions:

```typescript
import {
  detectProject,
  discoverAPIs,
  synthesizeMockSpec,
  generateMockServer,
  prepareSandbox,
  runSandbox,
} from "@the-artik-tao/mock-sandbox-core";

// 1. Detect project type and configuration
const project = await detectProject({ cwd: "/path/to/react-app" });
console.log(`Detected ${project.framework} with ${project.packageManager}`);

// 2. Discover API calls
const discovery = await discoverAPIs(project);
console.log(`Found ${discovery.rest.length} REST endpoints`);

// 3. Synthesize mocks via DMR
const mockSpec = await synthesizeMockSpec({
  discovery,
  dmr: { model: "ai/smollm2" },
});

// 4. Generate mock server
await generateMockServer({
  outDir: `${project.root}/.sandbox/mock-server`,
  mockSpec,
  port: 9000,
});

// 5. Prepare sandbox
const plan = await prepareSandbox({
  project,
  mockSpec,
  ports: { app: 5173, mock: 9000 },
  provider: "docker",
});

// 6. Run sandbox
const services = await runSandbox(plan);

// Later
await services.stop();
```

## API Reference

### Core Functions

#### `detectProject(opts: DetectOptions, cfg?: CoreConfig): Promise<DetectedProject>`

Detects the React project type, package manager, scripts, and environment variables.

#### `discoverAPIs(project: DetectedProject, cfg?: CoreConfig): Promise<DiscoveryResult>`

Discovers REST and GraphQL API calls in the project using AST parsing.

#### `synthesizeMockSpec(opts: SynthesizeOptions, cfg?: CoreConfig): Promise<MockSpec>`

Synthesizes mock responses for discovered endpoints using DMR.

#### `generateMockServer(opts: GenerateServerOptions, cfg?: CoreConfig): Promise<{ entryFile: string }>`

Generates an Express mock server with the synthesized mocks.

#### `prepareSandbox(opts: PrepareSandboxOptions, cfg?: CoreConfig): Promise<SandboxPlan>`

Prepares the sandbox environment (Docker Compose, proxy configs, etc.).

#### `runSandbox(plan: SandboxPlan, cfg?: CoreConfig): Promise<RunningServices>`

Starts the sandbox and returns running service URLs + stop function.

#### `runAll(opts: RunAllOptions, cfg?: CoreConfig): Promise<RunningServices>`

Convenience function that orchestrates the entire flow.

### Event System

Subscribe to events for progress tracking:

```typescript
import { onEvent } from "@the-artik-tao/mock-sandbox-core";

const unsubscribe = onEvent((event, payload) => {
  if (event === "detected") {
    console.log(`Detected ${payload.framework}`);
  } else if (event === "discovered") {
    console.log(`Found ${payload.rest.length} endpoints`);
  } else if (event === "sandbox:up") {
    console.log(`App: ${payload.appUrl}`);
  }
});

// Later
unsubscribe();
```

Events: `detected`, `discovered`, `dmr:request`, `dmr:response`, `mocks:written`, `sandbox:up`, `sandbox:down`

### Configuration

```typescript
import type { CoreConfig, Logger } from "@the-artik-tao/mock-sandbox-core";

const config: CoreConfig = {
  logger: {
    level: "debug",
    log: (level, msg, meta) => console.log(`[${level}] ${msg}`, meta),
  },
  detectors: [/* custom detectors */],
  frameworkProviders: [/* custom framework providers */],
  sandboxProvider: /* custom sandbox provider */,
};
```

## DMR Setup

This library requires [Docker Model Runner (DMR)](https://github.com/docker/model-runner) to synthesize mock responses.

```bash
# Run DMR locally
docker run -p 12434:12434 model-runner

# Or use a custom DMR endpoint
await runAll({
  cwd: "/path/to/app",
  dmr: {
    baseUrl: "http://custom-dmr-host:12434",
    model: "ai/smollm2",
    temperature: 0.2,
  },
});
```

Inside Docker containers, DMR is accessible at `http://model-runner.docker.internal`.

## Supported Frameworks

- ✅ **Vite** (built-in support)
- ⏳ **Create React App** (post-MVP)
- ⏳ **Next.js** (post-MVP)
- ⏳ **Remix** (post-MVP)

## Plugin Architecture

### Custom Detectors

```typescript
import type { DetectorPlugin } from "@the-artik-tao/mock-sandbox-core";

const myDetector: DetectorPlugin = {
  name: "my-detector",
  supports: (project) => true,
  discover: async (project, ctx) => {
    // Scan files, return discovered endpoints
    return {
      rest: [{ method: "GET", path: "/custom" }],
      graphql: [],
      baseUrls: [],
      notes: [],
    };
  },
};

await runAll({ cwd: "..." }, { detectors: [myDetector] });
```

### Custom Framework Providers

```typescript
import type { FrameworkProviderPlugin } from "@the-artik-tao/mock-sandbox-core";

const myFramework: FrameworkProviderPlugin = {
  name: "my-framework",
  writeOverlay: async (project, plan, discovery) => {
    // Write proxy config or other overlay files
  },
};

await runAll({ cwd: "..." }, { frameworkProviders: [myFramework] });
```

## File Structure

All generated files live under `.sandbox/` in your project:

```
your-react-app/
├── .sandbox/
│   ├── mock-server/          # Generated Express mock server
│   │   ├── index.js
│   │   ├── package.json
│   │   └── mock-spec.json
│   ├── overlay/              # Framework-specific configs
│   │   └── vite.config.sandbox.ts
│   ├── docker-compose.sandbox.yml
│   └── state.json            # Runtime state
├── src/
├── package.json
└── ...
```

Your original project files are **never modified**.

## Error Handling

```typescript
import { ToolError } from "@the-artik-tao/mock-sandbox-core";

try {
  await runAll({ cwd: "/path/to/app" });
} catch (error) {
  if (error instanceof ToolError) {
    console.error(`Error [${error.code}]: ${error.message}`);
    // error.cause contains the original error
  }
}
```

Error codes: `DETECT_FAIL`, `DISCOVERY_FAIL`, `DMR_UNREACHABLE`, `DMR_RESPONSE_ERROR`, `SANDBOX_FAIL`, `MOCK_GENERATION_FAIL`, `FILE_WRITE_ERROR`, `INVALID_CONFIG`

## TypeScript

Full TypeScript support with exported types:

```typescript
import type {
  DetectedProject,
  DiscoveryResult,
  MockSpec,
  SandboxPlan,
  RunningServices,
  RestEndpoint,
  GraphQLOperation,
} from "@the-artik-tao/mock-sandbox-core";
```

## License

MIT

## Contributing

Contributions welcome! This is an MVP with room for expansion (Next.js, CRA, Remix support, GraphQL detection, etc.).
