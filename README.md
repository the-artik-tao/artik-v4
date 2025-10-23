# Artik v4 — AI-Powered Development Platform

An intelligent development platform that combines automated API mocking, code intelligence, and AI-driven UI/UX modifications for React/Next.js projects. Features automatic API discovery, mock data generation, project indexing with semantic search, and LLM-powered code modifications.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Tauri Desktop Shell                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Next.js Web UI                           │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │  │
│  │  │   Project    │  │   Preview    │  │    Diff    │  │  │
│  │  │   Loader     │  │    Pane      │  │   Center   │  │  │
│  │  └──────────────┘  └──────────────┘  └────────────┘  │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │          Agent Console & Trace Viewer            │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│              LangGraph Agent Orchestrator                    │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Planner  │→ │ CodeModder │→ │Previewer │→ │ Exporter │  │
│  └──────────┘  └────────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                   MCP Tool Servers                           │
│  ┌──────────┐  ┌──────────┐  ┌─────────────────┐           │
│  │   Git    │  │  TS-AST  │  │ Package Manager │           │
│  └──────────┘  └──────────┘  └─────────────────┘           │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│           LLM (Docker Model Runner / OpenAI)                 │
│           http://localhost:12434/engines/v1                  │
└─────────────────────────────────────────────────────────────┘
```

## Features

### 🎯 Mock Sandbox System

- **Automatic API Discovery**: AST-based detection of fetch/axios calls in React apps
- **AI-Powered Mock Generation**: Synthesize realistic mock data using Docker Model Runner
- **Isolated Sandbox Environment**: Run apps with mocks in Docker containers
- **Zero Configuration**: Works out-of-the-box with Vite, CRA, Next.js, and Remix
- **Plugin Architecture**: Extensible detectors and sandbox providers

### 🧠 Intelligent Code Analysis

- **Project Indexing**: Scan and parse React/TypeScript codebases with AST analysis
- **Semantic Search**: Vector embeddings for component discovery
- **Incremental Updates**: Smart caching with file modification tracking
- **Component Registry**: O(1) lookups with metadata (props, JSX structure, imports)

### 🤖 AI Agent System

- **LLM Integration**: Compatible with Docker Model Runner or OpenAI
- **Pattern Matching**: Fast code modifications for common operations
- **MCP Tool Integration**: Git, TypeScript AST, and package management tools
- **Multi-Step Planning**: Planner → CodeModder → Previewer workflow

### 🎨 UI/UX Tooling

- **Live Preview**: Iframe-based preview with route selection
- **Diff Visualization**: Side-by-side UI and code diffs
- **Screenshot Capture**: Playwright integration for before/after comparison
- **Agent Console**: Interactive agent execution with trace viewer

## Packages

### Core Packages

- **`packages/mock-sandbox-core`**: Library for API discovery, mock synthesis, and sandbox orchestration
- **`packages/mock-sandbox-cli`**: CLI wrapper for mock sandbox operations
- **`packages/agent`**: LangGraph-based agent runtime with project indexing and intelligent file discovery
- **`packages/data`**: Data layer with IDataSource interface, Zod schemas, and recursive JSON Schema generator
- **`packages/shared`**: Shared utilities, MCP client wrappers, and Playwright integration

### Applications

- **`apps/web`**: Next.js UI with project loader, preview pane, diff center, and agent console
- **`apps/desktop`**: Tauri desktop shell providing native OS integration

### MCP Servers

- **`mcp-servers/git`**: Git operations (status, diff, branch, commit, applyPatch)
- **`mcp-servers/ts-ast`**: TypeScript AST codemods (insertProp, extractComponent)
- **`mcp-servers/package-manager`**: Package management (add, remove, install) with auto-detection

### Examples

- **`examples/demo-app`**: Minimal Next.js app for testing agent modifications
- **`examples/todo-app`**: Vite + React demo with REST API calls for mock sandbox
- **`examples/vite-sandbox-demo`**: Basic Vite app for sandbox testing

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker Desktop (for mock sandbox and local LLM)
- Rust (optional, for Tauri) - install via `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Run Mock Sandbox (Recommended)

