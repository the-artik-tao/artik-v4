import { PlaywrightClient } from "@artik/shared";

export interface PreviewerInput {
  url: string;
  route?: string;
  playwrightClient?: PlaywrightClient;
}

export interface PreviewerOutput {
  screenshotPath: string;
  timestamp: number;
  fullPage?: boolean;
}

export async function previewerNode(
  input: PreviewerInput
): Promise<PreviewerOutput> {
  const fullUrl = input.route ? `${input.url}${input.route}` : input.url;

  // If Playwright client is available, capture real screenshot
  if (input.playwrightClient) {
    try {
      const result = await input.playwrightClient.screenshotFullPage(fullUrl);
      return {
        screenshotPath: result.path || `screenshots/${Date.now()}.png`,
        timestamp: Date.now(),
        fullPage: true,
      };
    } catch (error) {
      console.error("Failed to capture screenshot:", error);
      // Fall back to stub
    }
  }

  // Fallback stub for M0 or when Playwright is unavailable
  return {
    screenshotPath: `screenshots/${Date.now()}.png`,
    timestamp: Date.now(),
  };
}
