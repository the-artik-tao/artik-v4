#!/usr/bin/env node

/**
 * This script uses @the-artik-tao/mock-sandbox-core to:
 * 1. Discover API calls in the todo app
 * 2. Synthesize realistic mock responses using DMR (or fallbacks)
 * 3. Run the app with a mock server (no real backend needed!)
 */

import { runAll, onEvent } from "../../packages/mock-sandbox-core/dist/index.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const appDir = __dirname;

console.log("🚀 React Mock Sandbox - Todo App Demo");
console.log("━".repeat(60));

// Subscribe to events for progress updates
onEvent((event, payload) => {
  if (event === "detected") {
    console.log(`✓ Detected ${payload.framework} project`);
  } else if (event === "discovered") {
    console.log(
      `✓ Discovered ${payload.rest.length} REST endpoints, ${payload.graphql.length} GraphQL operations`
    );
    console.log("\n  Endpoints found:");
    payload.rest.forEach((endpoint) => {
      console.log(`    ${endpoint.method} ${endpoint.path}`);
    });
  } else if (event === "dmr:request") {
    const endpoint = payload.endpoint;
    const id = endpoint.path || endpoint.operationName;
    process.stdout.write(`  ⋯ Synthesizing mock for ${id}...`);
  } else if (event === "dmr:response") {
    process.stdout.write(` ✓\n`);
  } else if (event === "mocks:written") {
    console.log(`✓ Mock server generated at ${payload.path}`);
  } else if (event === "sandbox:up") {
    console.log("━".repeat(60));
    console.log("🎉 Todo App is running with AI-generated mocks!\n");
    if (payload.appUrl) {
      console.log(`  📱 App:  ${payload.appUrl}`);
    }
    if (payload.mockUrl) {
      console.log(`  🔧 Mock: ${payload.mockUrl}`);
    }
    console.log("\n💡 Open your browser and try the todo list!");
    console.log("   All API calls are being handled by AI-generated mocks.");
    console.log("\n⚡ Press Ctrl+C to stop\n");
  }
});

try {
  const services = await runAll(
    {
      cwd: appDir,
      ports: {
        app: 5174, // Different port to avoid conflicts
        mock: 9001,
      },
      provider: "none", // Use "none" to just generate files (Docker not required for demo)
    },
    {
      logger: {
        level: "info",
        log: (level, msg, meta) => {
          if (level === "error") {
            console.error(`❌ ${msg}`, meta || "");
          } else if (level === "warn") {
            console.warn(`⚠️  ${msg}`);
          } else if (level === "debug") {
            // Skip debug logs in demo
          } else {
            // info logs are handled by events
          }
        },
      },
    }
  );

  console.log("\n📂 Files generated in .sandbox/ directory:");
  console.log("   - mock-server/ (Express server with your mocks)");
  console.log("   - mock-spec.json (All discovered endpoints & mocks)");
  console.log("   - overlay/ (Vite proxy configuration)");

  console.log("\n🔧 To run manually:");
  console.log("   1. cd .sandbox/mock-server && npm install && npm start");
  console.log("   2. npm run dev (in another terminal)");

  console.log("\n✨ Mock discovery complete! Check .sandbox/ for generated files.\n");

  // With provider "none", the stop function is a no-op
  await services.stop();
} catch (error) {
  console.error("\n❌ Error:", error.message);

  if (error.code === "DMR_UNREACHABLE") {
    console.log("\n💡 DMR is not running (that's okay!)");
    console.log("   Fallback mocks were used instead.");
    console.log("\n   To use AI-generated mocks, start DMR:");
    console.log("   docker run -p 12434:12434 model-runner");
  }

  process.exit(1);
}

