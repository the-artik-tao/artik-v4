# M1: LLM Integration Guide

## Overview

This document outlines the LLM integration for real AI agent execution with Docker Model Runner or OpenAI.

## Architecture

```
Web UI (Client)
    ↓ fetch
API Route (/api/agent)
    ↓ orchestrator.runTask()
Agent Orchestrator
    ↓ LLM calls
Docker Model Runner (or OpenAI)
    ↓ responses
Agent Nodes (Planner, CodeModder, Previewer)
    ↓ results
Web UI displays trace
```

## Setup

### 1. Docker Model Runner (Local, Recommended)

```bash
# Install a model
docker model pull ai/smollm2:360M-Q4_K_M

# Run the model
docker model run ai/smollm2
```

Configuration:

```bash
export OPENAI_BASE_URL=http://localhost:12434/engines/v1
export OPENAI_MODEL=ai/smollm2
export OPENAI_API_KEY=not-needed
```

### 2. OpenAI API (Cloud, Fallback)

```bash
export OPENAI_BASE_URL=https://api.openai.com/v1
export OPENAI_API_KEY=sk-your-key-here
export OPENAI_MODEL=gpt-4
```

## API Route

### POST /api/agent

**Request:**

```json
{
  "goal": "Add a variant prop to Button component",
  "repoPath": "/path/to/repo"
}
```

**Response:**

```json
{
  "success": true,
  "result": {
    "plan": "Add variant prop to ButtonProps interface",
    "steps": ["Modify components/Button.tsx"],
    "modifications": ["Property added successfully"],
    "filesChanged": ["components/Button.tsx"],
    "screenshotPath": "screenshots/1234567890.png"
  }
}
```

## Integration Points

### 1. Web UI Calls API

`apps/web/src/app/page.tsx`:

```typescript
const response = await fetch("/api/agent", {
  method: "POST",
  body: JSON.stringify({ goal, repoPath }),
});
```

### 2. API Initializes Agent

`apps/web/src/app/api/agent/route.ts`:

```typescript
const orchestrator = new AgentOrchestrator({
  llm: {
    baseURL: process.env.OPENAI_BASE_URL,
    model: process.env.OPENAI_MODEL,
  },
  tools: { gitClient, tsAstClient },
  playwrightClient,
});
```

### 3. Agent Executes with LLM

`packages/agent/src/graph.ts`:

```typescript
const planResult = await plannerNode(
  { goal, repoPath },
  llm // Real LLM instance
);
```

## Agent Flow

1. **Planner Node**: LLM analyzes goal → generates plan + steps
2. **CodeModder Node**: LLM decides tool to use → calls MCP tool
3. **Previewer Node**: Captures screenshot (via Playwright)
4. **Result**: Returns state with plan, modifications, files changed

## LLM Prompts

### Planner Prompt

```
You are a UI/UX development planner. Given a goal and repository context, create a detailed step-by-step plan.

Goal: {goal}
Repository: {repoPath}

Create a numbered list of specific, actionable steps to accomplish this goal.
```

### CodeModder Prompt

```
You are a code modification agent. Execute this step using available tools.

Step: {step}
Repository: {repoPath}
Available tools: {toolNames}

Determine which tool to use and what parameters to pass.
```

## Error Handling

- **LLM unavailable**: Falls back to stub responses
- **MCP tools unavailable**: Logs warning, continues
- **Screenshot fails**: Falls back to stub path
- **Network errors**: Returns error to client

## Testing

### Test LLM Connection

```bash
curl -X POST http://localhost:3000/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "Add a variant prop to Button",
    "repoPath": "/path/to/repo"
  }'
```

### Test with Docker Model Runner

```bash
# Ensure model is running
docker ps | grep smollm2

# Test API
curl http://localhost:3000/api/agent \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"goal":"test","repoPath":"/test"}'
```

## Status

✅ API route created  
✅ Orchestrator updated  
✅ Playwright integration ready  
✅ LLM configuration flexible  
⚠️ Needs Docker Model Runner running  
⚠️ Needs actual LLM model installed

## Next Steps

1. Install Docker Desktop Models
2. Pull a model (ai/smollm2 or similar)
3. Test agent execution with real LLM
4. Verify planner generates real plans
5. Move to Option B (MCP Tool Wiring)
