# UI/UX Agent Platform — "Cursor for React/UX"

A desktop application that loads existing React/Next.js projects, previews them, and uses LLMs + MCP tools to intelligently modify and generate UI components.

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

## Packages

### Core Packages

- **`packages/data`**: Data layer with IDataSource interface, Zod schemas, factory mocks, and recursive JSON Schema generator
- **`packages/agent`**: LangGraph-based agent runtime with nodes (Planner, CodeModder, Previewer) and orchestrator
- **`packages/shared`**: Shared utilities and MCP client wrappers

### Applications

- **`apps/web`**: Next.js UI with project loader, preview pane, diff center, and agent console
- **`apps/desktop`**: Tauri desktop shell providing native OS integration

### MCP Servers

- **`mcp-servers/git`**: Git operations (status, diff, branch, commit, applyPatch)
- **`mcp-servers/ts-ast`**: TypeScript AST codemods (insertProp, extractComponent)
- **`mcp-servers/package-manager`**: Package management (add, remove, install) with auto-detection

### Examples

- **`examples/demo-app`**: Minimal Next.js app for M0 testing

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Rust (for Tauri) - install via `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- Docker Desktop with Models enabled (optional, for local LLM)

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Run M0 Demo

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

## M0 Walking Skeleton Demo

1. Open the web UI
2. Enter path to `examples/demo-app` in the project loader
3. Click "Preview" to see the demo app in iframe
4. Click "Agent Console" and enter goal: "Add a variant prop to Button component"
5. Agent will:
   - Plan the modification
   - Call ts-ast MCP to insert the prop
   - Capture screenshot
6. Go to "Diff Center" to see UI + code diffs
7. Click "Apply" to commit changes via git MCP

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
artik-v3/
├── apps/
│   ├── desktop/          # Tauri shell
│   └── web/              # Next.js UI
├── packages/
│   ├── agent/            # LangGraph runtime
│   ├── data/             # Data layer
│   └── shared/           # Shared utilities
├── mcp-servers/
│   ├── git/              # Git MCP server
│   ├── ts-ast/           # AST codemods
│   └── package-manager/  # Package management
├── examples/
│   └── demo-app/         # Demo Next.js app
└── pnpm-workspace.yaml
```

## Roadmap

- **M0 (Current)**: Basic skeleton with one codemod, preview, and diff
- **M1**: Full MCP integration with filesystem and browser tools
- **M2**: Repo graph + RAG for context-aware modifications
- **M3**: Data system (Factory + LLM + Fixtures + Live API)
- **M4**: Storybook integration and per-component diffs
- **M5**: Multi-agent planning, rollback, and design iteration loops

## License

MIT
