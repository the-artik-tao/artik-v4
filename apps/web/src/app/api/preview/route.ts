import { previewService } from "@/lib/preview-service";
import { NextRequest, NextResponse } from "next/server";

/**
 * Preview API Route
 * POST /api/preview
 *
 * Actions:
 * - start: Start preview with mocks for a project
 * - stop: Stop the current preview
 * - status: Get current preview status
 */
export async function POST(request: NextRequest) {
  try {
    const { action, projectPath } = await request.json();

    if (action === "start") {
      if (!projectPath) {
        return NextResponse.json(
          { error: "projectPath is required" },
          { status: 400 }
        );
      }

      console.log(`[API] Starting preview for: ${projectPath}`);
      const urls = await previewService.startPreview(projectPath);

      return NextResponse.json({
        success: true,
        appUrl: urls.url,
        mockUrl: urls.mockUrl,
      });
    }

    if (action === "stop") {
      console.log(`[API] Stopping preview`);
      await previewService.stopPreview();
      return NextResponse.json({ success: true });
    }

    if (action === "status") {
      const isRunning = previewService.isRunning();
      const urls = previewService.getUrls();
      return NextResponse.json({
        isRunning,
        urls,
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'start', 'stop', or 'status'" },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error("[API] Preview error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Preview failed",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