Test the mock sandbox system with the todo-app example:

```bash
# Terminal 1: Start Docker Model Runner (for AI mock generation)
docker run -p 12434:12434 model-runner

# Terminal 2: Run todo app with automatic mocking
cd examples/todo-app
node run-with-mocks.mjs
```

The app will:

1. Discover all API calls in your code
2. Generate realistic mock data using AI
3. Spin up a mock server
4. Run your app with mocks automatically proxied

Open http://localhost:5173 to see your app running with mocks!

See [QUICKSTART_MOCK_SANDBOX.md](QUICKSTART_MOCK_SANDBOX.md) for detailed mock sandbox guide.

### Run Agent System

Test the AI agent with code modifications:

```bash
# Terminal 1: Start web UI
pnpm --filter web dev

# Terminal 2: Start demo app
pnpm --filter demo-app dev

# Terminal 3 (optional): Run MCP servers for testing
pnpm mcp:git
pnpm mcp:ts-ast
pnpm mcp:package-manager
```

Open http://localhost:3000 in your browser.

### Run with Tauri Desktop

```bash
pnpm --filter desktop tauri dev
```

## Usage Examples

### Mock Sandbox Example

```typescript
import { runAll } from "@the-artik-tao/mock-sandbox-core";

// Automatically discover APIs, generate mocks, and run sandbox
const services = await runAll({
  cwd: "./my-react-app",
  dmr: { model: "ai/smollm2" },
  ports: { app: 3000, mock: 8000 },
  provider: "docker",
});

console.log(`App running at: ${services.appUrl}`);
console.log(`Mock server at: ${services.mockUrl}`);

// Stop when done
await services.stop();
```

### Agent System Demo

1. Open the web UI at http://localhost:3000
2. Enter path to `examples/demo-app` in the project loader
3. Click "Preview" to see the demo app in iframe
4. Click "Agent Console" and enter goal: "Add a variant prop to Button component"
5. Agent will:
   - Plan the modification using LLM
   - Execute code changes via MCP tools
   - Capture before/after screenshots
6. Go to "Diff Center" to see UI + code diffs
7. Click "Apply" to commit changes via git MCP

### Project Indexing Example

```typescript
import { ProjectIndexer } from "@the-artik-tao/agent";

const indexer = new ProjectIndexer("/path/to/react-project");

// Index the entire project
await indexer.buildIndex();

// Query components
const button = indexer.getRegistry().getComponent("Button");
console.log(button.props); // ['variant', 'onClick', 'children']
console.log(button.jsxStructure); // 'button'

// Semantic search (when embeddings are available)
const results = await indexer.searchByEmbedding(queryEmbedding);
```

## Development

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# Testing
pnpm test

# Format code
pnpm format
```

## Configuration

### LLM Endpoint

Set environment variables:

```bash
# Use Docker Desktop Models (default)
export OPENAI_BASE_URL=http://localhost:12434/engines/v1
export OPENAI_MODEL=ai/smollm2

