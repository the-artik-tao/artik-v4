# M1: Playwright Integration Guide

## Overview

This document outlines the Playwright integration for capturing real screenshots as part of the agent's workflow.

## Architecture

```
Web UI (Next.js)
    ↓ API call
API Route (/api/screenshot)
    ↓ MCP call
Playwright MCP Server (Docker)
    ↓ Browser automation
Screenshot file
```

## Setup

### 1. Enable Playwright MCP Server in Docker

```bash
# Enable the official Playwright MCP server
docker mcp server enable playwright
```

### 2. Client Configuration

The Playwright client is wrapped in `packages/shared/src/playwright-client.ts`:

```typescript
import { PlaywrightClient } from "@artik/shared";
import { createMCPClient } from "@artik/shared";

// Create MCP client for Playwright
const playwrightMCP = await createMCPClient("docker", ["mcp", "playwright"]);
const playwrightClient = new PlaywrightClient(playwrightMCP);

// Capture screenshot
const result = await playwrightClient.screenshotFullPage(
  "http://localhost:3001"
);
```

### 3. Integration in Agent

The previewer node now accepts a `playwrightClient`:

```typescript
const result = await previewerNode({
  url: "http://localhost:3001",
  route: "/",
  playwrightClient: playwrightClient, // Optional - falls back to stub if not provided
});
```

## API Methods

### PlaywrightClient Methods

- `screenshot(url, options)` - Capture screenshot with options
- `screenshotFullPage(url)` - Capture full page screenshot
- `screenshotElement(url, selector)` - Capture specific element
- `snapshot(url)` - Get accessibility tree snapshot

## Usage Examples

### Basic Screenshot

```typescript
const result = await playwrightClient.screenshot("http://localhost:3001");
console.log(result.path); // Path to screenshot file
```

### Full Page Screenshot

```typescript
const result = await playwrightClient.screenshotFullPage(
  "http://localhost:3001"
);
```

### Element Screenshot

```typescript
const result = await playwrightClient.screenshotElement(
  "http://localhost:3001",
  "button#submit"
);
```

## Next Steps

1. Create API route `/api/screenshot` in Next.js
2. Wire Playwright MCP calls from web UI
3. Display screenshots in Diff Modal
4. Implement before/after comparison
5. Add pixelmatch for visual diffing

## Environment Variables

```bash
# Playwright MCP server URL (Docker internal)
PLAYWRIGHT_MCP_URL=http://localhost:12434/engines/v1

# Screenshot storage path
SCREENSHOT_DIR=./screenshots
```

## Testing

```bash
# Test Playwright MCP directly
curl -X POST http://localhost:12434/api/playwright/screenshot \
  -H "Content-Type: application/json" \
  -d '{"url": "http://localhost:3001"}'
```

## Fallback Behavior

If Playwright MCP is unavailable:

- Previewer node returns stub screenshot path
- Agent continues execution
- Error logged but not blocking

## Status

✅ PlaywrightClient wrapper created  
✅ Previewer node updated  
✅ Fallback mechanism implemented  
⚠️ API route needs implementation  
⚠️ Screenshot display needs integration
