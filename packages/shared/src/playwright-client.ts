import { MCPClient } from "./mcp-client.js";

/**
 * Playwright MCP client wrapper for browser automation
 * This communicates with the Docker MCP playwright server
 */
export class PlaywrightClient {
  private client: MCPClient;

  constructor(mcpClient: MCPClient) {
    this.client = mcpClient;
  }

  /**
   * Capture a screenshot of a URL
   */
  async screenshot(
    url: string,
    options?: {
      fullPage?: boolean;
      selector?: string;
    }
  ): Promise<{ image: string; path: string }> {
    const result = await this.client.callTool("playwright_screenshot", {
      url,
      ...options,
    });

    return {
      image: result.content[0]?.text || "",
      path: result.content[0]?.text || `screenshots/${Date.now()}.png`,
    };
  }

  /**
   * Get page snapshot (accessibility tree)
   */
  async snapshot(url: string): Promise<any> {
    // eslint-disable-line @typescript-eslint/no-explicit-any
    const result = await this.client.callTool("playwright_snapshot", {
      url,
    });

    return result.content[0]?.json || {};
  }

  /**
   * Capture a full page screenshot
   */
  async screenshotFullPage(
    url: string
  ): Promise<{ image: string; path: string }> {
    return this.screenshot(url, { fullPage: true });
  }

  /**
   * Capture screenshot of a specific element
   */
  async screenshotElement(
    url: string,
    selector: string
  ): Promise<{ image: string; path: string }> {
    return this.screenshot(url, { selector });
  }
}