# Or use OpenAI API
export OPENAI_API_KEY=sk-...
export OPENAI_BASE_URL=https://api.openai.com/v1
export OPENAI_MODEL=gpt-4
```

## Project Structure

```
artik-v4/
├── apps/
│   ├── desktop/                    # Tauri shell
│   └── web/                        # Next.js UI
├── packages/
│   ├── agent/                      # LangGraph runtime + project indexer
│   │   └── src/
│   │       ├── indexer/            # Project indexing system
│   │       ├── nodes/              # Planner, CodeModder, Previewer
│   │       ├── orchestrator.ts     # Agent orchestration
│   │       └── tools.ts            # MCP tool bindings
│   ├── mock-sandbox-core/          # Mock sandbox library
│   │   └── src/
│   │       ├── detect/             # Project detection
│   │       ├── discovery/          # API discovery (fetch, axios)
│   │       ├── dmr/                # Docker Model Runner client
│   │       ├── synthesize/         # Mock synthesis
│   │       ├── generate/           # Mock server generation
│   │       └── sandbox/            # Sandbox orchestration
│   ├── mock-sandbox-cli/           # CLI wrapper
│   ├── data/                       # Data layer
│   └── shared/                     # Shared utilities + MCP clients
├── mcp-servers/
│   ├── git/                        # Git MCP server
│   ├── ts-ast/                     # AST codemods
│   └── package-manager/            # Package management
├── examples/
│   ├── demo-app/                   # Agent demo (Next.js)
│   ├── todo-app/                   # Mock sandbox demo (Vite + React)
│   └── vite-sandbox-demo/          # Basic Vite sandbox test
└── pnpm-workspace.yaml
```

## Roadmap

### ✅ Completed

- **M0**: Walking skeleton with monorepo, MCP servers, agent nodes, and web UI
- **M1**: LLM integration (Docker Model Runner), MCP tool wiring, Playwright integration
- **M2.1**: Project indexing with AST parsing, embeddings, caching, and incremental updates
- **Mock Sandbox MVP**: Complete library-first toolkit with API discovery, mock synthesis, and sandbox orchestration

### 🚧 In Progress

- **M2.2**: Embedding-based semantic search for component discovery
- **M2.3**: Enhanced UI analysis with DOM extraction and component matching
- **M2.4**: LLM-driven code generation (complete file modifications, not just predefined tools)

### 📋 Planned

- **M3**: Advanced data system
  - Factory + LLM + Fixtures integration
  - Live API recording and replay
  - Type-aware mock generation
- **M4**: Component tooling
  - Storybook integration
  - Per-component diff visualization
  - Design token extraction
- **M5**: Multi-agent orchestration
  - Parallel task execution
  - Rollback and versioning
  - Design iteration loops
  - Cross-file refactoring

### 🔮 Future

- GraphQL support in mock sandbox
- Additional framework providers (Remix, Astro, SvelteKit)
- Visual regression testing
- Design system awareness
- Multi-modal LLM integration (vision models for screenshot analysis)

## Documentation

Comprehensive documentation is available in the repository:

### Quick Start Guides

- **[QUICKSTART.md](QUICKSTART.md)**: 5-minute setup guide for the entire platform
- **[QUICKSTART_MOCK_SANDBOX.md](QUICKSTART_MOCK_SANDBOX.md)**: Detailed mock sandbox quick start

### Implementation Summaries

- **[M0_IMPLEMENTATION_SUMMARY.md](M0_IMPLEMENTATION_SUMMARY.md)**: Walking skeleton milestone
- **[M1_LLM_INTEGRATION.md](M1_LLM_INTEGRATION.md)**: LLM integration with Docker Model Runner
- **[M1_MCP_WIRING.md](M1_MCP_WIRING.md)**: MCP tool wiring and agent execution
- **[M1_PLAYWRIGHT_INTEGRATION.md](M1_PLAYWRIGHT_INTEGRATION.md)**: Playwright setup for screenshots
- **[M2_INTELLIGENT_FILE_DISCOVERY.md](M2_INTELLIGENT_FILE_DISCOVERY.md)**: Architecture for intelligent component matching
- **[M2.1_PROJECT_INDEXING_SUMMARY.md](M2.1_PROJECT_INDEXING_SUMMARY.md)**: Project indexing implementation details
- **[MOCK_SANDBOX_IMPLEMENTATION.md](MOCK_SANDBOX_IMPLEMENTATION.md)**: Complete mock sandbox system overview

### Example Applications

- **[DEMO_TODO_APP.md](DEMO_TODO_APP.md)**: Todo app demo with mock sandbox integration

### Package Documentation

- **[packages/mock-sandbox-core/README.md](packages/mock-sandbox-core/README.md)**: Complete API reference for mock sandbox
- **[packages/agent/README.md](packages/agent/README.md)**: Agent architecture and usage
- **[packages/data/README.md](packages/data/README.md)**: Data layer API documentation
- **[mcp-servers/README.md](mcp-servers/README.md)**: MCP server reference

## License

MIT
