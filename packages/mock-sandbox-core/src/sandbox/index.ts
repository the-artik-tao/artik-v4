import { join } from "path";
import { eventEmitter } from "../events.js";
import { generateMockServer } from "../generate/mock-server.js";
import type {
  CoreConfig,
  FrameworkProviderPlugin,
  PrepareSandboxOptions,
  RunningServices,
  SandboxPlan,
} from "../types.js";
import { createLogger } from "../utils/logger.js";
import { viteFrameworkProvider } from "./frameworks/vite.js";
import { dockerProvider } from "./providers/docker.js";
import { noneProvider } from "./providers/none.js";

export async function prepareSandbox(
  opts: PrepareSandboxOptions,
  cfg?: CoreConfig
): Promise<SandboxPlan> {
  const logger = createLogger(cfg?.logger);
  logger.log("info", "Preparing sandbox");

  const provider = cfg?.sandboxProvider || selectProvider(opts.provider);
  const ports = {
    appPort: opts.ports?.app || 5173,
    mockPort: opts.ports?.mock || 9000,
  };

  // Generate mock server first
  const mockServerDir = join(opts.project.root, ".sandbox", "mock-server");
  await generateMockServer(
    {
      outDir: mockServerDir,
      mockSpec: opts.mockSpec,
      port: ports.mockPort,
    },
    cfg
  );

  // Prepare sandbox with provider
  const plan = await provider.prepare(opts.project, opts.mockSpec, ports);

  // Write framework overlay if applicable
  const frameworkProvider = selectFrameworkProvider(
    opts.project.framework,
    cfg
  );
  if (frameworkProvider) {
    logger.log("debug", `Writing overlay for ${frameworkProvider.name}`);
    await frameworkProvider.writeOverlay(
      opts.project,
      plan,
      // We need discovery result but it's not in PrepareSandboxOptions
      // For now, infer from mockSpec - map back to GraphQLOperation with empty document
      {
        rest: opts.mockSpec.rest,
        graphql: opts.mockSpec.graphql.map((op) => ({
          endpoint: op.endpoint,
          operationType: op.operationType,
          operationName: op.operationName,
          document: "", // Not available from mockSpec
          exampleVariables: op.exampleVariables,
        })),
        baseUrls: opts.mockSpec.meta.baseUrls,
        notes: [],
      }
    );
  }

  logger.log("info", "Sandbox prepared", { workDir: plan.workDir });
  return plan;
}

export async function runSandbox(
  plan: SandboxPlan,
  cfg?: CoreConfig
): Promise<RunningServices> {
  const logger = createLogger(cfg?.logger);
  logger.log("info", "Starting sandbox");

  // Determine which provider to use from plan
  const providerName = plan.composePath ? "docker" : "none";
  const provider = selectProvider(providerName);

  const services = await provider.up(plan);

  if (services.appUrl || services.mockUrl) {
    eventEmitter.emit("sandbox:up", {
      appUrl: services.appUrl,
      mockUrl: services.mockUrl,
    });
  }

  logger.log("info", "Sandbox running", {
    appUrl: services.appUrl,
    mockUrl: services.mockUrl,
  });

  return services;
}

function selectProvider(name?: string) {
  if (name === "none") {
    return noneProvider;
  }
  return dockerProvider;
}

function selectFrameworkProvider(
  framework: string,
  cfg?: CoreConfig
): FrameworkProviderPlugin | null {
  // Check custom providers first
  if (cfg?.frameworkProviders) {
    const custom = cfg.frameworkProviders.find((p) => p.name === framework);
    if (custom) return custom;
  }

  // Built-in providers
  if (framework === "vite") {
    return viteFrameworkProvider;
  }

  // CRA, Next, Remix not implemented in MVP
  return null;
}
