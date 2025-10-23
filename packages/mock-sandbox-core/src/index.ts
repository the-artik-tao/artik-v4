// Core API exports
export { detectProject } from "./detect/index.js";
export { discoverAPIs } from "./discovery/index.js";
export { generateMockServer } from "./generate/mock-server.js";
export { prepareSandbox, runSandbox } from "./sandbox/index.js";
export { synthesizeMockSpec } from "./synthesize/index.js";

// Event system
export { onEvent } from "./events.js";

// Error handling
export { ToolError } from "./errors.js";
export type { ErrorCode } from "./errors.js";

// Type exports
export type {
  // Configuration
  CoreConfig,
  // Results
  DetectedProject,
  // Options
  DetectOptions,
  // Plugin interfaces
  DetectorPlugin,
  DiscoveryResult,
  DmrOptions,
  EventPayload,
  // Events
  EventType,
  FrameworkProviderPlugin,
  GenerateServerOptions,
  GraphQLOperation,
  Logger,
  MockSpec,
  PrepareSandboxOptions,
  // API types
  RestEndpoint,
  RunAllOptions,
  RunningServices,
  SandboxPlan,
  SandboxProvider,
  SynthesizeOptions,
} from "./types.js";

// High-level orchestration
import { detectProject } from "./detect/index.js";
import { discoverAPIs } from "./discovery/index.js";
import { prepareSandbox, runSandbox } from "./sandbox/index.js";
import { synthesizeMockSpec } from "./synthesize/index.js";
import type { CoreConfig, RunAllOptions, RunningServices } from "./types.js";
import { createLogger } from "./utils/logger.js";

/**
 * Convenience function that orchestrates the entire flow:
 * 1. Detect project
 * 2. Discover APIs
 * 3. Synthesize mocks via DMR
 * 4. Generate mock server
 * 5. Prepare and run sandbox
 *
 * @param opts - Options including cwd, DMR config, ports, and provider
 * @param cfg - Core configuration including logger and plugins
 * @returns RunningServices with URLs and stop function
 *
 * @example
 * ```typescript
 * const services = await runAll({
 *   cwd: "/path/to/react-app",
 *   dmr: { model: "ai/smollm2" },
 *   ports: { app: 5173, mock: 9000 },
 *   provider: "docker"
 * });
 *
 * console.log(`App: ${services.appUrl}`);
 * console.log(`Mock: ${services.mockUrl}`);
 *
 * // Later, stop the services
 * await services.stop();
 * ```
 */
export async function runAll(
  opts: RunAllOptions,
  cfg?: CoreConfig
): Promise<RunningServices> {
  const logger = createLogger(cfg?.logger);
  logger.log("info", "Starting runAll orchestration");

  // 1. Detect project
  logger.log("info", "Step 1/5: Detecting project");
  const project = await detectProject({ cwd: opts.cwd }, cfg);
  logger.log(
    "info",
    `Detected ${project.framework} project with ${project.packageManager}`
  );

  // 2. Discover APIs
  logger.log("info", "Step 2/5: Discovering APIs");
  const discovery = await discoverAPIs(project, cfg);
  logger.log(
    "info",
    `Discovered ${discovery.rest.length} REST endpoints, ${discovery.graphql.length} GraphQL operations`
  );

  // 3. Synthesize mocks
  logger.log("info", "Step 3/5: Synthesizing mocks via DMR");
  const mockSpec = await synthesizeMockSpec({ discovery, dmr: opts.dmr }, cfg);
  logger.log(
    "info",
    `Synthesized ${mockSpec.rest.length + mockSpec.graphql.length} mock responses`
  );

  // 4. Prepare sandbox
  logger.log("info", "Step 4/5: Preparing sandbox");
  const plan = await prepareSandbox(
    {
      project,
      mockSpec,
      ports: opts.ports,
      provider: opts.provider,
    },
    cfg
  );
  logger.log("info", `Sandbox prepared in ${plan.workDir}`);

  // 5. Run sandbox
  logger.log("info", "Step 5/5: Starting sandbox");
  const services = await runSandbox(plan, cfg);

  logger.log("info", "🚀 All systems ready!", {
    appUrl: services.appUrl,
    mockUrl: services.mockUrl,
  });

  return services;
}
