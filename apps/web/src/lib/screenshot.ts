/**
 * Screenshot utilities for the web app
 * This wraps Playwright MCP calls via an API route
 */

export interface ScreenshotOptions {
  url: string;
  fullPage?: boolean;
  selector?: string;
}

export interface ScreenshotResult {
  image: string; // base64 encoded image
  path: string; // file path
}

/**
 * Capture a screenshot using Playwright MCP
 * For now, this is a stub that will be implemented with an API route
 */
export async function captureScreenshot(
  _options: ScreenshotOptions
): Promise<ScreenshotResult> {
  // TODO: Implement API route that calls Playwright MCP
  // For now, return stub data
  return {
    image: "",
    path: `screenshots/${Date.now()}.png`,
  };
}

/**
 * Capture a full page screenshot
 */
export async function captureFullPageScreenshot(
  url: string
): Promise<ScreenshotResult> {
  return captureScreenshot({ url, fullPage: true });
}

/**
 * Capture screenshot of a specific element
 */
export async function captureElementScreenshot(
  url: string,
  selector: string
): Promise<ScreenshotResult> {
  return captureScreenshot({ url, selector });
}
