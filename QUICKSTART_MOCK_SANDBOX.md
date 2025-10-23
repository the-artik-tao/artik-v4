# Mock Sandbox - Quick Start Guide

## What Was Built

A **production-ready, library-first toolkit** for React applications that:

1. Automatically discovers API calls in your codebase
2. Synthesizes realistic mock responses using AI (DMR)
3. Runs your app with mocks in an isolated sandbox

## Installation

```bash
# Install the core library
pnpm add @the-artik-tao/mock-sandbox-core

# Or install the CLI for testing
pnpm add -g @the-artik-tao/mock-sandbox-cli
```

## Quick Usage

### Option 1: Library (Recommended)

```typescript
import { runAll } from "@the-artik-tao/mock-sandbox-core";

// One-liner to get a fully mocked environment
const services = await runAll({
  cwd: "/path/to/your/react-app",
});

console.log("App:", services.appUrl); // http://localhost:5173
console.log("Mock:", services.mockUrl); // http://localhost:9000

// Stop when done
await services.stop();
```

### Option 2: CLI (For Testing)

```bash
# Terminal 1: Start Docker Model Runner (DMR)
docker run -p 12434:12434 model-runner

# Terminal 2: Run your app with mocks
cd /path/to/your/react-app
react-mock-sandbox

# Output will show:
# ✓ Detected vite project
# ✓ Discovered 5 REST endpoints
# ✓ Mock server generated
# 🎉 Sandbox running!
#   App:  http://localhost:5173
#   Mock: http://localhost:9000
```

## What Happens Under the Hood

1. **Detect**: Identifies your framework (Vite/CRA/Next/Remix), package manager, env vars
2. **Discover**: Scans code with AST parsing to find `fetch()` and `axios()` calls
3. **Synthesize**: Uses AI to generate realistic mock responses for each endpoint
4. **Generate**: Creates an Express mock server with your synthesized mocks
5. **Run**: Launches your app + mock server in Docker Compose (isolated from your project)

## Advanced Usage

### Step-by-Step Control

```typescript
import {
  detectProject,
  discoverAPIs,
  synthesizeMockSpec,
  generateMockServer,
  prepareSandbox,
  runSandbox,
} from "@the-artik-tao/mock-sandbox-core";

// 1. Detect project type
const project = await detectProject({ cwd: "./my-app" });

// 2. Find API calls
const discovery = await discoverAPIs(project);

// 3. Generate mocks with AI
const mockSpec = await synthesizeMockSpec({
  discovery,
  dmr: { model: "ai/smollm2" },
});

// 4. Create mock server
await generateMockServer({
  outDir: `${project.root}/.sandbox/mock-server`,
  mockSpec,
  port: 9000,
});

// 5. Prepare sandbox environment
const plan = await prepareSandbox({
  project,
  mockSpec,
  provider: "docker",
});

// 6. Start everything
const services = await runSandbox(plan);
```

### Custom Configuration

```typescript
const services = await runAll(
  {
    cwd: "./my-app",
    dmr: {
      baseUrl: "http://custom-dmr:12434",
      model: "ai/smollm2",
      temperature: 0.2,
    },
    ports: {
      app: 3000,
      mock: 8000,
    },
    provider: "docker", // or "none" for files only
  },
  {
    // Custom logger
    logger: {
      level: "debug",
      log: (level, msg, meta) => console.log(`[${level}]`, msg, meta),
    },
    // Add custom detectors
    detectors: [myCustomDetector],
    // Add custom framework providers
    frameworkProviders: [myCustomFramework],
  }
);
```

### Event Tracking

```typescript
import { onEvent } from "@the-artik-tao/mock-sandbox-core";

onEvent((event, payload) => {
  console.log(event, payload);
  // Events: "detected", "discovered", "dmr:request",
  //         "dmr:response", "mocks:written", "sandbox:up"
});
```

## Files Generated

All generated files go into `.sandbox/` (your project is never modified):

```
your-app/
├── .sandbox/
│   ├── mock-server/              # Express mock server
│   │   ├── index.js              # Server implementation
│   │   ├── package.json
│   │   └── mock-spec.json        # All mocks
│   ├── overlay/                  # Framework configs
│   │   └── vite.config.sandbox.ts
│   ├── docker-compose.sandbox.yml
│   └── state.json                # Runtime state
├── src/                          # Your code (untouched)
├── package.json                  # Your config (untouched)
└── ...
```

## Supported Frameworks

- ✅ **Vite** (full support)
- ⏳ CRA (post-MVP)
- ⏳ Next.js (post-MVP)
- ⏳ Remix (post-MVP)

## Requirements

- **Node.js**: ≥20.0.0
- **Docker**: Required for `provider: "docker"`
- **DMR**: Docker Model Runner at http://localhost:12434

```bash
# Start DMR locally
docker run -p 12434:12434 model-runner
```

## Plugin System

### Custom API Detector

```typescript
const myDetector: DetectorPlugin = {
  name: "my-api-detector",
  supports: (project) => true,
  discover: async (project, ctx) => {
    // Scan files, return discovered endpoints
    return {
      rest: [{ method: "GET", path: "/api/custom" }],
      graphql: [],
      baseUrls: ["/api"],
      notes: [],
    };
  },
};

await runAll({ cwd: "..." }, { detectors: [myDetector] });
```

### Custom Framework Provider

```typescript
const myFramework: FrameworkProviderPlugin = {
  name: "my-framework",
  writeOverlay: async (project, plan, discovery) => {
    // Write proxy config or other overlay files
    await writeFile(
      `${plan.workDir}/my-config.js`,
      `module.exports = { mockPort: ${plan.mockPort} }`
    );
  },
};
```

## Testing the Demo

```bash
cd /Users/vladislavshub/Development/home/artik-v3

# Build packages
pnpm install
pnpm --filter @the-artik-tao/mock-sandbox-core build
pnpm --filter @the-artik-tao/mock-sandbox-cli build

# Test with demo app
cd examples/vite-sandbox-demo
node ../../packages/mock-sandbox-cli/dist/index.js .
```

## Documentation

- **Core Library**: `packages/mock-sandbox-core/README.md`
- **CLI**: `packages/mock-sandbox-cli/README.md`
- **Examples**: `packages/mock-sandbox-core/examples/basic-usage.ts`
- **Implementation**: `MOCK_SANDBOX_IMPLEMENTATION.md`

## Key Features

- ✅ **Zero Mutations**: Original project never modified
- ✅ **AST-Based Discovery**: Finds fetch() and axios() calls
- ✅ **AI-Powered Mocks**: Uses DMR for realistic responses
- ✅ **Docker Isolation**: Runs in containers, not your host
- ✅ **Plugin Architecture**: Extensible detectors and providers
- ✅ **TypeScript**: Full type safety
- ✅ **Event System**: Track progress programmatically
- ✅ **Error Handling**: Rich error types with codes

## What's Next (Post-MVP)

- GraphQL detection
- Next.js / CRA / Remix support
- OpenAPI/Swagger file detection
- TypeScript type extraction
- React Query / SWR integration
- Edge proxy for absolute URLs

## Support

For issues or questions, see the READMEs in:

- `packages/mock-sandbox-core/`
- `packages/mock-sandbox-cli/`
