# Mock Sandbox Library Implementation Summary

## Overview

A **library-first toolkit** for automatically discovering API calls in React applications, synthesizing realistic mock responses using Docker Model Runner (DMR), and running applications with mocks in isolated sandbox environments.

## Implementation Status: ✅ MVP Complete

### What Was Built

1. **Core Library** (`packages/mock-sandbox-core`) - Complete programmatic API
2. **CLI Wrapper** (`packages/mock-sandbox-cli`) - Minimal testing/demo tool
3. **Demo App** (`examples/vite-sandbox-demo`) - Vite + React test application
4. **Documentation** - Comprehensive READMEs and API docs

## Package Structure

```
artik-v3/
├── packages/
│   ├── mock-sandbox-core/          # Core library (MAIN DELIVERABLE)
│   │   ├── src/
│   │   │   ├── types.ts            # All TypeScript interfaces
│   │   │   ├── errors.ts           # Error handling
│   │   │   ├── events.ts           # Event system
│   │   │   ├── utils/
│   │   │   │   └── logger.ts       # Logging utilities
│   │   │   ├── detect/
│   │   │   │   └── index.ts        # Project detection
│   │   │   ├── discovery/
│   │   │   │   ├── index.ts        # Discovery orchestration
│   │   │   │   └── detectors/
│   │   │   │       ├── fetch.ts    # Fetch API detector (AST)
│   │   │   │       └── axios.ts    # Axios detector (AST)
│   │   │   ├── dmr/
│   │   │   │   └── client.ts       # DMR API client
│   │   │   ├── synthesize/
│   │   │   │   └── index.ts        # Mock synthesis via DMR
│   │   │   ├── generate/
│   │   │   │   └── mock-server.ts  # Express server generation
│   │   │   ├── sandbox/
│   │   │   │   ├── index.ts        # Sandbox orchestration
│   │   │   │   ├── frameworks/
│   │   │   │   │   └── vite.ts     # Vite proxy config
│   │   │   │   └── providers/
│   │   │   │       ├── docker.ts   # Docker Compose provider
│   │   │   │       └── none.ts     # No-op provider
│   │   │   └── index.ts            # Public API exports
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   └── mock-sandbox-cli/           # CLI (for testing only)
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── README.md
│
└── examples/
    └── vite-sandbox-demo/          # Test application
        ├── src/
        │   └── App.tsx             # Includes REST API calls
        └── package.json
```

## Core Features Implemented

### ✅ 1. Project Detection

```typescript
const project = await detectProject({ cwd: "/path/to/app" });
```

- Automatically detects framework (Vite, CRA, Next, Remix, unknown)
- Identifies package manager (npm, pnpm, yarn, bun)
- Parses scripts from package.json
- Merges environment variables from .env\* files
- Respects framework conventions (VITE*\*, NEXT_PUBLIC*_, REACT*APP*_)

### ✅ 2. API Discovery (AST-Based)

```typescript
const discovery = await discoverAPIs(project);
```

**Detectors:**

- **Fetch Detector**: Finds `fetch()` calls using Babel AST parsing
  - Supports string literals and template literals
  - Tracks env variables (process.env._, import.meta.env._)
  - Extracts methods, headers, request bodies
- **Axios Detector**: Finds axios calls
  - Detects `axios()`, `axios.get/post/etc`
  - Tracks `axios.create()` instances with baseURL
  - Extracts interceptors and configs

**Discovery Result:**

```typescript
{
  rest: [
    { method: "GET", path: "/api/users", headers: {...} },
    { method: "POST", path: "/api/posts", exampleRequestBody: {...} }
  ],
  graphql: [],
  baseUrls: ["/api"],
  notes: []
}
```

### ✅ 3. Mock Synthesis via DMR

```typescript
const mockSpec = await synthesizeMockSpec({
  discovery,
  dmr: { model: "ai/smollm2", temperature: 0.2 },
});
```

**DMR Integration:**

- OpenAI-compatible chat completions endpoint
- Default model: `ai/smollm2`
- Low temperature (0.2) for consistent responses
- JSON-only outputs with automatic fence stripping
- Intelligent prompting based on endpoint patterns:
  - `/users` → user data structure
  - `/posts` → post data structure
  - GET/:id → single resource
  - GET → resource array
  - POST → created resource with id
  - DELETE → success confirmation

