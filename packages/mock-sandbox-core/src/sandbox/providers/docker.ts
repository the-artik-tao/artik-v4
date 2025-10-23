import { spawn } from "child_process";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { ToolError } from "../../errors.js";
import type {
  DetectedProject,
  MockSpec,
  RunningServices,
  SandboxPlan,
  SandboxProvider,
} from "../../types.js";

export const dockerProvider: SandboxProvider = {
  name: "docker",

  async prepare(
    project: DetectedProject,
    _mockSpec: MockSpec,
    opts: { appPort: number; mockPort: number }
  ): Promise<SandboxPlan> {
    const workDir = join(project.root, ".sandbox");
    await mkdir(workDir, { recursive: true });

    const composePath = join(workDir, "docker-compose.sandbox.yml");
    const composeContent = generateDockerCompose(project, opts);

    await writeFile(composePath, composeContent, "utf-8");

    const plan: SandboxPlan = {
      appPort: opts.appPort,
      mockPort: opts.mockPort,
      workDir,
      composePath,
      notes: [
        "Docker Compose file generated",
        `App will run on port ${opts.appPort}`,
        `Mock server will run on port ${opts.mockPort}`,
      ],
    };

    return plan;
  },

  async up(plan: SandboxPlan): Promise<RunningServices> {
    if (!plan.composePath) {
      throw new ToolError("SANDBOX_FAIL", "No compose path in plan");
    }

    // Start docker compose
    return new Promise((resolve, reject) => {
      const process = spawn(
        "docker",
        ["compose", "-f", plan.composePath!, "up", "--build", "-d"],
        {
          cwd: plan.workDir,
          stdio: "inherit",
        }
      );

      process.on("error", (error) => {
        reject(
          new ToolError("SANDBOX_FAIL", "Failed to start Docker Compose", error)
        );
      });

      process.on("exit", (code) => {
        if (code === 0) {
          const services: RunningServices = {
            provider: "docker",
            appUrl: `http://localhost:${plan.appPort}`,
            mockUrl: `http://localhost:${plan.mockPort}`,
            stop: async () => {
              await stopDockerCompose(plan.composePath!, plan.workDir);
            },
          };
          resolve(services);
        } else {
          reject(
            new ToolError(
              "SANDBOX_FAIL",
              `Docker Compose exited with code ${code}`
            )
          );
        }
      });
    });
  },
};

function generateDockerCompose(
  project: DetectedProject,
  opts: { appPort: number; mockPort: number }
): string {
  const devCommand = getDevCommand(project);
  const installCommand = getInstallCommand(project.packageManager);

  return `version: '3.8'

services:
  mock:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - ${project.root}/.sandbox/mock-server:/app
    ports:
      - "${opts.mockPort}:${opts.mockPort}"
    command: sh -c "npm install && npm start"
    environment:
      - NODE_ENV=development

  app:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - ${project.root}:/app
      - /app/node_modules
    ports:
      - "${opts.appPort}:${opts.appPort}"
    command: sh -c "${installCommand} && ${devCommand}"
    environment:
      - NODE_ENV=development
      - VITE_API_BASE_URL=http://mock:${opts.mockPort}
      - REACT_APP_API_BASE_URL=http://mock:${opts.mockPort}
      - NEXT_PUBLIC_API_BASE_URL=http://mock:${opts.mockPort}
    depends_on:
      - mock
`;
}

function getDevCommand(project: DetectedProject): string {
  // Look for dev script
  if (project.scripts.dev) {
    return project.packageManager === "npm"
      ? "npm run dev"
      : `${project.packageManager} run dev`;
  }

  if (project.scripts.start) {
    return project.packageManager === "npm"
      ? "npm start"
      : `${project.packageManager} start`;
  }

  // Framework-specific defaults
  if (project.framework === "vite") {
    return "npx vite";
  } else if (project.framework === "next") {
    return "npx next dev";
  } else if (project.framework === "cra") {
    return "npx react-scripts start";
  }

  return "npm run dev";
}

function getInstallCommand(packageManager: string): string {
  if (packageManager === "npm") {
    return "npm install";
  } else if (packageManager === "pnpm") {
    return "pnpm install";
  } else if (packageManager === "yarn") {
    return "yarn install";
  } else if (packageManager === "bun") {
    return "bun install";
  }
  return "npm install";
}

async function stopDockerCompose(
  composePath: string,
  workDir: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn("docker", ["compose", "-f", composePath, "down"], {
      cwd: workDir,
      stdio: "inherit",
    });

    process.on("error", reject);
    process.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Docker Compose down exited with code ${code}`));
      }
    });
  });
}
