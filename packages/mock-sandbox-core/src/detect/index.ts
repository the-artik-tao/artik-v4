import { config as loadDotenv } from "dotenv";
import { access, readFile } from "fs/promises";
import { join, resolve } from "path";
import { ToolError } from "../errors.js";
import { eventEmitter } from "../events.js";
import type { CoreConfig, DetectOptions, DetectedProject } from "../types.js";
import { createLogger } from "../utils/logger.js";

export async function detectProject(
  opts: DetectOptions,
  cfg?: CoreConfig
): Promise<DetectedProject> {
  const logger = createLogger(cfg?.logger);
  logger.log("info", "Starting project detection", { cwd: opts.cwd });

  try {
    const root = resolve(opts.cwd);

    // Read package.json
    const packageJsonPath = join(root, "package.json");
    let packageJson: any;

    try {
      const content = await readFile(packageJsonPath, "utf-8");
      packageJson = JSON.parse(content);
    } catch (error) {
      throw new ToolError(
        "DETECT_FAIL",
        `Failed to read package.json at ${packageJsonPath}`,
        error
      );
    }

    // Detect framework from dependencies
    const framework = detectFramework(packageJson);
    logger.log("debug", "Detected framework", { framework });

    // Detect package manager from lock files
    const packageManager = await detectPackageManager(root);
    logger.log("debug", "Detected package manager", { packageManager });

    // Extract scripts
    const scripts = packageJson.scripts || {};

    // Merge env files
    const env = await mergeEnvFiles(root, framework);
    logger.log("debug", "Merged environment variables", {
      count: Object.keys(env).length,
    });

    const project: DetectedProject = {
      root,
      framework,
      packageManager,
      scripts,
      env,
    };

    eventEmitter.emit("detected", project);
    return project;
  } catch (error) {
    if (error instanceof ToolError) {
      throw error;
    }
    throw new ToolError("DETECT_FAIL", "Project detection failed", error);
  }
}

function detectFramework(packageJson: any): DetectedProject["framework"] {
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  // Order matters: check more specific frameworks first
  if (deps["next"]) return "next";
  if (deps["@remix-run/react"]) return "remix";
  if (deps["react-scripts"]) return "cra";
  if (deps["vite"]) return "vite";

  return "unknown";
}

async function detectPackageManager(
  root: string
): Promise<DetectedProject["packageManager"]> {
  const lockFiles = [
    { file: "pnpm-lock.yaml", manager: "pnpm" as const },
    { file: "yarn.lock", manager: "yarn" as const },
    { file: "bun.lockb", manager: "bun" as const },
    { file: "package-lock.json", manager: "npm" as const },
  ];

  for (const { file, manager } of lockFiles) {
    try {
      await access(join(root, file));
      return manager;
    } catch {
      // File doesn't exist, continue
    }
  }

  // Default to npm if no lock file found
  return "npm";
}

async function mergeEnvFiles(
  root: string,
  framework: DetectedProject["framework"]
): Promise<Record<string, string | undefined>> {
  const envFiles = [
    ".env",
    ".env.local",
    ".env.development",
    ".env.development.local",
  ];

  const merged: Record<string, string | undefined> = {};

  for (const file of envFiles) {
    const filePath = join(root, file);
    try {
      await access(filePath);
      const result = loadDotenv({ path: filePath });
      if (result.parsed) {
        Object.assign(merged, result.parsed);
      }
    } catch {
      // File doesn't exist or can't be read, skip
    }
  }

  // Filter based on framework conventions
  const filtered: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(merged)) {
    // Vite: VITE_*
    // Next: NEXT_PUBLIC_*
    // CRA: REACT_APP_*
    if (
      (framework === "vite" && key.startsWith("VITE_")) ||
      (framework === "next" && key.startsWith("NEXT_PUBLIC_")) ||
      (framework === "cra" && key.startsWith("REACT_APP_")) ||
      framework === "remix" || // Remix exposes all env vars server-side
      framework === "unknown"
    ) {
      filtered[key] = value;
    }
  }

  return filtered;
}