**Fallback:** If DMR is unavailable, generates basic mock responses

### ✅ 4. Mock Server Generation

```typescript
await generateMockServer({
  outDir: `${project.root}/.sandbox/mock-server`,
  mockSpec,
  port: 9000,
  latencyMs: { min: 100, max: 300 },
});
```

**Generated Server:**

- Express + CORS + body-parser
- REST endpoints with parameterized routing
- GraphQL endpoint (operation name matching)
- Latency simulation (100-300ms default)
- Health check endpoint
- 404 handler
- Includes package.json for easy deployment

### ✅ 5. Sandbox Orchestration

```typescript
const plan = await prepareSandbox({
  project,
  mockSpec,
  ports: { app: 5173, mock: 9000 },
  provider: "docker",
});

const services = await runSandbox(plan);
// { appUrl: "http://localhost:5173", mockUrl: "http://localhost:9000", stop: async () => {} }
```

**Docker Provider:**

- Generates `docker-compose.sandbox.yml`
- Two services: `app` (React) and `mock` (Node)
- Volume mounts (preserves original project)
- Environment variable injection
- Framework-specific dev commands

**Vite Framework Provider:**

- Generates `vite.config.sandbox.ts`
- Configures `server.proxy` for API routing
- Routes discovered base paths to mock server

**Files Generated (in `.sandbox/`):**

```
.sandbox/
├── mock-server/
│   ├── index.js              # Express server
│   ├── package.json
│   └── mock-spec.json        # Full mock specification
├── overlay/
│   └── vite.config.sandbox.ts
├── docker-compose.sandbox.yml
└── state.json                # Runtime state
```

### ✅ 6. High-Level API

```typescript
// One-liner: Full orchestration
const services = await runAll({
  cwd: "/path/to/app",
  dmr: { model: "ai/smollm2" },
  ports: { app: 5173, mock: 9000 },
  provider: "docker",
});

console.log(services.appUrl); // http://localhost:5173
console.log(services.mockUrl); // http://localhost:9000

await services.stop();
```

### ✅ 7. Event System

```typescript
const unsubscribe = onEvent((event, payload) => {
  console.log(event, payload);
  // "detected", "discovered", "dmr:request", "dmr:response",
  // "mocks:written", "sandbox:up", "sandbox:down"
});
```

### ✅ 8. Plugin Architecture

**Custom Detectors:**

```typescript
const myDetector: DetectorPlugin = {
  name: "my-api",
  supports: (project) => true,
  discover: async (project, ctx) => ({
    rest: [{ method: "GET", path: "/custom" }],
    graphql: [],
    baseUrls: [],
    notes: [],
  }),
};

await runAll({ cwd: "..." }, { detectors: [myDetector] });
```

**Custom Framework Providers:**

```typescript
const myFramework: FrameworkProviderPlugin = {
  name: "my-framework",
  writeOverlay: async (project, plan, discovery) => {
    // Write proxy configs or other overlay files
  },
};
```

**Custom Sandbox Providers:**

```typescript
const myProvider: SandboxProvider = {
  name: "kubernetes",
  prepare: async (project, mockSpec, opts) => ({...}),
  up: async (plan) => ({...})
};
```

### ✅ 9. Error Handling

```typescript
try {
  await runAll({ cwd: "/path" });
} catch (error) {
  if (error instanceof ToolError) {
    console.error(`[${error.code}] ${error.message}`);
    // Codes: DETECT_FAIL, DISCOVERY_FAIL, DMR_UNREACHABLE,
    //        DMR_RESPONSE_ERROR, SANDBOX_FAIL, etc.
  }
}
```

### ✅ 10. CLI (Minimal)

```bash
# Install
pnpm add -g @the-artik-tao/mock-sandbox-cli

# Run
react-mock-sandbox /path/to/app --port 3000 --mock-port 8000
react-mock-sandbox down
```

## Usage Examples

### Library Usage (Recommended)

