import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import { join } from "path";

export interface PreviewerInput {
  url: string;
  route?: string;
  usePlaywright?: boolean;
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

  // Capture real screenshot with Playwright
  if (input.usePlaywright !== false) {
    try {
      const screenshotDir = join(process.cwd(), ".playwright-mcp");
      await mkdir(screenshotDir, { recursive: true });

      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
      });
      const page = await context.newPage();
      
      await page.goto(fullUrl, { waitUntil: "networkidle", timeout: 10000 });
      
      const timestamp = Date.now();
      const screenshotPath = join(screenshotDir, `screenshot-${timestamp}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      
      await browser.close();

      return {
        screenshotPath,
        timestamp,
        fullPage: false,
      };
    } catch (error) {
      console.error("Failed to capture screenshot:", error);
      // Fall through to stub
    }
  }

  // Fallback stub when Playwright is unavailable
  return {
    screenshotPath: `screenshots/${Date.now()}.png`,
    timestamp: Date.now(),
  };
}
