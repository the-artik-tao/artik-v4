import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import type {
  DetectedProject,
  DiscoveryResult,
  FrameworkProviderPlugin,
  SandboxPlan,
} from "../../types.js";

export const viteFrameworkProvider: FrameworkProviderPlugin = {
  name: "vite",

  async writeOverlay(
    _project: DetectedProject,
    plan: SandboxPlan,
    discovery: DiscoveryResult
  ): Promise<void> {
    const overlayDir = join(plan.workDir, "overlay");
    await mkdir(overlayDir, { recursive: true });

    // Generate vite.config.sandbox.ts with proxy configuration
    const proxyConfig = generateViteProxyConfig(
      discovery.baseUrls,
      plan.mockPort
    );
    const configPath = join(overlayDir, "vite.config.sandbox.ts");

    await writeFile(configPath, proxyConfig, "utf-8");

    plan.notes.push(
      `Vite proxy config written to ${configPath}`,
      `API calls will be routed to http://localhost:${plan.mockPort}`
    );
  },
};

function generateViteProxyConfig(baseUrls: string[], mockPort: number): string {
  // Generate proxy rules for each base URL
  const proxyRules = baseUrls
    .filter((url) => !url.startsWith("http")) // Only relative paths
    .map((url) => {
      const path = url || "/api";
      return `    '${path}': {
      target: 'http://localhost:${mockPort}',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\\/api/, ''),
    }`;
    })
    .join(",\n");

  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// This is a sandbox configuration for mock API development
// It proxies API calls to the mock server
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
${
  proxyRules ||
  `      '/api': {
        target: 'http://localhost:${mockPort}',
        changeOrigin: true,
      }`
}
    },
  },
});
`;
}
