# MCP Servers

Model Context Protocol servers providing tools for the agent.

## Available Servers

### 1. Git Server (`mcp-servers/git`)

Git operations for version control.

**Tools:**

- `git.status`: Get repository status
- `git.diff`: Get diff (unstaged or staged)
- `git.branch`: Create or switch branches
- `git.commit`: Commit staged changes
- `git.applyPatch`: Apply a git patch

**Run:**

```bash
pnpm --filter @artik/mcp-git dev
```

**Example:**

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"git.status","arguments":{"cwd":"/path/to/repo"}}}' | tsx mcp-servers/git/src/index.ts
```

### 2. TS-AST Server (`mcp-servers/ts-ast`)

TypeScript AST codemods using ts-morph.

**Tools:**

- `tsast.insertProp`: Insert property into TypeScript interface

**Run:**

```bash
pnpm --filter @artik/mcp-ts-ast dev
```

**Example:**

```typescript
{
  "name": "tsast.insertProp",
  "arguments": {
    "filePath": "/path/to/Button.tsx",
    "interfaceName": "ButtonProps",
    "propName": "variant",
    "propType": "\"primary\" | \"secondary\"",
    "optional": true
  }
}
```

### 3. Package Manager Server (`mcp-servers/package-manager`)

Package management with auto-detection (pnpm/npm/yarn).

**Tools:**

- `package.add`: Add dependencies
- `package.remove`: Remove dependencies
- `package.install`: Install all dependencies

**Run:**

```bash
pnpm --filter @artik/mcp-package-manager dev
```

**Example:**

```typescript
{
  "name": "package.add",
  "arguments": {
    "cwd": "/path/to/project",
    "packages": ["zod", "@types/node"],
    "dev": true
  }
}
```

## MCP Protocol

All servers use stdio transport and follow the Model Context Protocol specification.

### Request Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "tool.name",
    "arguments": { ... }
  }
}
```

### Response Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Result message"
      }
    ]
  }
}
```

## Development

### Adding a New Tool

1. Define Zod schema for input validation
2. Implement handler in `setRequestHandler(CallToolRequestSchema, ...)`
3. Add tool to `ListToolsRequestSchema` response
4. Update README with examples

### Testing

```bash
# Unit tests
pnpm --filter @artik/mcp-git test

# Manual testing via stdio
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | tsx mcp-servers/git/src/index.ts
```

## Future Servers

- **mock-data**: Generate realistic mock data via LLM
- **api-adapter**: REST/GraphQL adapters for live data
- **playwright**: Browser automation and screenshots
- **storybook**: Component story generation
