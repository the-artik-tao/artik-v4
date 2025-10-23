# @artik/agent

LangGraph-based agent runtime for UI/UX modifications.

## Overview

This package provides:

- **LangGraph orchestration**: State machine for multi-step agent flows
- **LLM integration**: Docker Model Runner or OpenAI
- **MCP tool bindings**: Git, TS-AST, package management
- **Agent nodes**: Planner, CodeModder, Previewer, Exporter

## Architecture

```
        ┌──────────┐
        │  Planner │  (Goal → Plan + Steps)
        └────┬─────┘
             ↓
      ┌──────────────┐
      │  CodeModder  │  (Step → Tool Call → Modification)
      └──────┬───────┘
             ↓
       ┌──────────┐
       │Previewer │  (URL → Screenshot)
       └────┬─────┘
            ↓
        [Result]
```

## Usage

### Basic Agent Execution

```typescript
import { AgentOrchestrator } from "@artik/agent";
import { createMCPClient } from "@artik/shared";

// Connect MCP clients
const gitClient = await createMCPClient("tsx", [
  "mcp-servers/git/src/index.ts",
]);
const tsAstClient = await createMCPClient("tsx", [
  "mcp-servers/ts-ast/src/index.ts",
]);

const orchestrator = new AgentOrchestrator({
  llm: {
    baseURL: "http://localhost:12434/engines/v1",
    model: "ai/smollm2",
    temperature: 0.2,
  },
  tools: {
    gitClient,
    tsAstClient,
  },
});

const result = await orchestrator.runTask(
  "Add a variant prop to Button component",
  "/path/to/repo"
);

console.log(result.plan);
console.log(result.modifications);
```

### Custom LLM Configuration

```typescript
import { createLLM } from "@artik/agent";

// Docker Model Runner (local)
const llm = createLLM({
  baseURL: "http://localhost:12434/engines/v1",
  model: "ai/smollm2",
  temperature: 0.2,
});

// OpenAI
const llm = createLLM({
  baseURL: "https://api.openai.com/v1",
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4",
  temperature: 0.1,
});
```

### Direct Node Usage

```typescript
import { plannerNode, codeModderNode } from "@artik/agent";
import { createLLM } from "@artik/agent";

const llm = createLLM();

const planResult = await plannerNode(
  {
    goal: "Add dark mode toggle",
    repoPath: "/path/to/repo",
    repoSummary: "Next.js app with Tailwind",
  },
  llm
);

console.log(planResult.plan);
console.log(planResult.steps);
```

## Agent Nodes

### Planner

Takes a high-level goal and creates a sequenced plan with specific steps.

**Input:**

- `goal`: High-level objective
- `repoPath`: Path to the repository
- `repoSummary`: (optional) Context about the repo

**Output:**

- `plan`: Brief summary of the plan
- `steps`: Array of actionable steps

### CodeModder

Executes a step by invoking the appropriate MCP tool.

**Input:**

- `step`: Step description from planner
- `repoPath`: Repository path
- `tools`: Array of available LangChain tools

**Output:**

- `modifications`: Array of modification results
- `filesChanged`: Array of file paths that were modified

### Previewer

Captures a screenshot of a URL using Playwright.

**Input:**

- `url`: Base URL of the app
- `route`: (optional) Route to capture

**Output:**

- `screenshotPath`: Path to saved screenshot
- `timestamp`: When the screenshot was captured

## Tools

The agent uses LangChain DynamicStructuredTools wrapping MCP calls:

- **git_status**: Get git status
- **git_diff**: Get git diff (staged/unstaged)
- **insert_prop**: Add property to TypeScript interface

## Environment Variables

```bash
OPENAI_BASE_URL=http://localhost:12434/engines/v1
OPENAI_MODEL=ai/smollm2
OPENAI_API_KEY=not-needed
```

## Future Enhancements

- Retry logic for failed tool calls
- Approval gates for risky operations
- RAG over repository graph
- Multi-agent collaboration
