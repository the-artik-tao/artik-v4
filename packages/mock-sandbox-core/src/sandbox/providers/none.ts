import { mkdir } from "fs/promises";
import { join } from "path";
import type {
  DetectedProject,
  MockSpec,
  RunningServices,
  SandboxPlan,
  SandboxProvider,
} from "../../types.js";

export const noneProvider: SandboxProvider = {
  name: "none",

  async prepare(
    project: DetectedProject,
    _mockSpec: MockSpec,
    opts: { appPort: number; mockPort: number }
  ): Promise<SandboxPlan> {
    const workDir = join(project.root, ".sandbox");
    await mkdir(workDir, { recursive: true });

    const plan: SandboxPlan = {
      appPort: opts.appPort,
      mockPort: opts.mockPort,
      workDir,
      notes: [
        "No sandbox provider configured (provider=none)",
        "Files generated but services will not be started",
        `Mock server available in ${workDir}/mock-server`,
        "You can start services manually",
      ],
    };

    return plan;
  },

  async up(_plan: SandboxPlan): Promise<RunningServices> {
    return {
      provider: "none",
      stop: async () => {
        // No-op
      },
    };
  },
};
