# M1: MCP Tool Wiring Guide

## Overview

This document outlines the end-to-end wiring of MCP tools for actual code modifications.

## Architecture

```
Web UI
    ↓ API request
API Route (/api/agent)
    ↓ Initialize MCP clients
MCP Servers (ts-ast, git, playwright)
    ↓ Tool calls
Actual file modifications
    ↓ Results
Web UI displays diffs
```

## Implementation Status

### ✅ Completed

1. **CodeModder Node** (`packages/agent/src/nodes/code-modder.ts`)
   - Pattern matching for common tasks
   - Direct tool invocation for "add prop" scenarios
   - LLM fallback for complex cases
   - Error handling

2. **Planner Node** (`packages/agent/src/nodes/planner.ts`)
   - Improved prompt for React/TypeScript focus
   - Strict output format enforcement
   - Step limiting (max 3 steps)
   - Better parsing

3. **API Route** (`apps/web/src/app/api/agent/route.ts`)
   - MCP client initialization
   - Error handling and fallbacks
   - Playwright integration

### 🔄 Current Behavior

**Pattern Matching (M1):**

```typescript
// For simple tasks like "Add variant prop to Button"
if (step.includes("add") && step.includes("prop") && step.includes("button")) {
  tool.invoke({
    filePath: "${repoPath}/components/Button.tsx",
    interfaceName: "ButtonProps",
    propName: "variant",
    propType: '"primary" | "secondary"',
    optional: true,
  });
}
```

**Benefits:**

- Works without LLM
- Fast and reliable
- Perfect for common operations

**Limitations:**

- Hardcoded patterns
- Only works for specific scenarios
- Needs LLM for general cases

## Testing

### Test Pattern Matching

```bash
curl -X POST http://localhost:3000/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "Add variant prop to Button",
    "repoPath": "/Users/vladislavshub/Development/home/artik-v3/examples/demo-app"
  }'
```

**Expected Result:**

- Pattern matched → Direct tool call
- TS-AST MCP modifies `components/Button.tsx`
- Returns modification result

### Test LLM Fallback

```bash
curl -X POST http://localhost:3000/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "Change button color to green",
    "repoPath": "/path/to/repo"
  }'
```

**Expected Result:**

- Pattern not matched → LLM decides tool
- LLM analyzes goal and picks tool
- Tool executes with LLM-provided params

## MCP Server Status

### Git Server ✅

- Status: Working
- Tools: `git.status`, `git.diff`, `git.branch`, `git.commit`, `git.applyPatch`
- Test: `pnpm mcp:git`

### TS-AST Server ✅

- Status: Working
- Tools: `tsast.insertProp`
- Test: `pnpm mcp:ts-ast`

### Package Manager Server ✅

- Status: Working
- Tools: `package.add`, `package.remove`, `package.install`
- Test: `pnpm mcp:package-manager`

### Playwright MCP ⚠️

- Status: Needs Docker setup
- Tools: `playwright_screenshot`, `playwright_snapshot`
- Requires: `docker mcp server enable playwright`

## Current Limitations

1. **Pattern Matching Only**
   - Hardcoded for "add prop" scenarios
   - Needs LLM for general cases

2. **No LLM Integration Yet**
   - Requires Docker Model Runner
   - Needs model installation

3. **No Actual File Writing**
   - TS-AST modifies in memory
   - Needs `save()` call

4. **No Screenshot Capture**
   - Playwright MCP not configured
   - Falls back to stub paths

## Next Steps

### Immediate (Complete M1)

1. **Test Pattern Matching**
   - Run agent with "Add variant prop"
   - Verify file modification

2. **Wire File Saving**
   - Add `await sourceFile.save()` to TS-AST server
   - Verify changes persist

3. **Add Git Integration**
   - Commit modified files
   - Show diff in UI

### Short Term (M1+)

1. **Enable LLM**
   - Install Docker Model Runner
   - Test with real LLM

2. **Playwright Setup**
   - Configure Docker MCP
   - Capture real screenshots

3. **Expand Patterns**
   - Add more pattern matchers
   - Cover common operations

### Long Term (M2+)

1. **Full LLM Integration**
   - Remove pattern matching
   - Let LLM decide all tools

2. **RAG System**
   - Repository context
   - Component discovery

3. **Multi-file Changes**
   - Complex refactorings
   - Cross-file dependencies

## Troubleshooting

### MCP Server Not Starting

```bash
# Check if servers compile
pnpm --filter @artik/mcp-git build
pnpm --filter @artik/mcp-ts-ast build

# Test server manually
tsx mcp-servers/ts-ast/src/index.ts
```

### Agent Returns Stub Responses

```bash
# Check API logs
curl -v http://localhost:3000/api/agent ...

# Check MCP connections
# Look for "MCP not available" warnings
```

### File Not Modified

- Check TS-AST server calls `save()`
- Verify file path is correct
- Check file permissions

## Status Summary

**Current:** Pattern matching works for common scenarios  
**Next:** Add LLM for general cases  
**Future:** Full RAG + multi-agent orchestration

**Ready for:** Testing with real file modifications! 🚀
