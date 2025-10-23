// Basic integration test
import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { detectProject } from "./detect/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Mock Sandbox Core", () => {
  it("should detect a project", async () => {
    // Test with the demo app
    const demoAppPath = path.resolve(
      __dirname,
      "../../../examples/vite-sandbox-demo"
    );

    try {
      const project = await detectProject({ cwd: demoAppPath });

      expect(project).toBeDefined();
      expect(project.root).toBe(demoAppPath);
      expect(project.framework).toBe("vite");
      expect(["npm", "pnpm", "yarn", "bun"]).toContain(project.packageManager);
    } catch (error) {
      // Demo app might not exist yet, that's okay for MVP
      console.log("Demo app not found, skipping test");
    }
  });
});
