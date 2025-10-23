# @the-artik-tao/mock-sandbox-cli

Minimal CLI wrapper for [`@the-artik-tao/mock-sandbox-core`](../mock-sandbox-core). This CLI is primarily for **testing and demonstration purposes**. For programmatic usage, use the core library directly.

## Installation

```bash
npm install -g @the-artik-tao/mock-sandbox-cli
# or
pnpm add -g @the-artik-tao/mock-sandbox-cli
```

## Usage

### Start Sandbox

```bash
# Run in current directory
react-mock-sandbox

# Run in specific directory
react-mock-sandbox /path/to/react-app

# Custom ports
react-mock-sandbox --port 3000 --mock-port 8000

# Custom DMR model
react-mock-sandbox --model ai/smollm2

# Generate files only (no Docker)
react-mock-sandbox --provider none
```

### Stop Sandbox

```bash
react-mock-sandbox down
```

## Options

- `<path>` - Path to React app (default: current directory)
- `--port <number>` - Port for the React app (default: 5173)
- `--mock-port <number>` - Port for the mock server (default: 9000)
- `--model <string>` - DMR model to use (default: "ai/smollm2")
- `--provider <docker|none>` - Sandbox provider (default: "docker")
- `--no-open` - Don't open browser automatically

## Example

```bash
# Terminal 1: Start DMR
docker run -p 12434:12434 model-runner

# Terminal 2: Run sandbox
cd my-react-app
react-mock-sandbox

# Output:
# 🚀 React Mock Sandbox
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ✓ Detected vite project
# ✓ Discovered 5 REST endpoints, 0 GraphQL operations
#   ⋯ Synthesizing /api/users... ✓
#   ⋯ Synthesizing /api/posts... ✓
#   ...
# ✓ Mock server generated at /path/.sandbox/mock-server
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 🎉 Sandbox is running!
#
#   App:  http://localhost:5173
#   Mock: http://localhost:9000
#
# 💡 Press Ctrl+C to stop
```

## For Programmatic Usage

Use the core library instead:

```typescript
import { runAll } from "@the-artik-tao/mock-sandbox-core";

const services = await runAll({
  cwd: "/path/to/app",
  ports: { app: 5173, mock: 9000 },
});
```

See [`@the-artik-tao/mock-sandbox-core`](../mock-sandbox-core) documentation for full API.

## License

MIT