```typescript
import { runAll } from "@the-artik-tao/mock-sandbox-core";

// Simple
const services = await runAll({ cwd: "./my-app" });

// Advanced
const services = await runAll(
  {
    cwd: "./my-app",
    dmr: {
      baseUrl: "http://custom-dmr:12434",
      model: "ai/smollm2",
      temperature: 0.2,
    },
    ports: { app: 3000, mock: 8000 },
    provider: "docker", // or "none"
  },
  {
    logger: { level: "debug", log: (lvl, msg) => console.log(msg) },
    detectors: [customDetector],
    frameworkProviders: [customFramework],
  }
);

// Use services
await fetch(`${services.mockUrl}/api/users`);

// Stop
await services.stop();
```

### Step-by-Step Usage

```typescript
import {
  detectProject,
  discoverAPIs,
  synthesizeMockSpec,
  generateMockServer,
  prepareSandbox,
  runSandbox,
} from "@the-artik-tao/mock-sandbox-core";

const project = await detectProject({ cwd: "./app" });
const discovery = await discoverAPIs(project);
const mockSpec = await synthesizeMockSpec({ discovery });

await generateMockServer({
  outDir: `${project.root}/.sandbox/mock-server`,
  mockSpec,
  port: 9000,
});

const plan = await prepareSandbox({
  project,
  mockSpec,
  provider: "docker",
});

const services = await runSandbox(plan);
```

## Requirements

- **Node.js**: ≥20.0.0
- **Docker**: Required for `provider: "docker"`
- **DMR**: Docker Model Runner at http://localhost:12434

```bash
# Start DMR
docker run -p 12434:12434 model-runner
```

## Testing the Implementation

### 1. Build Packages

```bash
cd /Users/vladislavshub/Development/home/artik-v3
pnpm install
pnpm --filter @the-artik-tao/mock-sandbox-core build
pnpm --filter @the-artik-tao/mock-sandbox-cli build
```

### 2. Test with Demo App

```bash
# Terminal 1: Start DMR
docker run -p 12434:12434 model-runner

# Terminal 2: Run sandbox
cd examples/vite-sandbox-demo
node ../../packages/mock-sandbox-cli/dist/index.js .
```

### 3. Programmatic Test

```typescript
import { runAll } from "@the-artik-tao/mock-sandbox-core";

const services = await runAll({
  cwd: "/Users/vladislavshub/Development/home/artik-v3/examples/vite-sandbox-demo",
});

console.log("App:", services.appUrl);
console.log("Mock:", services.mockUrl);
```

## What's NOT in MVP (Future Work)

- ❌ GraphQL detector (only REST in MVP)
- ❌ CRA framework provider
- ❌ Next.js framework provider
- ❌ Remix framework provider
- ❌ OpenAPI/Swagger file detection
- ❌ TypeScript type extraction for schemas
- ❌ Zod/Valibot schema parsing
- ❌ Edge proxy for absolute host routing
- ❌ Comprehensive E2E test suite
- ❌ React Query detector
- ❌ SWR detector

## Key Design Decisions

1. **Library-First**: Core is a library, CLI is just a thin wrapper
2. **Zero Mutations**: Original project never modified (all files in `.sandbox/`)
3. **AST Parsing**: Uses Babel for robust code analysis
4. **Plugin Architecture**: Extensible detectors and providers
5. **Docker Default**: Uses Docker Compose for isolation
6. **DMR Integration**: Leverages OpenAI-compatible API
7. **ESM Only**: Modern module system (NodeNext)
8. **Type Safe**: Full TypeScript with exported types

## Integration with Existing artik-v3

- Follows monorepo patterns (pnpm workspaces)
- Uses existing TypeScript config (`tsconfig.base.json`)
- Scoped under `@the-artik-tao/` namespace
- Compatible with existing tooling (prettier, eslint)

## Documentation

- ✅ Core README with full API reference
- ✅ CLI README with usage examples
- ✅ TypeScript types exported for IDE support
- ✅ Inline JSDoc comments on public functions
- ✅ Error handling examples
- ✅ Plugin development examples

## Summary

**This implementation delivers a production-ready, library-first toolkit** that can be:

- Used programmatically in other tools
- Extended via plugins
- Integrated into CI/CD pipelines
- Used standalone via CLI

The MVP focuses on Vite + REST with solid foundations for future expansion to other frameworks and GraphQL support.
