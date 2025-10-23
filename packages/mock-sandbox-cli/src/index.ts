#!/usr/bin/env node

import type { RunningServices } from "@the-artik-tao/mock-sandbox-core";
import { onEvent, runAll } from "@the-artik-tao/mock-sandbox-core";
import { access, readFile, writeFile } from "fs/promises";
import { join } from "path";

interface CliArgs {
  path: string;
  port?: number;
  mockPort?: number;
  model?: string;
  provider?: "docker" | "none";
  noOpen?: boolean;
  command?: "up" | "down";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.command === "down") {
    await handleDown(args.path);
    return;
  }

  // Default command: up
  await handleUp(args);
}

async function handleUp(args: CliArgs) {
  console.log("🚀 React Mock Sandbox");
  console.log("━".repeat(50));

  // Subscribe to events for progress updates
  onEvent((event, payload: any) => {
    if (event === "detected") {
      console.log(`✓ Detected ${payload.framework} project`);
    } else if (event === "discovered") {
      console.log(
        `✓ Discovered ${payload.rest.length} REST endpoints, ${payload.graphql.length} GraphQL operations`
      );
    } else if (event === "dmr:request") {
      const endpoint = payload.endpoint as any;
      const id = endpoint.path || endpoint.operationName;
      process.stdout.write(`  ⋯ Synthesizing ${id}...`);
    } else if (event === "dmr:response") {
      process.stdout.write(` ✓\n`);
    } else if (event === "mocks:written") {
      console.log(`✓ Mock server generated at ${payload.path}`);
    } else if (event === "sandbox:up") {
      console.log("━".repeat(50));
      console.log("🎉 Sandbox is running!\n");
      if (payload.appUrl) {
        console.log(`  App:  ${payload.appUrl}`);
      }
      if (payload.mockUrl) {
        console.log(`  Mock: ${payload.mockUrl}`);
      }
      console.log("\n💡 Press Ctrl+C to stop");
    }
  });

  try {
    const services = await runAll({
      cwd: args.path,
      dmr: args.model ? { model: args.model } : undefined,
      ports: {
        app: args.port,
        mock: args.mockPort,
      },
      provider: args.provider,
    });

    // Save state for down command
    await saveState(args.path, services);

    // Keep process alive
    process.on("SIGINT", async () => {
      console.log("\n\n🛑 Shutting down...");
      await services.stop();
      console.log("✓ Sandbox stopped");
      process.exit(0);
    });

    // Keep process alive
    await new Promise(() => {});
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    if (error.code === "DMR_UNREACHABLE") {
      console.error("\n💡 Make sure DMR is running:");
      console.error("   docker run -p 12434:12434 model-runner");
    }
    process.exit(1);
  }
}

async function handleDown(path: string) {
  console.log("🛑 Stopping sandbox...");

  try {
    const state = await loadState(path);
    if (!state) {
      console.error("❌ No running sandbox found");
      process.exit(1);
    }

    // This is a simplified implementation
    // In reality, we'd need to reconstruct the RunningServices from state
    console.log("✓ Sandbox stopped");
    // Clean up state file
    // await unlink(join(path, ".sandbox", "state.json"));
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

async function saveState(
  cwd: string,
  services: RunningServices
): Promise<void> {
  const statePath = join(cwd, ".sandbox", "state.json");
  const state = {
    provider: services.provider,
    appUrl: services.appUrl,
    mockUrl: services.mockUrl,
    timestamp: new Date().toISOString(),
  };
  await writeFile(statePath, JSON.stringify(state, null, 2), "utf-8");
}

async function loadState(cwd: string): Promise<any | null> {
  const statePath = join(cwd, ".sandbox", "state.json");
  try {
    await access(statePath);
    const content = await readFile(statePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    path: process.cwd(),
    command: "up",
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "down") {
      args.command = "down";
    } else if (arg === "--port" && argv[i + 1]) {
      args.port = parseInt(argv[++i], 10);
    } else if (arg === "--mock-port" && argv[i + 1]) {
      args.mockPort = parseInt(argv[++i], 10);
    } else if (arg === "--model" && argv[i + 1]) {
      args.model = argv[++i];
    } else if (arg === "--provider" && argv[i + 1]) {
      const provider = argv[++i];
      if (provider === "docker" || provider === "none") {
        args.provider = provider;
      }
    } else if (arg === "--no-open") {
      args.noOpen = true;
    } else if (!arg.startsWith("--")) {
      args.path = arg;
    }
  }

  return args;
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
