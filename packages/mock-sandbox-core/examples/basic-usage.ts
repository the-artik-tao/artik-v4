/**
 * Basic usage example for @the-artik-tao/mock-sandbox-core
 *
 * This example shows how to use the library programmatically.
 */

import {
  detectProject,
  discoverAPIs,
  onEvent,
  runAll,
  synthesizeMockSpec,
} from "../dist/index.js";

// Example 1: High-level API (recommended for most use cases)
async function quickStart() {
  console.log("=== Quick Start Example ===\n");

  // Subscribe to events for progress tracking
  const unsubscribe = onEvent((event, payload: any) => {
    console.log(`[Event] ${event}`, payload);
  });

  try {
    const services = await runAll({
      cwd: "/path/to/your/react-app",
      dmr: {
        model: "ai/smollm2",
        temperature: 0.2,
      },
      ports: {
        app: 5173,
        mock: 9000,
      },
      provider: "docker", // or "none" for files only
    });

    console.log("\n✓ Sandbox running!");
    console.log(`  App:  ${services.appUrl}`);
    console.log(`  Mock: ${services.mockUrl}`);

    // Stop when done
    setTimeout(async () => {
      await services.stop();
      console.log("\n✓ Sandbox stopped");
      unsubscribe();
    }, 5000);
  } catch (error: any) {
    console.error("Error:", error.message);
    unsubscribe();
  }
}

// Example 2: Step-by-step API (for advanced use cases)
async function stepByStep() {
  console.log("=== Step-by-Step Example ===\n");

  try {
    // 1. Detect project
    const project = await detectProject({
      cwd: "/path/to/your/react-app",
    });
    console.log(`✓ Detected ${project.framework} project`);

    // 2. Discover APIs
    const discovery = await discoverAPIs(project);
    console.log(
      `✓ Found ${discovery.rest.length} REST endpoints, ${discovery.graphql.length} GraphQL operations`
    );

    // 3. Synthesize mocks
    const mockSpec = await synthesizeMockSpec({
      discovery,
      dmr: { model: "ai/smollm2" },
    });
    console.log(`✓ Synthesized ${mockSpec.rest.length} mock responses`);

    // Now you can use generateMockServer(), prepareSandbox(), runSandbox()...
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

// Example 3: Custom configuration
async function customConfig() {
  console.log("=== Custom Configuration Example ===\n");

  const services = await runAll(
    {
      cwd: "/path/to/your/react-app",
      provider: "none", // Generate files but don't start Docker
    },
    {
      // Custom logger
      logger: {
        level: "debug",
        log: (level, msg, meta) => {
          console.log(`[${level.toUpperCase()}] ${msg}`, meta || "");
        },
      },
      // Custom detectors, framework providers, etc. can be added here
    }
  );

  console.log("✓ Files generated in .sandbox/");
}

// Example 4: Error handling
async function errorHandling() {
  console.log("=== Error Handling Example ===\n");

  try {
    await runAll({
      cwd: "/nonexistent/path",
    });
  } catch (error: any) {
    if (error.name === "ToolError") {
      console.log(`Error code: ${error.code}`);
      console.log(`Message: ${error.message}`);
      console.log(`Cause:`, error.cause);
    }
  }
}

// Run examples (comment/uncomment as needed)
// quickStart();
// stepByStep();
// customConfig();
// errorHandling();

console.log(`
Examples ready! Uncomment the function calls above to run them.

Quick usage:
  import { runAll } from "@the-artik-tao/mock-sandbox-core";
  const services = await runAll({ cwd: "./my-app" });
`);
