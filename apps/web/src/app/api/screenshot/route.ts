import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json(
        { error: "Missing path parameter" },
        { status: 400 }
      );
    }

    // Security: only allow reading from .playwright-mcp directory
    if (!path.includes(".playwright-mcp")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 403 });
    }

    if (!existsSync(path)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const imageBuffer = await readFile(path);

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Screenshot API error:", error);
    return NextResponse.json(
      { error: "Failed to load screenshot" },
      { status: 500 }
    );
  }
}
