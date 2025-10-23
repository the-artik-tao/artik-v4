import { runAll, type RunningServices } from "@the-artik-tao/mock-sandbox-core";

/**
 * Preview Service - manages the sandboxed preview with mock backend
 * Singleton service that starts/stops preview environments for React projects
 */
export class PreviewService {
  private currentServices?: RunningServices;

  /**
   * Start a preview environment with automatic API discovery and mock generation
   * @param projectPath - Absolute path to the React project
   * @returns URLs for the app and mock API server
   */
  async startPreview(projectPath: string): Promise<{ url: string; mockUrl: string }> {
    // Stop existing preview if any
    await this.stopPreview();

    console.log(`[PreviewService] Starting preview for: ${projectPath}`);

    // Start new preview with mocks
    this.currentServices = await runAll({
      cwd: projectPath,
      dmr: {
        model: "ai/smollm2",
        baseUrl: "http://localhost:12434",
      },
      ports: {
        app: 5173, // Vite dev server
        mock: 9000, // Mock API server
      },
      provider: "docker",
    });

    console.log(`[PreviewService] Preview started:`, {
      app: this.currentServices.appUrl,
      mock: this.currentServices.mockUrl,
    });

    return {
      url: this.currentServices.appUrl || "http://localhost:5173",
      mockUrl: this.currentServices.mockUrl || "http://localhost:9000",
    };
  }

  /**
   * Stop the current preview environment
   */
  async stopPreview(): Promise<void> {
    if (this.currentServices) {
      console.log(`[PreviewService] Stopping preview`);
      await this.currentServices.stop();
      this.currentServices = undefined;
    }
  }

  /**
   * Check if a preview is currently running
   */
  isRunning(): boolean {
    return !!this.currentServices;
  }

  /**
   * Get the URLs of the currently running preview
   */
  getUrls(): { url: string; mockUrl: string } | null {
    if (!this.currentServices) return null;
    return {
      url: this.currentServices.appUrl || "http://localhost:5173",
      mockUrl: this.currentServices.mockUrl || "http://localhost:9000",
    };
  }
}

// Singleton instance
export const previewService = new PreviewService();

