# Quick Start Guide - M0 Walking Skeleton

This guide will get you up and running with the UI/UX Agent Platform in under 5 minutes.

## Prerequisites

1. **Node.js 20+** and **pnpm 8+**

   ```bash
   node --version  # Should be v20.x or higher
   pnpm --version  # Should be 8.x or higher
   ```

2. **Rust** (for Tauri desktop app - optional for web-only mode)

   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

3. **Docker Desktop** (optional, for local LLM)
   - Install from https://www.docker.com/products/docker-desktop
   - Enable "Models" in Docker Desktop settings

## Installation

```bash
# Clone or navigate to the repository
cd /path/to/artik-v3

# Install dependencies (already done if you see node_modules)
pnpm install

# Build all packages
pnpm --filter "./packages/*" --filter "./mcp-servers/*" build
```

## Running the M0 Demo

### Option 1: Web-Only Mode (Easiest)

```bash
# Terminal 1: Start the demo app (target application)
cd examples/demo-app
pnpm install  # if not already done
pnpm dev      # Runs on http://localhost:3001

# Terminal 2: Start the web UI
cd apps/web
pnpm dev      # Runs on http://localhost:3000
```

Now open http://localhost:3000 in your browser.

### Option 2: Full Desktop Mode (with Tauri)

```bash
# Terminal 1: Start the demo app
cd examples/demo-app
pnpm dev

# Terminal 2: Start the desktop app
cd apps/desktop
pnpm tauri dev
```

## Using the M0 Demo

### 1. Load a Project

- Open the web UI at http://localhost:3000
- Enter the path to the demo app: `/path/to/artik-v3/examples/demo-app`
- Click "Open Project"

### 2. Preview the App

- Click "Preview" button
- You'll see the demo app running in an iframe
- Try changing the route selector (currently only "/" is available)

### 3. Run the Agent

- Click "Agent Console"
- Enter a goal: `Add a variant prop to Button component`
- Click "Run Agent"
- Watch the execution trace:
  - 🤖 Planner analyzes the goal
  - 📋 Creates a plan
  - 🔧 Code Modder calls TS-AST MCP tool
  - ✅ Modifies `components/Button.tsx`
  - 📸 Previewer captures screenshot
  - ✨ Complete!

### 4. View Diffs

- Click "Diff Center"
- See side-by-side comparison:
  - **UI Diff**: Before/after screenshots (stub in M0)
  - **Code Diff**: Git patch showing added `variant` prop

### 5. Apply Changes

- Click "Apply Changes" to commit via git MCP (stub in M0)
- Click "Rollback" to discard changes

## Testing MCP Servers Manually

Each MCP server can be tested standalone:

### Git Server

```bash
cd mcp-servers/git
pnpm dev

# In another terminal, test via stdio:
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | tsx src/index.ts
```

### TS-AST Server

```bash
cd mcp-servers/ts-ast
pnpm dev

# Test inserting a prop:
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"tsast.insertProp","arguments":{"filePath":"../../examples/demo-app/components/Button.tsx","interfaceName":"ButtonProps","propName":"variant","propType":"\"primary\" | \"secondary\"","optional":true}}}' | tsx src/index.ts
```

### Package Manager Server

```bash
cd mcp-servers/package-manager
pnpm dev
```

## Configuring the LLM

### Option 1: Docker Desktop Models (Local, Free)

```bash
# Install a model
docker model pull ai/smollm2:360M-Q4_K_M

# The agent will automatically use http://localhost:12434/engines/v1
```

### Option 2: OpenAI API

```bash
export OPENAI_API_KEY=sk-...
export OPENAI_BASE_URL=https://api.openai.com/v1
export OPENAI_MODEL=gpt-4

# Then run the web UI
cd apps/web
pnpm dev
```

## Project Structure Overview

```
artik-v3/
├── apps/
│   ├── desktop/          # Tauri desktop shell (Rust + TypeScript)
│   └── web/              # Next.js web UI (main interface)
├── packages/
│   ├── agent/            # LangGraph agent orchestrator
│   ├── data/             # Data layer with mock generators
│   └── shared/           # MCP client wrappers
├── mcp-servers/
│   ├── git/              # Git operations MCP server
│   ├── ts-ast/           # TypeScript AST codemods
│   └── package-manager/  # Package management
└── examples/
    └── demo-app/         # Minimal Next.js app for testing
```

## Common Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Format code
pnpm format

# Run web UI
pnpm --filter web dev

# Run demo app
pnpm --filter demo-app dev

# Run desktop app
pnpm --filter desktop tauri dev

# Run MCP servers
pnpm mcp:git
pnpm mcp:ts-ast
pnpm mcp:package-manager
```

## Troubleshooting

### Port Already in Use

If port 3000 or 3001 is already in use:

```bash
# Change the port in apps/web/package.json:
"dev": "next dev -p 3002"

# Change the port in examples/demo-app/package.json:
"dev": "next dev -p 3003"
```

### Docker Model Runner Not Found

If you don't have Docker Desktop with Models:

```bash
export OPENAI_BASE_URL=https://api.openai.com/v1
export OPENAI_API_KEY=your-key-here
export OPENAI_MODEL=gpt-3.5-turbo
```

### Tauri Build Fails

Make sure Rust is installed:

```bash
rustc --version
cargo --version

# If not installed:
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### TypeScript Errors

Rebuild all packages:

```bash
pnpm --filter "./packages/*" --filter "./mcp-servers/*" build
```

## Next Steps

After getting M0 running:

1. **Explore the code**: Read the READMEs in each package
2. **Test modifications**: Try different goals in the Agent Console
3. **Add new tools**: Create a new MCP server in `mcp-servers/`
4. **Enhance the agent**: Add more sophisticated planning logic
5. **Integrate Playwright**: Set up real screenshot capture

## Roadmap

- **M1**: Full MCP integration with filesystem and browser tools
- **M2**: Repo graph + RAG for context-aware modifications
- **M3**: Complete data system (Factory + LLM + Fixtures + Live)
- **M4**: Storybook integration and per-component diffs
- **M5**: Multi-agent planning, rollback, and design iteration

## Getting Help

- Check the main [README.md](./README.md) for architecture details
- Review package-specific READMEs in each subdirectory
- Check the [PRD](./ui_ux_agent_platform_prd_cursor_expert_prompt.md) for full specification

---

**Built with:** TypeScript, Next.js, Tauri, LangChain, MCP, Docker
