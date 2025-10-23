import { AgentOrchestrator } from "@artik/agent";
import { createMCPClient, PlaywrightClient } from "@artik/shared";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

/**
 * API route for executing agent tasks
 * POST /api/agent
 * Body: { goal: string, repoPath: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { goal, repoPath, model } = await request.json();

    if (!goal || !repoPath) {
      return NextResponse.json(
        { error: "Missing required fields: goal, repoPath" },
        { status: 400 }
      );
    }

    // Initialize LLM configuration
    const llmConfig = {
      baseURL:
        process.env.OPENAI_BASE_URL || "http://localhost:12434/engines/v1",
      apiKey: process.env.OPENAI_API_KEY || "not-needed",
      model: model || process.env.OPENAI_MODEL || "ai/smollm2",
      temperature: 0.2,
    };

    // Initialize MCP clients (optional, can fall back to stubs)
    const tools: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any

    // Try to connect to MCP servers if available
    // Note: These are optional for M1 - agent will work without them
    // MCP servers are at the monorepo root, which is one level up from apps/web
    const monorepoRoot = path.resolve(process.cwd(), "..", "..");
    const gitServerPath = path.join(
      monorepoRoot,
      "mcp-servers/git/src/index.ts"
    );
    const tsAstServerPath = path.join(
      monorepoRoot,
      "mcp-servers/ts-ast/src/index.ts"
    );

    try {
      const gitClient = await createMCPClient("tsx", [gitServerPath]);
      tools.gitClient = gitClient;
    } catch (error) {
      console.warn("Git MCP not available:", error);
    }

    try {
      const tsAstClient = await createMCPClient("tsx", [tsAstServerPath]);
      tools.tsAstClient = tsAstClient;
    } catch (error) {
      console.warn("TS-AST MCP not available:", error);
    }

    // Try to connect to Playwright MCP
    let playwrightClient: PlaywrightClient | undefined;
    try {
      const playwrightMCP = await createMCPClient("docker", [
        "mcp",
        "playwright",
      ]);
      playwrightClient = new PlaywrightClient(playwrightMCP);
    } catch (error) {
      console.warn("Playwright MCP not available:", error);
    }

    // Create orchestrator and run task
    const orchestrator = new AgentOrchestrator({
      llm: llmConfig,
      tools,
      playwrightClient,
    });

    const result = await orchestrator.runTask(goal, repoPath);

    return NextResponse.json({
      success: true,
      result: {
        plan: result.plan,
        steps: result.steps,
        modifications: result.modifications,
        filesChanged: result.filesChanged,
        codeDiff: result.codeDiff,
        screenshotPath: result.screenshotPath,
        beforeScreenshot: result.beforeScreenshot,
        afterScreenshot: result.afterScreenshot,
      },
    });
  } catch (error) {
    console.error("Agent execution error:", error);
    return NextResponse.json(
      {
        error: "Agent execution failed",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
